import { expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { extractDream } from './ai';

it('sends existing labels as context without requiring the model to add them', async () => {
  const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({ title: 'Un rêve', characters: [], places: [], themes: [], keywords: [], feelings: [], detailLevel: 3, schemaVersion: 1 }) });
  const client = { responses: { create } } as unknown as OpenAI;
  const labels = { characters: ['Maman'], places: [], themes: [], keywords: [], feelings: [] };
  const result = await extractDream('Un rêve', '', client, labels);
  expect(create.mock.calls[0][0].input).toContain(JSON.stringify(labels));
  expect(create.mock.calls[0][0].instructions).toContain('pas des éléments à ajouter au rêve');
  expect(result.characters).toEqual([]);
});
