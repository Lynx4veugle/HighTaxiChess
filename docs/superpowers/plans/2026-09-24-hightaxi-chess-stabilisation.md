# HighTaxi Chess Stabilisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabiliser HighTaxi Chess v0.9.33 et préparer une version vérifiable pour GitHub Pages sans casser les données ni les fonctionnalités existantes.

**Architecture:** Conserver les modules ES existants et `app.js` comme composition root. Corriger les contrats entre état, navigation, rendu, arbre, Stockfish et persistance plutôt que réécrire l'application.

**Tech Stack:** PWA statique, JavaScript ES modules, IndexedDB, Web Worker, Stockfish WASM, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-24-hightaxi-chess-stabilisation-design.md`

## Global Constraints

- Plateforme cible : PWA iPhone/Safari.
- Déploiement cible : GitHub Pages.
- Stockage local : IndexedDB et compatibilité avec les données existantes.
- Rotation du plateau : uniquement manuelle.
- Stockfish local : `stockfish-18-lite-single.js` + `stockfish-18-lite-single.wasm`.
- Aucun push/déploiement distant sans accès GitHub explicite.

## Review Focus

- Sélection d'un coup après plusieurs navigations : la position affichée doit correspondre exactement au nœud sélectionné.
- Transposition FEN avec plusieurs chemins PGN : les statistiques et flèches doivent agréger la position sans confondre les séquences.
- Changement rapide de position pendant Stockfish : aucun résultat d'une ancienne position ne doit remplacer le résultat courant.
- Chargement depuis `https://<user>.github.io/<repo>/` : aucun asset ou Service Worker ne doit supposer la racine du domaine.
- Données IndexedDB partiellement invalides : une entrée corrompue ne doit pas empêcher le chargement de toute la base.

---

### Task 1: Characteriser les contrats actuels

**Files:**
- Inspect: `app.js`, `chess.js`, `pgn.js`, `db.js`, `sw.js`, `version.js`, `index.html`, `manifest.webmanifest`.
- Tests: tests existants `test-*.mjs`.

**Interfaces:**
- Produces: liste précise des comportements défaillants et points d'entrée à corriger.

- [ ] **Step 1: Exécuter la suite existante et relever les échecs**
- [ ] **Step 2: Inspecter les tests liés à navigation, arbre, flèches, Stockfish, persistance, import et GitHub Pages**
- [ ] **Step 3: Cartographier les appels entre état → navigation → rendu → analyse**
- [ ] **Step 4: Établir les régressions à reproduire avant toute correction**

### Task 2: Navigation et position de l'échiquier

**Files:**
- Modify: `app.js`, `chess.js` et modules concernés par navigation/rendu.
- Test: tests de navigation et nouveau test de régression ciblé.

**Interfaces:**
- Consumes: état courant et arbre de coups existants.
- Produces: un pipeline unique garantissant que toute navigation met à jour la position, le coup courant et les couches d'analyse.

- [ ] **Step 1: Écrire le test de sélection d'un coup dans la table**
- [ ] **Step 2: Vérifier son échec sur le comportement actuel**
- [ ] **Step 3: Corriger le pipeline de navigation sans dupliquer la logique**
- [ ] **Step 4: Vérifier le test ciblé puis la suite complète**

### Task 3: Arbre global, FEN et flèches

**Files:**
- Modify: `app.js`, `chess.js`, modules d'arbre/flèches existants.
- Test: `test-current-global-tree.mjs`, `test-position-aggregation.mjs`, `test-arrows-model.mjs`, `test-arrow-renderer.mjs` et régressions ciblées.

**Interfaces:**
- Consumes: FEN normalisé, parties et classifications.
- Produces: agrégation déterministe des coups et flèches pour la position courante.

- [ ] **Step 1: Ajouter un test de transposition multi-parties**
- [ ] **Step 2: Vérifier l'échec attendu**
- [ ] **Step 3: Corriger l'identité de position et l'invalidation de cache**
- [ ] **Step 4: Vérifier modèle puis rendu SVG**
- [ ] **Step 5: Vérifier la rotation manuelle sans recalcul incorrect**

### Task 4: Stockfish

**Files:**
- Modify: `app.js`, `stockfish-18-lite-single.js` uniquement si nécessaire pour le contrat d'intégration, modules d'analyse concernés.
- Test: `test-stockfish*.mjs` et nouveau test d'annulation/résultat périmé.

**Interfaces:**
- Consumes: FEN courant et préférence d'activation.
- Produces: évaluation et meilleur coup associés à une requête/version de position.

- [ ] **Step 1: Écrire un test de changement rapide A → B → A/B**
- [ ] **Step 2: Vérifier l'échec attendu**
- [ ] **Step 3: Corriger l'identification des requêtes et l'annulation**
- [ ] **Step 4: Vérifier worker, cache et normalisation des évaluations**
- [ ] **Step 5: Exécuter tous les tests Stockfish**

### Task 5: PGN, Chess.com et persistance

**Files:**
- Modify: `pgn.js`, `db.js`, `app.js`, synchronisation concernée, `sw.js`.
- Test: `test-pgn.mjs`, `test-import-regression.mjs`, `test-sync-regression.mjs`, `test-persistence-regression.mjs` et régressions ciblées.

**Interfaces:**
- Consumes: PGN local/Chess.com.
- Produces: parties validées, dédupliquées et persistées sans perte de données existantes.

- [ ] **Step 1: Ajouter les cas PGN invalide + PGN valide dans un même lot**
- [ ] **Step 2: Vérifier l'échec attendu**
- [ ] **Step 3: Corriger le traitement transactionnel et la reprise de synchronisation**
- [ ] **Step 4: Vérifier migration/schema et corruption partielle**
- [ ] **Step 5: Exécuter les tests d'import, sync et persistance**

### Task 6: Performance UI et rendu

**Files:**
- Modify: `app.js`, `styles.css`, modules UI concernés.
- Test: `test-performance.mjs`, `test-board-integration.mjs`, `test-moves-render-module.mjs` et régressions ciblées.

**Interfaces:**
- Produces: navigation sans reconstruction inutile des 64 cases ou de l'arbre global.

- [ ] **Step 1: Ajouter une régression sur navigation répétée**
- [ ] **Step 2: Vérifier l'échec attendu**
- [ ] **Step 3: Réduire les invalidations et rendus redondants**
- [ ] **Step 4: Vérifier intégration plateau/coups/flèches**

### Task 7: GitHub Pages et PWA

**Files:**
- Modify: `index.html`, `manifest.webmanifest`, `sw.js`, configuration/version si nécessaire.
- Test: `test-github-pages.mjs` et nouveau test de résolution des assets sous sous-chemin.

**Interfaces:**
- Produces: application statique servable sous `/<repository>/`.

- [ ] **Step 1: Ajouter les cas de base URL de dépôt GitHub Pages**
- [ ] **Step 2: Vérifier l'échec attendu**
- [ ] **Step 3: Corriger les chemins relatifs et le scope du Service Worker**
- [ ] **Step 4: Vérifier manifest, icônes, pièces, JS et WASM**
- [ ] **Step 5: Vérifier `.nojekyll` et l'absence de dépendance backend**

### Task 8: Vérification finale

**Files:**
- Inspect: tout le projet.
- Test: suite complète.

- [ ] **Step 1: Exécuter la suite complète**
- [ ] **Step 2: Exécuter les vérifications de syntaxe et architecture**
- [ ] **Step 3: Vérifier le contenu final et les chemins GitHub Pages**
- [ ] **Step 4: Produire l'archive finale avec uniquement les fichiers nécessaires**
