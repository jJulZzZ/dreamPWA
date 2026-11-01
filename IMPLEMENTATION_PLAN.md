# Rêveil — Plan d’implémentation

## Architecture livrée

- Vite, Svelte 5 et TypeScript pour le client mobile-first.
- `vite-plugin-pwa` pour le manifeste, le service worker et le shell hors ligne.
- Dexie/IndexedDB pour rêves, catégories, réglages et blobs audio temporaires.
- Zod et un JSON Schema partagé pour le contrat d’extraction versionné.
- Fonctions Vercel dans `api/ai/` pour transcription, nettoyage et extraction via l’API OpenAI directe ; fonctions et prompts partagés dans `server/ai.ts`.

## Étapes de développement

1. Définir les types, la base Dexie, les catégories système, les fonctions de normalisation et le calcul statistique local.
2. Construire la capture texte/vocale, la sauvegarde immédiate, MediaRecorder et la file de traitement explicite.
3. Ajouter les endpoints IA avec clé exclusivement serveur, contrôle de requête, limite d’audio et schéma structuré strict.
4. Construire l’éditeur et la validation des champs IA, y compris réanalyse après modification textuelle et purge audio après validation.
5. Ajouter calendrier, recherche insensible à la casse, statistiques par plage et vues masquées privées.
6. Ajouter PIN de masquage, profil personnel, catégories, corbeille, import manuel, export et restauration JSON.
7. Vérifier installation PWA, fonctionnement hors ligne, build de production et comportements mobiles.

## Contrôles recommandés avant déploiement

- Ajouter `OPENAI_API_KEY` dans `.env` local (ignoré par Git) et dans les variables serveur Vercel ; ne jamais utiliser de préfixe `VITE_`.
- Configurer le suivi d’usage et les alertes sur le projet OpenAI : le prototype n’a pas d’authentification utilisateur.
- Tester microphone et `MediaRecorder` sur Safari iOS et Chromium Android.
- Ajouter Vitest et Playwright au CI pour les cas de normalisation, stockage, import/export, PIN, file hors ligne, analyse simulée et parcours mobile.

## Migration OpenAI et banc d’essai local

- Retirer le point d’entrée AI Gateway et les préfixes `openai/` des identifiants de modèles ; utiliser le client OpenAI standard avec `OPENAI_API_KEY`.
- Centraliser prompts français, configuration des modèles et validation d’extraction pour les endpoints et le banc d’essai.
- Ajouter `scripts/test-dream.mjs`, compatible texte et audio, avec profil facultatif, sorties affichées et fichiers intermédiaires dans un dossier daté ignoré par Git.
- Tester les flux texte/audio avec un client simulé et la conservation des sorties intermédiaires en cas d’échec.
- Séparer explicitement les modes de saisie dans l’interface ; garder les brouillons lors du changement de mode et bloquer changement/sauvegarde pendant l’enregistrement.

## Améliorations du journal et de la confidentialité

- Servir les mêmes handlers Web `/api/ai/*` via un plugin Vite réservé au développement ; charger `.env` côté serveur pour que `npm run dev` suffise.
- Ajouter un titre court obligatoire au contrat IA ; conserver la compatibilité avec les analyses locales historiques sans titre et permettre l’édition du titre.
- Centraliser la couleur des rêves : rouge tant qu’ils sont à traiter, couleur de catégorie après validation. Sélectionner un jour dans le calendrier pour afficher ses rêves, avec un indicateur distinct par rêve.
- Créer le PIN au premier marquage privé avec confirmation ; authentifier chaque changement par l’ancien PIN et proposer une réinitialisation destructive explicitement confirmée.
- Tester la création/modification du PIN et la purge atomique des rêves privés (audios et corbeille inclus), les titres et couleurs, et les vrais endpoints locaux sans requêtes IA facturées.
