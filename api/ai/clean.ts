import { assertPost, failure, json } from './_client';
import { cleanDreamText } from '../../server/ai.ts';

export default { async fetch(request: Request) {
  const rejected = assertPost(request);
  if (rejected) return rejected;
  try {
    const { text } = await request.json();
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'Texte manquant.' }, 400);
    const cleanedText = await cleanDreamText(text);
    return json({ cleanedText });
  } catch (error) { return failure(error); }
} };
