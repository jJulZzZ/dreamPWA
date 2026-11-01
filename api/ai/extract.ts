import { extractDream } from '../../server/ai.ts';
import { assertPost, failure, json } from './_client';

export default { async fetch(request: Request) {
  const rejected = assertPost(request);
  if (rejected) return rejected;
  try {
    const { text, profile = '' } = await request.json();
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'Texte manquant.' }, 400);
    if (typeof profile !== 'string') return json({ error: 'Profil invalide.' }, 400);
    const analysis = await extractDream(text, profile);
    return json({ analysis });
  } catch (error) { return failure(error); }
} };
