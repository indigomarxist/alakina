# alakina-portfolio

Portfolio site for Alakina Lee (actor, model, singer). Astro 7, static output, deployed on Cloudflare Pages.

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

Set `PUBLIC_FORMSPREE_ID` (see `.env.example`, or the Cloudflare Pages environment variables) to show the booking form. Without it the section shows an email button.

## Deploy (Cloudflare Pages)

Connect the GitHub repo in Cloudflare Pages with framework preset **Astro**, build command `npm run build`, output directory `dist`, and `NODE_VERSION=22`. Update `site` in `astro.config.mjs` when the domain is set.
