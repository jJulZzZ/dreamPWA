import { assertPost, failure, json, openai } from './_client';

export default { async fetch(request: Request) {
  const rejected = assertPost(request);
  if (rejected) return rejected;
  try {
    const { text } = await request.json();
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'Texte manquant.' }, 400);
    const response = await openai().responses.create({
      model: 'openai/gpt-6-luna',
      reasoning: { effort: 'minimal' },
      input: `Tu es un réviseur de transcription de rêves. Réponds uniquement avec le texte nettoyé, en français. Conserve absolument toutes les informations, l'ordre des événements, les incertitudes et le style personnel. Ne complète rien, n'interprète rien, ne résume rien. Retire seulement les hésitations et répétitions orales inutiles, ajoute ponctuation et paragraphes pour la lisibilité, et développe les abréviations évidentes à l'oral (ex. « nptk » devient « n'importe quoi »).\n\nTRANSCRIPTION :\n${text.trim()}`
    });
    const cleanedText = response.output_text.trim();
    if (!cleanedText) throw new Error('Le nettoyage IA n’a renvoyé aucun texte.');
    return json({ cleanedText });
  } catch (error) { return failure(error); }
} };
