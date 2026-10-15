import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const gallery = defineCollection({
  loader: file('src/content/gallery.json'),
  schema: ({ image }) =>
    z.object({
      image: image(),
      alt: z.string(),
      order: z.number(),
      category: z.enum(['digitals', 'performance', 'photoshoots', 'runway']),
    }),
});

const credits = defineCollection({
  loader: file('src/content/credits.json'),
  schema: z.object({
    section: z.enum(['stage-film', 'modeling']),
    title: z.string(),
    role: z.string(),
    company: z.string(),
    order: z.number(),
  }),
});

// Short clips are self-hosted in public/video; longer ones (reel, songs) embed from YouTube.
const videos = defineCollection({
  loader: file('src/content/videos.json'),
  schema: ({ image }) =>
    z.discriminatedUnion('kind', [
      z.object({
        kind: z.literal('file'),
        title: z.string(),
        caption: z.string().optional(),
        order: z.number(),
        src: z.string().startsWith('/video/'),
        poster: image(),
        orientation: z.enum(['portrait', 'landscape']).default('landscape'),
      }),
      z.object({
        kind: z.literal('youtube'),
        title: z.string(),
        caption: z.string().optional(),
        order: z.number(),
        youtubeId: z.string(),
      }),
    ]),
});

export const collections = { gallery, credits, videos };
