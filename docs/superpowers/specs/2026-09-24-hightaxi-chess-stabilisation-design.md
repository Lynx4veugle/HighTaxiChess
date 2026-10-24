# HighTaxi Chess — Stabilisation v0.9.33

## Objectif

Stabiliser la PWA existante afin que les fonctionnalités déjà implantées soient cohérentes et fonctionnelles sur iPhone/Safari et lors d'un déploiement GitHub Pages, sans supprimer les données locales ni réécrire inutilement l'architecture.

## Contraintes

- Plateforme cible : PWA iPhone/Safari.
- Déploiement cible : GitHub Pages.
- Stockage local : IndexedDB et compatibilité avec les données existantes.
- Stockfish : worker local utilisant `stockfish-18-lite-single.js` et `stockfish-18-lite-single.wasm`.
- Rotation du plateau : uniquement manuelle.
- Les flux navigation, FEN, PGN, arbre global, statistiques, annotations, flèches et Stockfish doivent rester cohérents.
- Aucun déploiement distant, commit ou push n'est effectué sans accès/autorisation GitHub explicite.

## Périmètre

1. Audit et correction des régressions de navigation et de synchronisation d'état.
2. Correction du rendu du plateau, des pièces, des coups et des flèches.
3. Stabilisation de l'arbre global et des transpositions par FEN.
4. Stabilisation Stockfish : worker, annulation, déduplication, cache et résultats obsolètes.
5. Stabilisation import/export PGN et synchronisation Chess.com.
6. Vérification IndexedDB, migrations et persistance.
7. Performance UI : éviter les reconstructions inutiles et les blocages de navigation.
8. Validation GitHub Pages : chemins relatifs, Service Worker, manifest, WASM/assets et `.nojekyll`.
9. Tests de régression couvrant les bugs constatés.

## Hors périmètre

- Nouvelles fonctionnalités non nécessaires à la stabilisation.
- Refonte graphique complète.
- Migration native iOS.
- Backend ou serveur intermédiaire.
- Publication/push GitHub sans accès explicite.

## Critères de réussite

- Les tests automatisés existants restent verts.
- Les parcours de navigation produisent une position d'échiquier cohérente avec le coup sélectionné.
- Les pièces utilisent les assets locaux attendus.
- Les flèches sont cohérentes avec la position, l'orientation et les classifications.
- Stockfish ne laisse pas remonter de résultat périmé après un changement de position.
- Les données locales existantes sont conservées et les imports ne créent pas de doublons.
- Les ressources fonctionnent depuis un sous-chemin GitHub Pages.
- Toute limite de vérification navigateur due à l'environnement est explicitement signalée.
