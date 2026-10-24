# HighTaxi Chess — Refactoring et stabilisation du Training persistant

## 1. Résultat

Version livrée : `1.0.1`

Le Training est maintenant organisé autour de trois responsabilités persistantes :

- `ht_training_puzzles_v1` : positions problématiques découvertes, dédupliquées par identité positionnelle, avec occurrences historiques.
- `ht_training_progress_v1` : tentatives, réussites, `solvedAt` et dernière tentative, indexés par position globale.
- `ht_training_scan_state_v1` : empreinte des parties déjà analysées, statut et date d’analyse.

Le reload ne reconstruit plus le Training depuis les parties : les données Training sont rechargées depuis `localStorage`.

## 2. Causes racines trouvées

### Cause 1 — identité d’exercice liée à la partie

L’ancienne `trainingPuzzleKey` contenait :

`gameId + FEN + type + bestMove + playedMove`

Cela empêchait une maîtrise globale d’une position : une même position rencontrée dans une autre partie pouvait devenir un nouvel exercice logique.

### Cause 2 — progression migrée mais encore structurée autour de l’ancienne clé

`loadTrainingProgress()` normalisait partiellement la FEN mais conservait la structure incluant `gameId`.

La progression est maintenant indexée directement par la clé positionnelle canonique.

### Cause 3 — absence d’état de scan persistant

Le contrôleur parcourait toutes les parties à chaque clic sur l’analyse Training.

Il existe désormais un `trainingScanState` avec fingerprint déterministe d’une partie. Une partie inchangée déjà analysée est ignorée.

### Cause 4 — déduplication uniquement au niveau du puzzle brut

Plusieurs occurrences d’une même position pouvaient produire plusieurs entrées indépendantes.

La base contient maintenant un seul puzzle logique par position et un tableau `occurrences[]` pour conserver l’origine historique.

## 3. Architecture retenue

### Position globale

`trainingPuzzleKey(puzzle)` retourne `positionKeyFromFen(...)`.

La clé positionnelle conserve :

- placement des pièces ;
- trait ;
- droits de roque ;
- en-passant uniquement lorsqu’il constitue réellement une possibilité légale.

Les compteurs demi-coup / numéro de coup ne créent donc pas de nouvelle identité de position.

### Occurrence

Chaque occurrence conserve notamment :

- `gameId` ;
- source ;
- type ;
- coup joué ;
- meilleur coup ;
- évaluations ;
- métadonnées ;
- FEN de position ;
- FEN après meilleur coup.

### Progression

`solvedAt` est attaché à la position globale. Une réussite sur la position X la marque donc comme résolue pour toutes ses occurrences.

## 4. Scan incrémental

Le flux est maintenant :

`parties -> trainingScanState -> parties nouvelles/modifiées -> Stockfish -> puzzles -> déduplication -> persistance`

Une partie est marquée `analyzed` uniquement après sauvegarde réussie des puzzles.

Une interruption pendant une partie conserve les puzzles déjà trouvés mais ne marque pas cette partie comme analysée.

Une partie dont le PGN ou les métadonnées utilisées pour le fingerprint changent est automatiquement considérée comme à rescanner.

Un rescan explicite forcé est disponible via `scan({force:true})` et le bouton `Rescanner tout`.

## 5. Migration

### Puzzles

Les anciennes données de `ht_training_puzzles_v1` au format tableau sont automatiquement transformées en modèle positionnel.

Les doublons historiques sont fusionnés par position et leurs occurrences sont conservées.

### Progression

Les anciennes clés du type :

`gameId|position|type|bestMove|playedMove`

sont converties vers la clé positionnelle globale.

Les compteurs sont fusionnés lorsqu’une même position possédait plusieurs anciennes occurrences.

### Scan state

Aucun état de scan n’existait avant ce refactoring. L’absence de `ht_training_scan_state_v1` est donc interprétée comme « parties non encore analysées », ce qui force une première analyse sûre au lieu de supposer à tort qu’elles ont déjà été traitées.

## 6. Tests réellement exécutés

### Suite complète

`57/57` fichiers de tests Node : PASS.

### Tests Training spécifiques

- persistance reload : PASS ;
- exercice non résolu après reload : PASS ;
- exercice résolu conservé mais masqué : PASS ;
- 100 parties puis +3 nouvelles : PASS ;
- deuxième scan sans modification : aucune nouvelle analyse ;
- partie modifiée : rescannée ;
- rescan forcé : PASS ;
- même FEN dans plusieurs parties : un seul exercice logique ;
- occurrences conservées : PASS ;
- plusieurs tentatives puis réussite : PASS ;
- migration de puzzles V1 : PASS ;
- migration de progression V1 : PASS ;
- scan state persistant et fingerprint : PASS.

### Fixture réel

Fixture Chess.com analysé structurellement :

- 153 parties ;
- 11 238 positions de ligne principale ;
- 10 260 positions uniques après normalisation positionnelle.

### Service Worker

52 ressources déclarées dans le cache statique ; 52/52 présentes dans l’archive.

Le nouveau module `src/training/store.js` est précaché.

### Syntaxe

`app.js` et tous les modules Training passent `node --check`.

## 7. Fichiers modifiés

- `app.js`
- `index.html`
- `version.js`
- `sw.js`
- `README.md`
- `src/app/state.js`
- `src/training/puzzles.js`
- `src/training/progress.js`
- `src/training/controller.js`
- `src/training/store.js` (nouveau)

Tests ajustés ou ajoutés :

- `test-training-persistence-v2.mjs` (nouveau)
- `test-training-controller.mjs`
- `test-app-architecture.mjs`
- `test-app-syntax.mjs`
- `test-architecture-modules.mjs`
- `test-current-analysis.mjs`
- `test-current-global-tree.mjs`
- `test-current-robustness.mjs`
- `test-current-ui.mjs`
- `test-github-pages.mjs`
- `test-review-fixes.mjs`
- `test-stockfish-runtime.mjs`

## 8. Risques et points restant à vérifier

Le comportement a été validé au niveau des modules, de la persistance simulée par `localStorage`, des migrations, du scan incrémental et de la suite de régression.

La validation suivante n’a pas pu être exécutée dans cet environnement :

- reload réel dans Safari/iPhone ;
- fermeture/réouverture réelle de la PWA ;
- cycle de vie réel du Service Worker dans Safari ;
- exécution réelle du Web Worker Stockfish dans le navigateur ;
- interaction tactile réelle sur iPhone.

Le runtime navigateur local disponible pour cette session était bloqué par l’environnement, donc aucun de ces points n’est présenté comme « testé ».

## 9. Scénario cible vérifié par tests

Le modèle implémenté permet le comportement suivant :

`100 parties -> 37 positions -> 12 résolues -> reload -> 25 actives -> +3 parties -> nouvelles positions ajoutées -> position déjà résolue masquée -> position déjà connue non résolue réutilisée sans doublon.`

La différence importante est que la résolution est désormais attachée à la position globale et non à l’occurrence d’une partie.
