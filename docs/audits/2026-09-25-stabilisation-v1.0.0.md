# HighTaxi Chess — Audit, debug et stabilisation V1.0.0

Date : 25 septembre 2026
Base auditée : `HighTaxiChess-v0.9.36-GitHubPages-ready(1).zip`
Version livrée : `1.0.0`

## 1. Périmètre

Audit et corrections ciblées de l’application PWA HighTaxi Chess, en conservant l’architecture existante et les fonctionnalités déjà opérationnelles.

Chaîne contrôlée : UI → événements → état → logique échecs/PGN → arbre/FEN → annotations/flèches → Stockfish → persistance/synchronisation → rendu/PWA.

## 2. Bugs corrigés

### B1 — Prise en passant illégale
- Symptôme : une case FEN `en passant` pouvait être jouée alors que le pion adverse à capturer n’existait pas.
- Cause racine : le générateur de coups spéciaux ajoutait le mouvement d’en-passant à partir de la seule case EP.
- Fichier : `chess.js`.
- Correction : l’EP n’est généré que si le pion adverse requis est réellement présent.
- Risque traité : fausse légalité, FEN/positionKey erroné, transpositions et analyses incohérentes.

### B2 — Roque depuis une case de roi non standard
- Symptôme : un roque pouvait être considéré légal lorsque le roi n’était pas sur `e1/e8`.
- Cause racine : les droits de roque étaient utilisés sans imposer la case de départ du roi.
- Fichier : `chess.js`.
- Correction : restriction des mouvements de roque, déplacement de tour et SAN `O-O/O-O-O` aux cases `e1/e8`.
- Risque traité : positions illégales et reconstruction incorrecte de parties.

### B3 — Course critique Stockfish lors d’une panne de Worker
- Symptômes : exception possible après la disparition d’un Worker ; requête en attente pouvant rester suspendue ; nouvelle requête pouvant reprendre sur un Worker remplacé sans contexte cohérent.
- Cause racine : absence d’identification d’époque/instance entre `ensureReady()` et le démarrage d’analyse, et absence d’un chemin de rejet centralisé pour une panne du Worker.
- Fichier : `src/analysis/stockfish.js`.
- Correction : `workerFailureEpoch`, vérification d’identité du Worker, `failWorker()` centralisé, rejet des requêtes courante/en attente, contrôle des réponses tardives, reprise sur un nouveau Worker uniquement pour les requêtes réellement nouvelles.
- Risque traité : blocage de l’analyse, résultats hors contexte et état moteur incohérent.

### B4 — Exception silencieuse lors de l’initialisation UCI
- Symptôme potentiel : échec de `postMessage('isready')` après `uciok` pouvait laisser l’état de préparation du Worker dans un état incomplet.
- Cause racine : le rejet de préparation n’entraînait pas le même nettoyage que les autres pannes Worker.
- Fichier : `src/analysis/stockfish.js`.
- Correction : passage par `failWorker()` sur erreur UCI.
- Risque traité : Worker mort mais contrôleur encore considéré comme disponible.

### B5 — Navigation du Global Tree après transposition
- Symptôme : cliquer sur une branche pouvait reconstruire la mauvaise occurrence d’une même position lorsque plusieurs parties/transpositions partageaient un nœud agrégé.
- Cause racine : le nœud agrégé conservait le premier FEN rencontré alors que la branche pouvait provenir d’une autre occurrence.
- Fichier : `src/games/tree.js`, `app.js`.
- Correction : conservation d’un `sampleFen` par arête et navigation prioritairement par FEN exact, avec fallback sur la clé canonique.
- Risque traité : plateau, historique, annotations et Stockfish désynchronisés après clic dans l’arbre.

### B6 — Flèche Stockfish pouvant être tronquée
- Symptôme : dans une position contenant plus de 12 flèches historiques, la meilleure ligne moteur pouvait disparaître du rendu.
- Cause racine : l’arrow moteur était ajoutée après les flèches historiques puis soumise à une limite globale.
- Fichier : `src/analysis/arrows.js`.
- Correction : l’arête moteur est prioritaire dans la liste rendue ; si elle existe déjà, elle est promue en première position et marquée `engineBest`.
- Risque traité : absence visuelle du meilleur coup dans les positions très chargées.

### B7 — Arrêt du Training incomplet
- Symptôme : l’arrêt d’un scan n’annulait pas systématiquement le calcul Stockfish courant.
- Cause racine : le contrôleur de training interrompait son parcours sans annuler le moteur.
- Fichier : `src/training/controller.js`.
- Correction : `stop()` annule le scan et appelle l’annulation moteur.
- Risque traité : calcul CPU inutile et retour de résultats hors contexte.

### B8 — Puzzles d’entraînement existants perdus lors d’un nouveau scan
- Symptôme : un rescannage pouvait remplacer la liste des puzzles persistés par le seul résultat du scan courant.
- Cause racine : la collecte repartait d’une liste vide.
- Fichier : `src/training/controller.js`.
- Correction : fusion par `trainingPuzzleKey`; les puzzles déjà présents sont conservés et les nouveaux/actualisés sont fusionnés.
- Risque traité : perte de données d’entraînement.

### B9 — Puzzles partiels perdus en cas d’arrêt/erreur de scan
- Symptôme : les puzzles trouvés avant une annulation ou erreur pouvaient être perdus.
- Cause racine : les résultats partiels restaient dans la fonction de scan sans être remontés au contrôleur.
- Fichier : `src/training/puzzles.js`, `src/training/controller.js`.
- Correction : attachement contrôlé des puzzles partiels à l’erreur et fusion/sauvegarde côté contrôleur.
- Risque traité : perte de progrès pendant un scan interrompu.

### B10 — Course de flush de persistance
- Symptôme : une file d’écritures pouvait contenir une sauvegarde directe alors qu’aucun timer n’était armé ; un appel de flush conditionnel pouvait alors laisser l’écriture en attente.
- Cause racine : `flushPendingPersist()` ne flushait que lorsqu’un timer existait.
- Fichier : `app.js`.
- Correction : le flush attend désormais systématiquement la file de persistance après traitement éventuel du timer.
- Risque traité : perte d’annotations/analyses lors d’un changement rapide de partie ou de vue.

### B11 — Restauration de backup pouvant écraser la base avec des données incohérentes
- Symptôme : un backup JSON structurellement accepté pouvait contenir un arbre d’analyse incohérent.
- Cause racine : la validation se limitait au format général avant `replaceAll()`.
- Fichiers : `src/persistence/validation.js`, `app.js`.
- Correction : validation complète PGN/FEN/coups/SAN/arbre avant toute écriture destructive ; plafond de taille des arbres.
- Risque traité : corruption persistante ou perte de la base locale.

### B12 — PWA / versionnement
- Symptôme : le mécanisme de cache devait distinguer explicitement la release V1.0 et précacher tous les nouveaux modules.
- Cause racine : le nom de cache et la liste statique ne reflétaient pas le nouveau module de validation et la nouvelle version.
- Fichiers : `version.js`, `sw.js`, `index.html`, `README.md`.
- Correction : version `1.0.0`, cache `hightaxi-chess-cache-v1.0.0`, précache de `src/persistence/validation.js`, nettoyage des anciens caches.
- Risque traité : mélange de fichiers d’anciennes versions après mise à jour.

## 3. Autres stabilisations

- L’orientation du plateau ne dépend plus automatiquement du camp de la partie ; elle suit uniquement l’état du bouton de rotation.
- Le changement d’onglet hors de l’écran d’analyse annule l’analyse Stockfish active afin d’éviter du calcul inutile en arrière-plan.
- La persistance d’annotation n’est plus déclenchée deux fois par le clic parent + le bouton d’annotation.
- Les lectures `localStorage` importantes restent protégées par `try/catch`, avec valeurs de repli et messages d’avertissement.
- Les archives de synchronisation sont nettoyées lors du chargement pour ignorer les entrées non textuelles.
- Les annotations globales restaurées depuis un backup sont rejetées si leur structure racine est un tableau.
- Le schéma de backup est maintenant vérifié comme entier fini dans la plage prise en charge.
- Le module de rendu du plateau réutilise les 64 cases au lieu de reconstruire systématiquement le DOM.
- Le Global Tree construit par lots avec yielding afin d’éviter un blocage monolithique du thread principal.

## 4. Tests exécutés

### Suite automatisée complète
- 56 fichiers `test-*.mjs` exécutés.
- Résultat : **56/56 PASS, 0 FAIL**.

### Syntaxe JavaScript
- 29 fichiers `.js` vérifiés avec `node --check`.
- Résultat : **29/29 PASS**.

### Vérifications ciblées supplémentaires
- performance/cache/pagination : PASS
- réutilisation DOM du plateau : PASS
- légalité PGN ultra-rapide : PASS
- build/stabilisation : PASS
- régressions de stabilisation : PASS
- synchronisation : PASS
- import : PASS

### Régressions ajoutées
- légalité en passant et roque : `test-chess-legality-regressions.mjs`
- concurrence/panne Worker Stockfish : `test-stockfish-race-regression.mjs`
- navigation exacte du Global Tree : `test-global-tree-async.mjs`
- priorité de flèche moteur : `test-arrows-model.mjs`
- conservation des puzzles et arrêt Training : `test-training-controller.mjs`, `test-training-abort-partial.mjs`
- validation des backups : `test-persistence-validation.mjs`

## 5. Performance

Optimisations et garde-fous vérifiés par tests :
- réutilisation du DOM du plateau ;
- pagination des listes lourdes ;
- construction asynchrone du Global Tree ;
- limitation des recalculs et caches d’analyse ;
- annulation du moteur lors d’une navigation hors analyse ;
- suppression de doubles écritures d’annotation.

Les tests disponibles confirment les invariants de performance ciblés. Aucun benchmark Safari/iPhone réel n’a été possible dans cet environnement ; aucun gain numérique sur appareil réel n’est donc affirmé.

## 6. Régressions potentielles à surveiller

- Interaction exacte entre Service Worker, cache et installation PWA sur iOS réel.
- Comportement mémoire/CPU lors d’une base extrêmement volumineuse sur iPhone.
- Séquences tactiles réelles : pointer/touch, clavier logiciel, retour Safari, mise en veille/réveil.
- Résilience du proxy/API Chess.com dans son environnement de déploiement réel.
- Chargement et exécution réels de Stockfish WASM dans Safari iPhone.

## 7. Vérifications non réalisables dans cet environnement

Un navigateur Chromium 144 est présent, mais l’environnement de test bloque la navigation vers le serveur HTTP local (`ERR_BLOCKED_BY_ADMINISTRATOR`) ainsi que l’ouverture directe du fichier HTML, qui aboutit à une page d’erreur Chrome. En conséquence, les vérifications suivantes ne peuvent pas être déclarées comme réellement exécutées :

- parcours UI réel dans un navigateur ;
- Service Worker installé/exécuté dans un navigateur ;
- exécution Worker + WASM Stockfish réelle ;
- installation PWA ;
- Safari iPhone réel ;
- gestes tactiles et safe areas réels ;
- synchronisation Chess.com contre le service réseau réel.

Ces points restent explicitement **à vérifier avant déploiement définitif sur appareil**.

## 8. État de livraison

La base source issue de V0.9.36 a été stabilisée sans réécriture globale de l’architecture. Les protections ajoutées ciblent les chemins à risque élevé : légalité échiquéenne, synchronisation de position, concurrence moteur, persistance, entraînement et versionnement PWA.

La version livrée est `1.0.0`. La décision finale de validation terrain doit encore inclure un passage sur iPhone/Safari réel.
