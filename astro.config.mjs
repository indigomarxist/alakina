// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://alakinalee.com',
  image: {
    responsiveStyles: true,
    // Instagram media is fetched at build time and optimized like local photos.
    remotePatterns: [
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
    ],
  },
});
