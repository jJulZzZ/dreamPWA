import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDreamTest } from './test-dream.mjs';

const analysis = { title: 'Un rêve avec Lucien', characters: ['Lucien'], places: [], themes: [], keywords: [], feelings: [], detailLevel: 2, schemaVersion: 1 };
function fakeClient() {
  return {
    responses: { create: vi.fn().mockResolvedValueOnce({ output_text: 'Un rêve nettoyé.' }).mockResolvedValueOnce({ output_text: JSON.stringify(analysis) }) },
    audio: { transcriptions: { create: vi.fn().mockResolvedValue({ text: 'Euh un rêve.' }) } }
  };
}

describe('banc d’essai partagé avec les endpoints', () => {
  it.each(['txt', 'mp3'])('enchaîne les étapes et conserve les résultats pour %s', async (extension) => {
    const dir = await mkdtemp(join(tmpdir(), 'reveil-test-'));
    try {
      const input = join(dir, `dream.${extension}`);
      await writeFile(input, 'Un rêve brut.');
      const client = fakeClient();
      const onStep = vi.fn();
      const result = await runDreamTest(input, { client, onStep, profile: 'Lucien est un ami.', outputDir: join(dir, 'result') });
      expect(onStep.mock.calls.map(([stage]) => stage)).toEqual(extension === 'txt' ? ['Nettoyage', 'Analyse'] : ['Transcription', 'Nettoyage', 'Analyse']);
      expect(client.audio.transcriptions.create).toHaveBeenCalledTimes(extension === 'txt' ? 0 : 1);
      const [cleaning, extraction] = client.responses.create.mock.calls.map(([request]) => request);
      expect(cleaning.model).toBe('gpt-6-luna');
      expect(cleaning.reasoning.effort).toBe('low');
      expect(extraction.input).toContain('Un rêve nettoyé.');
      expect(extraction.input).toContain('Lucien est un ami.');
      expect(extraction.text.format.strict).toBe(true);
      expect(JSON.parse(await readFile(join(result.outputDir, '03-analyse.json'), 'utf8'))).toEqual(analysis);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('conserve le nettoyage si l’extraction échoue à la validation Zod', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'reveil-test-'));
    try {
      const input = join(dir, 'dream.txt');
      await writeFile(input, 'Un rêve.');
      const client = fakeClient();
      client.responses.create.mockReset().mockResolvedValueOnce({ output_text: 'Texte nettoyé.' }).mockResolvedValueOnce({ output_text: '{"detailLevel":9,"schemaVersion":1}' });
      const outputDir = join(dir, 'result');
      await expect(runDreamTest(input, { client, outputDir, onStep: () => {} })).rejects.toThrow();
      expect(await readFile(join(outputDir, '02-nettoyage.txt'), 'utf8')).toBe('Texte nettoyé.');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
