import { analysisJsonSchema, analysisSchema } from '../../src/lib/schema';
import { assertPost, failure, json, openai } from './_client';

export default { async fetch(request: Request) {
  const rejected = assertPost(request);
  if (rejected) return rejected;
  try {
    const { text, profile = '' } = await request.json();
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'Texte manquant.' }, 400);
    const response = await openai().responses.create({
      model: 'openai/gpt-6-luna',
      reasoning: { effort: 'low' },
      text: { format: { type: 'json_schema', name: 'analyse_reve', strict: true, schema: analysisJsonSchema } },
      input: `Tu analyses un journal de rêves en français. Extrait uniquement les informations explicitement présentes dans le rêve, sauf les équivalences explicites du profil personnel. Ne diagnostique pas, ne juge pas, n'invente pas. Les mots-clés doivent être au maximum cinq. Note detailLevel : 1=fragments vagues ; 2=bribe avec peu de contexte ; 3=récit cohérent avec quelques détails ; 4=récit riche ; 5=récit très descriptif avec personnages, lieux et actions détaillés. schemaVersion vaut toujours 1.\n\nPROFIL PERSONNEL :\n${profile || 'Aucun.'}\n\nRÊVE :\n${text.trim()}`
    });
    const analysis = analysisSchema.parse(JSON.parse(response.output_text));
    return json({ analysis });
  } catch (error) { return failure(error); }
} };
