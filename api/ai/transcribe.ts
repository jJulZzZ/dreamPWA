import { assertPost, failure, json } from './_client';
import { transcribeAudio } from '../../server/ai.ts';

export const config = { maxDuration: 30 };

export default { async fetch(request: Request) {
  const rejected = assertPost(request);
  if (rejected) return rejected;
  try {
    const form = await request.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File) || audio.size === 0) return json({ error: 'Enregistrement audio manquant.' }, 400);
    if (audio.size > 24 * 1024 * 1024) return json({ error: 'Enregistrement trop volumineux (24 Mo maximum).' }, 413);
    return json({ transcript: await transcribeAudio(audio) });
  } catch (error) { return failure(error); }
} };
