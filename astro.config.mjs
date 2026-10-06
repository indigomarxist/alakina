// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Update once the custom domain is set up on Cloudflare Pages.
  site: 'https://alakinalee.com',
  image: {
    responsiveStyles: true,
  },
});
