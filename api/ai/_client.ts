import OpenAI from 'openai';

export function assertPost(request: Request) {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Méthode non autorisée.' }), { status: 405, headers: { 'content-type': 'application/json' } });
}

export function openai() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY est absente de la configuration Vercel.');
  return new OpenAI({ apiKey, baseURL: 'https://ai-gateway.vercel.sh/v1' });
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function failure(error: unknown) {
  console.error(error);
  return json({ error: error instanceof Error ? error.message : 'Erreur IA inconnue.' }, 500);
}
