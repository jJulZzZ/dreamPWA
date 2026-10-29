import { analysisSchema } from './schema';
import type { DreamAnalysis } from './types';

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Le service IA est indisponible.');
  return body as T;
}

export async function transcribe(audio: Blob) {
  const form = new FormData();
  form.append('audio', audio, `reveil.${audio.type.includes('mp4') ? 'mp4' : 'webm'}`);
  const response = await request<{ transcript: string }>('/api/ai/transcribe', { method: 'POST', body: form });
  return response.transcript;
}

export async function cleanText(text: string) {
  const response = await request<{ cleanedText: string }>('/api/ai/clean', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text })
  });
  return response.cleanedText;
}

export async function extract(text: string, profile: string): Promise<DreamAnalysis> {
  const response = await request<{ analysis: unknown }>('/api/ai/extract', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, profile })
  });
  return analysisSchema.parse(response.analysis);
}
