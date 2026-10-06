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
| Gallery photos (order, alt text, category) | `src/content/gallery.json` + `src/assets/photos/` |
| Stage, film and modeling credits | `src/content/credits.json` |
| Comp card and resume PDFs | `public/files/` |

To add a photo, drop it in `src/assets/photos/` (any size; Astro generates AVIF/WebP at build time) and add an entry to `gallery.json`. Schemas live in `src/content.config.ts`, so a typo fails the build instead of shipping.

Her phone number is intentionally not on the site.

## Contact form

Set `PUBLIC_FORMSPREE_ID` (see `.env.example`, or the Worker build variables in Cloudflare) to show the booking form. Without it the section shows an email button.

## Social feeds

- **Instagram:** `src/lib/instagram.ts` pulls her latest 9 posts at build time through the Instagram API with Instagram Login, and Astro optimizes the images like local photos. The grid only renders when `INSTAGRAM_ACCESS_TOKEN` is set, and any API error just hides it, so a bad token never breaks a deploy.
- **TikTok:** the official creator-profile embed, shown by default; its script loads when the section nears the viewport so it does not slow the first paint.
- **Daily rebuild:** `.github/workflows/daily-rebuild.yml` runs every morning, refreshes the 60-day Instagram token, rebuilds and deploys with `wrangler`. Needs repo secrets `INSTAGRAM_ACCESS_TOKEN`, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Pushes to `main` still deploy through Cloudflare's Git integration, so `INSTAGRAM_ACCESS_TOKEN` must also be a build variable there.

## Deploy (Cloudflare Workers)

Deployed as a Cloudflare Worker with static assets (`wrangler.jsonc`), live at https://alakinalee.com (also https://alakina.jahexhibit.workers.dev). On every push to `main`, Cloudflare builds with `npm run build` and deploys with `npx wrangler deploy` (`NODE_VERSION=22`).
