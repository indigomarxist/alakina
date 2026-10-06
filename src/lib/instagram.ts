// Fetches recent Instagram posts at build time via the Instagram API with Instagram Login.
// Requires a long-lived token for her Professional account in INSTAGRAM_ACCESS_TOKEN.
// Any failure returns [] so a bad or expired token never breaks a deploy.

export interface InstagramPost {
  id: string;
  permalink: string;
  imageUrl: string;
  caption: string;
}

interface MediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
}

const API_BASE = process.env.INSTAGRAM_API_BASE ?? 'https://graph.instagram.com';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink';

let cached: Promise<InstagramPost[]> | undefined;

export function getInstagramPosts(limit = 9): Promise<InstagramPost[]> {
  cached ??= fetchPosts(limit);
  return cached;
}

async function fetchPosts(limit: number): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  try {
    const url = `${API_BASE}/me/media?fields=${FIELDS}&limit=${limit}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const { data } = (await res.json()) as { data: MediaItem[] };

    return data
      .map((m) => ({
        id: m.id,
        permalink: m.permalink,
        // Videos and reels expose a still frame as thumbnail_url.
        imageUrl: (m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url) ?? '',
        caption: m.caption?.split('\n')[0].slice(0, 120) ?? '',
      }))
      .filter((p) => p.imageUrl);
  } catch (err) {
    console.warn(`[instagram] Skipping feed: ${(err as Error).message}`);
    return [];
  }
}
