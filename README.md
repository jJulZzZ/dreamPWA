# Rêveil

PWA Vite/Svelte en français. Les données restent dans IndexedDB ; les appels OpenAI passent par les fonctions serveur Vercel.

## Configuration OpenAI

Node.js 24 est recommandé (le banc d’essai utilise le support TypeScript natif de Node).

1. Dans `.env` à la racine, renseigner `OPENAI_API_KEY=...`. Ce fichier est ignoré par Git. `.env.example` est le modèle partageable.
2. Dans Vercel → projet → Settings → Environment Variables, créer `OPENAI_API_KEY` avec la même clé OpenAI, puis redéployer.
3. L’ancienne variable `AI_GATEWAY_API_KEY` n’est plus utilisée. Le SDK appelle directement l’API OpenAI. La clé reste côté serveur et ne doit jamais avoir de préfixe `VITE_`.

## Tester les prompts localement

```sh
npm install
npm run ai:test -- example/dream1.txt
npm run ai:test -- example/dream2.txt
npm run ai:test -- example/dream3.txt
# Lorsque le fichier audio sera ajouté :
npm run ai:test -- example/dream.mp3
# Profil personnel facultatif, au format texte UTF-8 :
npm run ai:test -- example/dream1.txt example/profil.txt
```

Texte : nettoyage → analyse. Audio : transcription → nettoyage → analyse. Chaque étape s’affiche dès qu’elle termine et est sauvegardée dans un nouveau dossier daté sous `test-results/` (ignoré par Git). Les étapes déjà réussies restent sur disque si l’étape suivante échoue. Chaque exécution effectue de vrais appels facturés sur le compte OpenAI de la clé configurée.

Les prompts se modifient dans `server/ai.ts` : `cleaningInstructions` et `extractionInstructions`. Ce sont exactement les mêmes fonctions que celles des endpoints de l’app. Le schéma de sortie est dans `src/lib/schema.ts`. Les modèles sont `gpt-6-luna` pour le texte et `gpt-4o-transcribe` pour l’audio ; raisonnement `low` pour les deux étapes texte (GPT-6 Luna ne prend pas en charge `minimal`).

La fonction peut aussi être importée dans un script Node local :

```js
import { runDreamTest } from './scripts/test-dream.mjs';
const result = await runDreamTest('example/dream1.txt', {
  profile: '« Les gars » désigne Lucien, Paul et Jean.',
  onStep: (etape, sortie) => console.log(etape, sortie)
});
```

## Tester l’interface

`npm run dev` lance l’interface et les trois routes IA locales, en utilisant les mêmes fonctions que le déploiement Vercel. La variable `OPENAI_API_KEY` de `.env` est chargée exclusivement côté serveur ; redémarrer Vite après modification de `.env`. Aucune commande Vercel n’est nécessaire pour ces tests. Le banc d’essai `ai:test` fonctionne aussi indépendamment de Vercel.

`npm test` utilise des réponses simulées et ne consomme aucun crédit. `npm run build` génère le site et son service worker dans `dist/`.

## Capture

« Écrire » affiche le champ de texte ; « Parler » affiche les commandes du microphone. Changer de mode conserve le brouillon de chaque mode ; seul le mode sélectionné est sauvegardé. Il faut arrêter l’enregistrement avant de changer de mode ou de sauvegarder.

## Journal et confidentialité

Les rêves à traiter (y compris en attente de validation ou avec analyse obsolète) sont rouges, quelle que soit leur catégorie. Après validation, ils reprennent la couleur de leur catégorie. L’analyse propose un titre court modifiable ; les anciens rêves sans titre conservent un extrait comme libellé jusqu’à leur prochaine analyse.

Dans le calendrier, chaque rêve a sa propre case de couleur. Cliquer sur le jour ou l’une de ses cases affiche la liste des rêves du jour ; seul un clic sur un élément de cette liste ouvre le rêve.

Le premier marquage « Rêve privé » demande la création et la confirmation d’un PIN de six chiffres. Pour changer le PIN dans les réglages, il faut saisir le PIN actuel, même si la session est déjà déverrouillée. « PIN oublié ? Réinitialiser » demande une confirmation avant de supprimer définitivement les rêves privés, y compris ceux dans la corbeille et leurs audios, puis de retirer le PIN. Les rêves publics et le profil sont conservés. Un nouveau PIN sera demandé lors du prochain marquage privé. Cette protection reste un masquage local d’interface, sans chiffrement du stockage.
