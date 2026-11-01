# Rêveil — Spécification fonctionnelle

## Objectif

Rêveil est un journal de rêves personnel, mobile et francophone. Il permet de capturer une pensée au réveil en texte ou par voix, de la conserver sans réseau, puis de l’enrichir par une analyse IA validée par la personne utilisatrice.

## Parcours principal

1. Depuis l’accueil, le bouton unique « Raconter un rêve » ouvre une feuille de saisie.
2. La personne écrit ou enregistre. Le contenu est sauvegardé immédiatement dans IndexedDB.
3. Un rêve vocal hors ligne reste « à transcrire ». Un rêve texte reste « à analyser ». La reprise n’est jamais automatique : le bouton « Lancer l’analyse » est explicite.
4. En ligne, le flux vocal est transcription → nettoyage → extraction. Le flux texte est extraction.
5. L’analyse est préremplie et éditable ; la validation fixe les données utilisées dans la recherche et les statistiques. L’audio vocal temporaire est alors supprimé.

## Modèle de données

- `Dream` : UUID, date locale modifiable, dates de création/mise à jour, mode de capture, texte nettoyé, transcription brute optionnelle, catégorie, confidentialité, état, analyse, erreur, date de corbeille.
- `DreamAnalysis` : titre court français (3–8 mots, 100 caractères maximum), personnages, lieux, thèmes, maximum cinq mots-clés, émotions, niveau de détail 1–5 et version de schéma. Le titre est modifiable ; les anciens rêves sans titre restent compatibles.
- `Category` : UUID, nom, couleur et marqueur système. `Normal`, `Lucide` et `Scénario` sont créées initialement ; le défaut est `Normal`.
- `AudioRecord` : blob audio temporaire, type MIME et date, référencé par l’UUID du rêve.
- `Settings` : profil personnel libre et hash salé du PIN.

Les comparaisons statistiques utilisent une clé Unicode normalisée et en minuscules françaises. L’orthographe d’affichage est préservée.

## États et confidentialité

États possibles : `a_transcrire`, `a_nettoyer`, `a_analyser`, `a_valider`, `analyse`, `erreur`. Modifier le texte d’un rêve analysé le marque comme à réanalyser, sans détruire l’analyse existante.

Le PIN numérique à six chiffres masque l’interface des rêves privés jusqu’à son déverrouillage en session. Les cartes privées affichent seulement date et cadenas, et sont exclues de la recherche, des statistiques et de l’export tant qu’elles restent verrouillées. Il s’agit d’un masquage d’interface, pas d’un chiffrement : IndexedDB reste techniquement accessible depuis le navigateur.

Le PIN est créé et confirmé lors du premier marquage privé. Le changement dans les réglages exige toujours l’ancien PIN. Une réinitialisation pour oubli demande confirmation, supprime définitivement tous les rêves privés (corbeille incluse) et leurs audios dans une transaction, et retire le PIN. Elle préserve les rêves publics et le profil. Annuler la création du PIN ne marque pas le rêve comme privé.

Les rêves à traiter (états non validés ou analyse obsolète) sont rouges dans le journal et le calendrier, indépendamment de leur catégorie. Le calendrier affiche une case par rêve ; cliquer sur un jour, y compris sur ses cases, sélectionne le jour et affiche sa liste de rêves. La liste permet ensuite d’ouvrir chaque rêve.

Les suppressions passent dans une corbeille restaurable 30 jours. L’export JSON versionné n’inclut jamais de blobs audio. L’import propose fusion par UUID ou remplacement confirmé.

## IA

Tous les prompts et contenus d’interface sont français. Le navigateur n’accède jamais directement à une clé : trois fonctions Vercel appellent directement l’API OpenAI avec `OPENAI_API_KEY` côté serveur. Localement, cette variable est renseignée dans `.env`, ignoré par Git.

- `gpt-4o-transcribe` : transcription française d’un blob vocal.
- `gpt-6-luna`, raisonnement faible (`low`) : nettoyage factuel de transcription, sans ajout ni interprétation. `minimal` n’est pas pris en charge par ce modèle sur l’API directe.
- `gpt-6-luna`, raisonnement faible : extraction contrainte par JSON Schema strict et validée par Zod.

Les prompts et fonctions sont partagés dans `server/ai.ts` avec un banc d’essai Node local : `npm run ai:test -- example/dream1.txt`. Un texte passe par nettoyage puis extraction ; un audio ajoute la transcription. Les sorties intermédiaires sont affichées et sauvegardées dans `test-results/`.

Le profil personnel est inclus uniquement dans l’extracteur afin de rendre explicites les surnoms et relations connus. L’extracteur ne doit pas inférer de diagnostic ou inventer des informations.

La note de détail signifie : 1 fragments vagues ; 2 bribe avec peu de contexte ; 3 récit cohérent ; 4 récit riche ; 5 récit très descriptif avec personnages, lieux et actions détaillés.

## PWA et statistiques

Le shell de l’application est précaché pour fonctionner sans réseau. Les appels IA ne sont pas mis en cache. Les statistiques par période affichent fréquence, catégories, note moyenne, longueur, personnages, lieux, thèmes, émotions et cooccurrences de personnages. La vue d’un rêve expose l’ensemble de son analyse validée.
