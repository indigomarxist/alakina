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
      category: z.enum(['digitals', 'editorial', 'headshots', 'stage', 'film']),
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

export const collections = { gallery, credits };
