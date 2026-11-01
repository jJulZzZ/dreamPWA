import { createServer } from 'vite';
import { expect, it } from 'vitest';
import { localAiPlugin } from './ai-plugin';

it('sert les vrais endpoints locaux comme JSON, y compris les erreurs, sans appel OpenAI', async () => {
  const server = await createServer({ configFile: false, plugins: [localAiPlugin()], server: { host: '127.0.0.1', port: 0 } });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw new Error('Port serveur manquant.');
    const base = `http://127.0.0.1:${address.port}`;
    for (const route of ['clean', 'extract']) {
      const response = await fetch(`${base}/api/ai/${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '' }) });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Texte manquant.' });
    }
    const audio = await fetch(`${base}/api/ai/transcribe`, { method: 'POST', body: new FormData() });
    expect(audio.status).toBe(400);
    expect((await audio.json()).error).toBe('Enregistrement audio manquant.');
    expect((await fetch(`${base}/api/ai/clean`)).status).toBe(405);
    expect((await fetch(`${base}/api/ai/unknown`)).status).toBe(404);
  } finally { await server.close(); }
}, 15000);
