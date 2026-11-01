import { loadEnvFile } from 'node:process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanDreamText, createOpenAIClient, extractDream, transcribeAudio } from '../server/ai.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const audioTypes = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webm': 'audio/webm', '.mp4': 'audio/mp4', '.m4a': 'audio/mp4', '.mpeg': 'audio/mpeg', '.mpga': 'audio/mpeg' };

/** Exécute les mêmes fonctions IA que l'app ; onStep permet d'observer chaque résultat. */
export async function runDreamTest(input, { profile = '', outputDir, onStep = consoleStep, client } = {}) {
  try { loadEnvFile(resolve(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const extension = extname(input).toLowerCase();
  if (extension !== '.txt' && !audioTypes[extension]) throw new Error('Format non pris en charge : utilisez .txt, .mp3, .m4a, .mp4, .wav ou .webm.');
  const bytes = await readFile(resolve(input));
  if (!bytes.length) throw new Error('Le fichier est vide.');
  const api = client ?? createOpenAIClient();
  const destination = outputDir ?? resolve(root, 'test-results', `${new Date().toISOString().replace(/[:.]/g, '-')}-${basename(input, extension)}`);
  await mkdir(destination, { recursive: true });
  const save = async (name, value) => {
    await writeFile(resolve(destination, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2), 'utf8');
  };
  let text;
  if (extension === '.txt') {
    text = bytes.toString('utf8').replace(/^\uFEFF/, '');
    await save('00-source.txt', text);
  } else {
    text = await transcribeAudio(new File([bytes], basename(input), { type: audioTypes[extension] }), api);
    await save('01-transcription.txt', text);
    await onStep('Transcription', text);
  }
  const cleanedText = await cleanDreamText(text, api);
  await save('02-nettoyage.txt', cleanedText);
  await onStep('Nettoyage', cleanedText);
  const analysis = await extractDream(cleanedText, profile, api);
  await save('03-analyse.json', analysis);
  await onStep('Analyse', analysis);
  return { transcript: extension === '.txt' ? null : text, cleanedText, analysis, outputDir: destination };
}

function consoleStep(name, value) {
  console.log(`\n── ${name} ──\n`);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, profileFile] = process.argv.slice(2);
  if (!input || input === '--help') {
    console.log('Usage : npm run ai:test -- example/dream1.txt [chemin/profil.txt]\nCompatible .txt et audio (.mp3, .m4a, .mp4, .wav, .webm).\nRésultats affichés et enregistrés dans test-results/ (ignoré par Git).');
    if (!input) process.exitCode = 1;
  } else {
    try {
      const profile = profileFile ? await readFile(resolve(profileFile), 'utf8') : '';
      const result = await runDreamTest(input, { profile });
      console.log(`\nRésultats : ${result.outputDir}`);
    } catch (error) {
      console.error(`Échec du test : ${error.message}`);
      process.exitCode = 1;
    }
  }
}
