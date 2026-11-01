import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

/** Serve the same Web handlers as Vercel, only during `vite dev`. */
export function localAiPlugin(): Plugin {
  return {
    name: 'reveil-local-ai',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, 'OPENAI_API_KEY');
      if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
      const routes: Record<string, string> = {
        '/api/ai/clean': '/api/ai/clean.ts',
        '/api/ai/extract': '/api/ai/extract.ts',
        '/api/ai/transcribe': '/api/ai/transcribe.ts'
      };
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (!path.startsWith('/api/ai/')) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!routes[path]) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Route IA inconnue.' })); return; }
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            const buffer = Buffer.from(chunk);
            size += buffer.length;
            if (size > 25 * 1024 * 1024) {
              res.statusCode = 413; res.end(JSON.stringify({ error: 'Requête trop volumineuse.' })); return;
            }
            chunks.push(buffer);
          }
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          }
          const method = req.method ?? 'GET';
          const request = new Request(`http://localhost${req.url}`, {
            method, headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks)
          });
          const handler = await server.ssrLoadModule(routes[path]);
          const response: Response = await handler.default.fetch(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Le serveur IA local a rencontré une erreur. Vérifiez le terminal.' }));
        }
      });
    }
  };
}
