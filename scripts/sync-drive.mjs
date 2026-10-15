// Pulls Alakina's photos from a shared Google Drive folder into src/assets/photos/drive/
// before the build. The Drive folder has one subfolder per gallery category
// (Digitals, Performance, Photoshoots, Runway); whatever is in them is what the
// site shows. Photos are downscaled here so Astro's AVIF encoding stays quick.
// A Google Doc in the top folder with "video" or "link" in its name lists YouTube
// links, one per line (optionally "Title - link"); those become embeds in the
// video section.
//
// Needs GOOGLE_SERVICE_ACCOUNT_KEY (the service account's JSON key) and
// DRIVE_FOLDER_ID. Without them it does nothing, so local builds keep working.
// With them, any Drive error fails the build rather than deploying a site with
// her photos missing.
//
//   node scripts/sync-drive.mjs                 download into src/assets/photos/drive/
//   node scripts/sync-drive.mjs --fingerprint   print a hash of the folder's contents, download nothing
import { createHash, createSign } from 'node:crypto';
import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = 'src/assets/photos/drive';
const CATEGORIES = ['digitals', 'performance', 'photoshoots', 'runway'];
const MAX_EDGE = 2400;
const API = 'https://www.googleapis.com/drive/v3';

const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const folderId = process.env.DRIVE_FOLDER_ID;
const fingerprintOnly = process.argv.includes('--fingerprint');

if (!keyJson || !folderId) {
  console.log('[drive] GOOGLE_SERVICE_ACCOUNT_KEY or DRIVE_FOLDER_ID not set; skipping Drive photos.');
  process.exit(0);
}

const token = await getAccessToken(JSON.parse(keyJson));
const photos = await listPhotos();
const linkDocs = await listChildren(folderId, "mimeType = 'application/vnd.google-apps.document'").then((docs) =>
  docs.filter((d) => /video|youtube|link/i.test(d.name)),
);

if (fingerprintOnly) {
  const hash = createHash('sha256');
  for (const p of photos) hash.update(`${p.id}|${p.modifiedTime}|${p.category}|${p.description ?? ''}\n`);
  for (const d of linkDocs) hash.update(`doc|${d.id}|${d.modifiedTime}\n`);
  const fp = hash.digest('hex').slice(0, 16);
  console.log(`[drive] ${photos.length} photos, fingerprint ${fp}`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `fingerprint=${fp}\n`);
  process.exit(0);
}

await sync(photos);
await syncVideoLinks(linkDocs);

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`[drive] token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function api(pathname, params = {}) {
  const url = new URL(API + pathname);
  for (const [k, v] of Object.entries({ supportsAllDrives: 'true', ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`[drive] ${pathname} failed: ${res.status} ${await res.text()}`);
  return res;
}

async function listChildren(parent, extraQuery) {
  const files = [];
  let pageToken;
  do {
    const res = await api('/files', {
      q: `'${parent}' in parents and trashed = false and ${extraQuery}`,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, description, thumbnailLink, md5Checksum)',
      includeItemsFromAllDrives: 'true',
      pageSize: '1000',
      ...(pageToken && { pageToken }),
    });
    const body = await res.json();
    files.push(...body.files);
    pageToken = body.nextPageToken;
  } while (pageToken);
  return files;
}

// "Digitals", "digital", " Runway " all map to a category; anything else is ignored.
function categoryFor(folderName) {
  const n = folderName.trim().toLowerCase();
  return CATEGORIES.find((c) => c === n || c === `${n}s`);
}

async function listPhotos() {
  const folders = await listChildren(folderId, "mimeType = 'application/vnd.google-apps.folder'");
  const photos = [];
  for (const folder of folders) {
    const category = categoryFor(folder.name);
    if (!category) {
      console.warn(`[drive] ignoring folder "${folder.name}" (not one of: ${CATEGORIES.join(', ')})`);
      continue;
    }
    const images = await listChildren(folder.id, "mimeType contains 'image/'");
    photos.push(...images.map((f) => ({ ...f, category })));
  }
  // Newest uploads first. The same file uploaded twice (same bytes) shows once.
  photos.sort((a, b) => b.createdTime.localeCompare(a.createdTime) || a.id.localeCompare(b.id));
  const seen = new Map();
  return photos.filter((p) => {
    if (!p.md5Checksum) return true;
    const first = seen.get(p.md5Checksum);
    if (first) {
      console.warn(`[drive] skipping "${p.category}/${p.name}": same file as "${first.category}/${first.name}"`);
      return false;
    }
    seen.set(p.md5Checksum, p);
    return true;
  });
}

// Her Drive "Description" field wins; otherwise the filename, unless it's a camera
// name like IMG_1234.JPG or _56A5518.jpeg.
function altFor(photo) {
  if (photo.description?.trim()) return photo.description.trim();
  const words = path
    .parse(photo.name)
    .name.replace(/[\d_\-.()]+/g, ' ')
    .replace(/\b(img|dsc|dscf|pxl|photo|image|copy)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const label = words.length >= 3 ? words.toLowerCase() : `${photo.category.replace(/s$/, '')} photo`;
  return `Alakina Lee, ${label}`;
}

async function download(photo) {
  const original = Buffer.from(await (await api(`/files/${photo.id}`, { alt: 'media' })).arrayBuffer());
  try {
    return await toJpeg(original);
  } catch (err) {
    // sharp's prebuilt binaries can't decode HEIC (iPhone photos). Drive renders a
    // JPEG thumbnail for those, which can be requested at full size.
    if (!photo.thumbnailLink) throw err;
    console.warn(`[drive] ${photo.name}: ${err.message}; using Drive's rendered JPEG instead`);
    const url = photo.thumbnailLink.replace(/=s\d+$/, `=s${MAX_EDGE}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`[drive] ${photo.name}: rendered JPEG failed: ${res.status}`);
    return toJpeg(Buffer.from(await res.arrayBuffer()));
  }
}

async function toJpeg(buf) {
  const { default: sharp } = await import('sharp');
  return sharp(buf)
    .rotate() // apply EXIF orientation from phones
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

async function sync(photos) {
  const manifestPath = path.join(OUT, 'manifest.json');
  const previous = new Map(
    JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '[]')).map((e) => [e.id, e]),
  );
  await mkdir(OUT, { recursive: true });

  const manifest = [];
  let fetched = 0;
  for (const photo of photos) {
    const file = `${photo.category}/${photo.id}.jpg`;
    const prev = previous.get(photo.id);
    if (!(prev && prev.file === file && prev.modifiedTime === photo.modifiedTime)) {
      await mkdir(path.join(OUT, photo.category), { recursive: true });
      await writeFile(path.join(OUT, file), await download(photo));
      fetched++;
      if (prev && prev.file !== file) await rm(path.join(OUT, prev.file), { force: true });
    }
    previous.delete(photo.id);
    manifest.push({ id: photo.id, file, category: photo.category, alt: altFor(photo), modifiedTime: photo.modifiedTime });
  }
  // Photos removed (or moved) in Drive come off the site too.
  for (const gone of previous.values()) await rm(path.join(OUT, gone.file), { force: true });

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[drive] ${manifest.length} photos (${fetched} downloaded, ${previous.size} removed)`);
}

async function youtubeTitle(id) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`);
    if (res.ok) return (await res.json()).title;
  } catch {}
  return undefined;
}

// Each line with a YouTube link becomes a video; text before the link is its title,
// otherwise the title is fetched from YouTube. Lines without a link are ignored.
async function syncVideoLinks(docs) {
  const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/;
  const videos = [];
  const seen = new Set();
  for (const doc of docs) {
    const text = await (await api(`/files/${doc.id}/export`, { mimeType: 'text/plain' })).text();
    for (const line of text.split(/\r?\n/)) {
      const id = line.match(YOUTUBE_ID)?.[1];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const label = line.slice(0, line.search(/https?:\/\/|(www\.)?youtu/)).replace(/[\s\-–—:|•*]+$/, '').replace(/^[\s\-–—•*\d.)]+/, '').trim();
      videos.push({ id, title: label || (await youtubeTitle(id)) || 'Video' });
    }
  }
  await writeFile(path.join(OUT, 'videos.json'), JSON.stringify(videos, null, 2) + '\n');
  console.log(`[drive] ${videos.length} YouTube videos from ${docs.length} link doc(s)`);
}
