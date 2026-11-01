import { z } from 'zod';

export const analysisSchema = z.object({
  title: z.string().trim().min(1).max(100),
  characters: z.array(z.string().trim().min(1)).default([]),
  places: z.array(z.string().trim().min(1)).default([]),
  themes: z.array(z.string().trim().min(1)).default([]),
  keywords: z.array(z.string().trim().min(1)).max(5).default([]),
  feelings: z.array(z.string().trim().min(1)).default([]),
  detailLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  schemaVersion: z.literal(1)
});

export const analysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'characters', 'places', 'themes', 'keywords', 'feelings', 'detailLevel', 'schemaVersion'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 100 },
    characters: { type: 'array', items: { type: 'string' } },
    places: { type: 'array', items: { type: 'string' } },
    themes: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', maxItems: 5, items: { type: 'string' } },
    feelings: { type: 'array', items: { type: 'string' } },
    detailLevel: { type: 'integer', minimum: 1, maximum: 5 },
    schemaVersion: { type: 'integer', enum: [1] }
  }
};
