# Audit complet — HighTaxi Chess v0.9.36

**Date :** 25 septembre 2026  
**Base auditée :** v0.9.35 GitHub Pages Ready  
**Version livrée :** v0.9.36  
**Cible :** PWA iPhone/Safari, JavaScript moderne, IndexedDB/localStorage, Service Worker, Stockfish WebAssembly.

## 1. Périmètre et architecture observés

L’application conserve son architecture existante : `app.js` reste la couche de composition, tandis que le moteur d’échecs, la navigation, l’arbre global, la persistance, la synchronisation, le rendu du plateau, les flèches et l’entraînement sont répartis dans les modules `src/`.

Flux critiques audités :

- `app.js` → état global → rendu UI ;
- `app.js` → arbre global / cache d’ouvertures ;
- `app.js` → contrôleur Stockfish → Web Worker → UCI ;
- PGN → parseur → FEN/positions → arbre ;
- analyse/annotations → persistance → index/rendu ;
- synchronisation Chess.com → détection de doublons → IndexedDB ;
- PWA → Service Worker → cache versionné ;
- entraînement → identifiant position → progression localStorage.

Aucune réécriture d’architecture n’a été introduite.

## 2. Bugs corrigés

### 2.1 Race condition Stockfish — timer `ready` d’un ancien Worker

**Symptôme :** un ancien timer de timeout pouvait encore cibler le Worker courant après remplacement du Worker.  
**Cause racine :** fermeture sur la variable globale `worker` au lieu d’identifier l’instance à l’origine du timer.  
**Correction :** handlers, timeout et terminaison vérifient maintenant l’identité exacte de l’instance Worker ; les timers sont systématiquement nettoyés.  
**Test :** `test-stockfish-race-regression.mjs` — PASS.

### 2.2 Race condition Stockfish — `cancel()` puis nouvelle analyse

**Symptôme :** une réponse `bestmove` tardive pouvait être interprétée comme la réponse d’une nouvelle analyse démarrée immédiatement après l’ancienne.  
**Cause racine :** le même Worker restait susceptible d’émettre des sorties UCI après `stop`, alors que la couche applicative avait déjà réutilisé l’état de requête.  
**Correction :** token d’analyse, file de requête suivante, état `waitingForStop`, rejet des requêtes obsolètes et recréation contrôlée du Worker lors d’un `cancel`.  
**Test :** `test-stockfish-race-regression.mjs`, `test-stockfish-orchestration.mjs` — PASS.

### 2.3 Arbre global — calcul synchrone bloquant

**Symptôme :** la construction de l’arbre global pouvait monopoliser le thread principal pendant plusieurs secondes sur une base volumineuse.  
**Cause racine :** `buildGlobalTree()` exécutait toutes les parties et tous les préfixes d’ouverture dans une seule séquence synchrone.  
**Correction :** ajout de `buildGlobalTreeAsync()` avec yield périodique, progression et annulation coopérative ; `app.js` utilise désormais cette voie pour la reconstruction UI. L’API synchrone a été conservée pour les usages existants et les tests.  
**Tests :** `test-global-tree-async.mjs`, `test-stabilisation-build.mjs` — PASS.

### 2.4 Arbre global — ancienne construction pouvant publier un résultat obsolète

**Symptôme :** une reconstruction annulée pouvait continuer son traitement alors qu’une nouvelle reconstruction avait été demandée.  
**Cause racine :** absence d’identifiant de génération au niveau de la reconstruction.  
**Correction :** `globalTreeBuildToken` et vérifications avant publication/progression ; une construction devenue obsolète ne peut plus remplacer l’arbre courant.

### 2.5 PGN — résultat dans une variante

**Symptôme :** un token `1-0`, `0-1`, `1/2-1/2` ou `*` situé dans une variante pouvait couper artificiellement un fichier multi-parties.  
**Cause racine :** le splitter ne conditionnait pas la détection de résultat sur la profondeur de variante.  
**Correction :** un résultat n’est désormais séparateur que lorsque `depth === 0`.  
**Test :** `test-pgn-split-variations.mjs` — PASS.

### 2.6 Synchronisation Chess.com — identifiants potentiellement divergents

**Symptôme :** une partie déjà migrée vers un identifiant stable `chesscom-...` pouvait être réintroduite avec un autre identifiant calculé à partir du contenu.  
**Cause racine :** le chemin de synchronisation n’utilisait pas le même identifiant stable que la migration.  
**Correction :** priorité à `chessComStableId()` puis fallback sur `gameIdentity()`.  
**Test :** `test-sync-regression.mjs` — PASS.

### 2.7 Entraînement — identité de position trop stricte

**Symptôme :** deux occurrences d’une même position échiquéenne pouvaient recevoir des clés d’entraînement différentes lorsque les compteurs FEN différaient.  
**Cause racine :** la clé incluait le FEN complet au lieu de la représentation normalisée de la position.  
**Correction :** utilisation de `positionKeyFromFen()` pour l’ID du puzzle et la clé de progression ; chargement des anciennes clés avec fusion des compteurs en cas de collision.  
**Test :** `test-training-transposition.mjs` — PASS.

### 2.8 Notes — reconstruction inutile de l’arbre

**Symptôme :** l’enregistrement d’une simple note pouvait invalider l’arbre global complet.  
**Cause racine :** toutes les sauvegardes d’analyse déclenchaient la même invalidation, alors que le texte de note ne modifiait pas la structure de l’arbre global.  
**Correction :** sauvegardes de notes sans invalidation d’arbre ; les modifications structurelles continuent d’invalider l’arbre.

## 3. Optimisations

### 3.1 Construction asynchrone de l’arbre global

**Problème :** blocage du thread principal sur les bases importantes.  
**Modification :** traitement par lots de 4 parties avec yield `setTimeout(0)` et possibilité d’annuler une génération obsolète.  
**Mesure :** sur 1 224 parties synthétiques issues du fixture, 24 plies, la construction asynchrone à froid a pris **4,416 s** contre environ **4,2 s** pour l’ancienne voie synchrone mesurée lors de l’audit initial. Le coût CPU total reste du même ordre ; le gain principal est la restitution de la main au navigateur. Durant la première construction async, un timer à 10 ms a pu s’exécuter **304 fois**.  
**Conclusion :** amélioration de fluidité/coopération du thread, pas de gain CPU revendiqué sur ce benchmark.

### 3.2 Cache des préfixes d’ouverture

**Problème :** recalcul d’un même préfixe lorsqu’une reconstruction réutilise les mêmes parties.  
**Modification :** conservation/réutilisation de `openingPrefixCache` existant, désormais partagé par les voies sync et async.  
**Mesure :** sur le même jeu de 1 224 parties, un second rebuild async a pris environ **0,75 s** contre **4,42 s** à froid dans le même processus.

### 3.3 Mémoïsation du tri principal

**Problème :** `sorted()` copiait et triait toute la base à chaque appel.  
**Modification :** cache invalidé par `dataRevision`, réinitialisé lors des mutations de données et lors du remplacement d’un snapshot persistant.

### 3.4 Rendu ciblé du plateau

**Problème :** les 64 cases étaient systématiquement vidées et reconstruites à chaque rendu.  
**Modification :** chaque case possède une clé de rendu dérivée de son état visible ; une case inchangée n’est plus recréée et le fallback des pièces n’est plus relancé lorsque rien n’a changé.  
**Test :** `test-board-render-performance.mjs` vérifie explicitement l’absence de réécriture des cases et de reconstruction des pièces sur un second rendu identique — PASS.

### 3.5 Service Worker — shell statique cache-first

**Problème :** le shell statique attendait le réseau lorsqu’un élément était déjà disponible en cache, ce qui pouvait ajouter de la latence et dépendre inutilement du réseau.  
**Modification :** ressources statiques versionnées servies depuis le cache immédiatement ; les routes `/api` restent hors Service Worker ; le cache est renouvelé par version d’application.  
**Validation :** tests GitHub Pages / Service Worker — PASS.

## 4. Validation moteur d’échecs et données

Les tests existants couvrent notamment :

- mouvements légaux/illégaux ;
- roque ;
- promotion ;
- prise en passant ;
- échec, mat, pat ;
- FEN ;
- PGN et variantes ;
- navigation dans l’historique ;
- agrégation des positions ;
- annotations ;
- persistance ;
- entraînement.

Le traitement des positions continue d’utiliser `positionKeyFromFen()` comme représentation canonique pour les comparaisons qui doivent ignorer les compteurs de demi-coup/coup complet.

## 5. Tests exécutés

**Suite complète : 53/53 PASS.**

Tous les fichiers `test-*.mjs` présents dans la livraison ont été exécutés, notamment les nouvelles régressions :

- `test-stockfish-race-regression.mjs` — PASS
- `test-global-tree-async.mjs` — PASS
- `test-pgn-split-variations.mjs` — PASS
- `test-training-transposition.mjs` — PASS
- `test-board-render-performance.mjs` — PASS
- `test-sync-regression.mjs` — PASS
- `test-stockfish-runtime.mjs` — PASS
- `test-review-fixes.mjs` — PASS

La suite `test-chess.mjs` a été exécutée individuellement avec succès en environ **17 s**. Le test `test-app-syntax.mjs` prend environ **5 s**. Le test async de l’arbre prend environ **5,4 s** sur l’environnement utilisé.

Des logs contrôlés de données corrompues apparaissent dans les tests de robustesse et de progression d’entraînement ; ils sont attendus et les tests concernés sont PASS.

## 6. Tests non exécutables dans cet environnement

**NON TESTÉ :**

- exécution réelle dans Safari iPhone ;
- PWA installée sur iOS avec cycle veille/réveil ;
- rendu/performance GPU réelle sur iPhone ;
- interaction tactile réelle ;
- exécution réelle du Worker Stockfish dans un navigateur ;
- cycle installation/activation/migration du Service Worker dans un navigateur ;
- synchronisation réseau réelle vers Chess.com ;
- mesure FPS/reflow/repaint avec Chrome DevTools/Safari Web Inspector.

Une tentative de smoke test navigateur headless a expiré dans l’environnement d’exécution et n’a produit aucune preuve exploitable. Elle n’est donc pas comptée comme un test PASS.

## 7. Risques résiduels

1. **Index FEN global complet :** l’architecture actuelle optimise fortement l’arbre d’ouverture et les caches, mais ne possède toujours pas un index persistant couvrant chaque FEN de toutes les parties et tous les plies. Une telle structure serait une évolution d’architecture et n’a pas été introduite dans cette stabilisation.
2. **Safari/iPhone :** la compatibilité réelle avec mémoire limitée, reprise après veille et nuances Worker/Service Worker reste à vérifier sur appareil.
3. **Stockfish réel navigateur :** les contrats Worker/UCI et les régressions de concurrence sont testés avec Workers simulés ; l’exécution WASM réelle reste à valider dans un navigateur.
4. **Réseau Chess.com :** les erreurs de timeout, réponses invalides et déduplication sont présentes côté code et tests, mais l’API réelle n’a pas été sollicitée pendant cet audit.
5. **Profiling UI réel :** la réduction des opérations DOM est démontrée par le test de rendu ciblé ; un profil CPU/FPS Safari réel reste nécessaire avant de conclure sur une valeur chiffrée de fluidité.

## 8. Fichiers modifiés

### Production

- `app.js` — orchestration arbre async, génération d’analyse, cache de tri, persistance fine, synchronisation stable.
- `index.html` — version UI 0.9.36.
- `version.js` — version 0.9.36.
- `sw.js` — cache versionné 0.9.36 et stratégie cache-first statique.
- `pgn.js` — correction du splitter des résultats dans les variantes.
- `src/analysis/stockfish.js` — gestion robuste des générations Worker, cancellation et races UCI.
- `src/games/tree.js` — constructeur partagé sync/async, yields, annulation et réutilisation du cache.
- `src/ui/board.js` — rendu ciblé des cases.
- `src/training/puzzles.js` — clé de puzzle basée sur la position normalisée.
- `src/training/progress.js` — migration/normalisation des anciennes clés d’entraînement.

### Tests

- `test-app-architecture.mjs`
- `test-current-analysis.mjs`
- `test-current-ui.mjs`
- `test-current-global-tree.mjs`
- `test-current-robustness.mjs`
- `test-github-pages.mjs`
- `test-review-fixes.mjs`
- `test-stabilisation-build.mjs`
- `test-stockfish-runtime.mjs`
- `test-sync-regression.mjs`
- `test-performance.mjs`
- `test-board-render-performance.mjs`
- `test-global-tree-async.mjs` (nouveau)
- `test-pgn-split-variations.mjs` (nouveau)
- `test-stockfish-race-regression.mjs` (nouveau)
- `test-training-transposition.mjs` (nouveau)

## 9. Régressions sensibles revalidées

Revalidées par les tests : moteur d’échecs, FEN, PGN, variantes, navigation, annotations, arbre global, Stockfish, entraînement, persistance, synchronisation, assets locaux Stockfish et package GitHub Pages.

## 10. Verdict

**Fonctionnel vérifié par la suite automatisée : PASS — 53/53.**  
**Performance : amélioration confirmée sur le blocage du thread principal lors de la reconstruction async ; gain CPU global non revendiqué sur le benchmark.**  
**Safari/iPhone et navigateur réel : NON TESTÉ.**

La version livrée est **v0.9.36**.
