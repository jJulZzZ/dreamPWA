export function assertPost(request: Request) {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Méthode non autorisée.' }), { status: 405, headers: { 'content-type': 'application/json' } });
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function failure(error: unknown) {
  console.error(error);
  return json({ error: error instanceof Error ? error.message : 'Erreur IA inconnue.' }, 500);
}
