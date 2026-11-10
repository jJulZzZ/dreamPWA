import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('loads every AI endpoint with Node ESM and rejects GET before calling OpenAI', () => {
  const script = `
    for (const route of ['clean', 'extract', 'transcribe']) {
      const handler = (await import('./api/ai/' + route + '.ts')).default;
      const response = await handler.fetch(new Request('https://example.test/api/ai/' + route));
      if (response.status !== 405) throw new Error(route + ': ' + response.status);
    }
  `;
  expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: process.cwd(), stdio: 'pipe' })).not.toThrow();
});
