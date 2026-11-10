import { z } from 'zod';
import { extractDream } from '../../server/ai.ts';
import { assertPost, failure, json } from './_client';

export default { async fetch(request: Request) {
  const rejected = assertPost(request);
  if (rejected) return rejected;
  try {
    const { text, profile = '', labels } = await request.json();
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'Texte manquant.' }, 400);
    if (typeof profile !== 'string') return json({ error: 'Profil invalide.' }, 400);
    const labelSchema = z.object({ characters: z.array(z.string()), places: z.array(z.string()), themes: z.array(z.string()), keywords: z.array(z.string()), feelings: z.array(z.string()) }).strict();
    const parsedLabels = labelSchema.optional().safeParse(labels);
    if (!parsedLabels.success) return json({ error: 'Libellés invalides.' }, 400);
    const analysis = await extractDream(text, profile, undefined, parsedLabels.data);
    return json({ analysis });
  } catch (error) { return failure(error); }
} };
