# alakina-portfolio

Portfolio site for Alakina Lee (model, actress, singer). Astro 7, static output, deployed on Cloudflare Workers.

## Develop

```sh
npm install
npm run dev      # http://localhost:4321
npm run check    # astro check (types + content schemas)
npm run build    # static site in dist/
```

## Content

| What | Where |
|---|---|
| Name, bio, stats, skills, training, contact | `src/data/profile.ts` |
| Gallery photos Alakina adds herself | Google Drive folder with subfolders Digitals, Stage, Editorial, Commercial, Runway (see below) |
| Gallery photos kept in the repo (order, alt text, category: digitals, stage, editorial, commercial, runway) | `src/content/gallery.json` + `src/assets/photos/` |
| Videos (self-hosted clips or YouTube IDs) | `src/content/videos.json` + `public/video/` (posters in `src/assets/video/`) |
| Stage, film and modeling credits | `src/content/credits.json` |
| Comp card and resume PDFs | `public/files/` |

To add a photo, drop it in `src/assets/photos/` (any size; Astro generates AVIF/WebP at build time) and add an entry to `gallery.json`. Short clips go in `public/video/` as H.264 MP4 (keep each under ~20 MB; Workers caps static files at 25 MiB); longer pieces like a reel are better as an unlisted YouTube video with `"kind": "youtube"`. Schemas live in `src/content.config.ts`, so a typo fails the build instead of shipping.

Her phone number is intentionally not on the site.

## Photos from Google Drive

Alakina adds photos by dropping them into a shared Google Drive folder, one subfolder per category: **Digitals, Stage, Editorial, Commercial, Runway** (folder names are case-insensitive; other folders are ignored). Before each build, `scripts/sync-drive.mjs` lists the folder with a Google service account, downloads the images, fixes phone rotation, downscales to 2400 px and writes them plus a `manifest.json` to `src/assets/photos/drive/` (gitignored). The gallery shows those first, newest first, then the repo photos. Alt text is the file's Drive *Description* if she sets one, otherwise the filename (camera names like `IMG_1234` become "Alakina Lee, stage photo"). Deleting or moving a photo in Drive removes or moves it on the site. iPhone HEIC files fall back to Drive's rendered JPEG.

- Env: `GOOGLE_SERVICE_ACCOUNT_KEY` (the whole JSON key) and `DRIVE_FOLDER_ID`. Without them the sync is skipped and the site builds from the repo photos only. With them, a Drive error fails the build instead of deploying without her photos.
- They must be set in **both** GitHub Actions secrets and the Cloudflare build variables, because pushes to `main` build on Cloudflare.
- `.github/workflows/drive-sync.yml` fingerprints the folder every 15 minutes and rebuilds and deploys only when it changed.
- `npm run sync:photos` pulls them locally (with the env vars in `.env` exported).

## Contact form

Set `PUBLIC_FORMSPREE_ID` (see `.env.example`, or the Worker build variables in Cloudflare) to show the booking form. Without it the section shows an email button.

## Social feeds

- **Instagram:** `src/lib/instagram.ts` pulls her latest 9 posts at build time through the Instagram API with Instagram Login, and Astro optimizes the images like local photos. The grid only renders when `INSTAGRAM_ACCESS_TOKEN` is set, and any API error just hides it, so a bad token never breaks a deploy.
- **TikTok:** the official creator-profile embed, shown by default; its script loads when the section nears the viewport so it does not slow the first paint.
- **Daily rebuild:** `.github/workflows/daily-rebuild.yml` runs every morning, refreshes the 60-day Instagram token, rebuilds and deploys with `wrangler`. Needs repo secrets `INSTAGRAM_ACCESS_TOKEN`, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Pushes to `main` still deploy through Cloudflare's Git integration, so `INSTAGRAM_ACCESS_TOKEN` must also be a build variable there.

## Deploy (Cloudflare Workers)

Deployed as a Cloudflare Worker with static assets (`wrangler.jsonc`), live at https://alakinalee.com (also https://alakina.jahexhibit.workers.dev). On every push to `main`, Cloudflare builds with `npm run build` and deploys with `npx wrangler deploy` (`NODE_VERSION=22`).
