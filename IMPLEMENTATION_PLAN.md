# Rêveil — Plan d’implémentation

## Architecture livrée

- Vite, Svelte 5 et TypeScript pour le client mobile-first.
- `vite-plugin-pwa` pour le manifeste, le service worker et le shell hors ligne.
- Dexie/IndexedDB pour rêves, catégories, réglages et blobs audio temporaires.
- Zod et un JSON Schema partagé pour le contrat d’extraction versionné.
- Fonctions Vercel dans `api/ai/` pour transcription, nettoyage et extraction via AI Gateway.

## Étapes de développement

1. Définir les types, la base Dexie, les catégories système, les fonctions de normalisation et le calcul statistique local.
2. Construire la capture texte/vocale, la sauvegarde immédiate, MediaRecorder et la file de traitement explicite.
3. Ajouter les endpoints IA avec clé exclusivement serveur, contrôle de requête, limite d’audio et schéma structuré strict.
4. Construire l’éditeur et la validation des champs IA, y compris réanalyse après modification textuelle et purge audio après validation.
5. Ajouter calendrier, recherche insensible à la casse, statistiques par plage et vues masquées privées.
6. Ajouter PIN de masquage, profil personnel, catégories, corbeille, import manuel, export et restauration JSON.
7. Vérifier installation PWA, fonctionnement hors ligne, build de production et comportements mobiles.

## Contrôles recommandés avant déploiement

- Ajouter `AI_GATEWAY_API_KEY` uniquement dans les variables Vercel ; ne jamais utiliser de préfixe `VITE_`.
- Configurer dans Vercel un budget, une allowlist limitée aux trois modèles et des seuils d’alerte : le prototype n’a pas d’authentification utilisateur.
- Tester microphone et `MediaRecorder` sur Safari iOS et Chromium Android.
- Ajouter Vitest et Playwright au CI pour les cas de normalisation, stockage, import/export, PIN, file hors ligne, analyse simulée et parcours mobile.
