import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('./app.js','utf8');
const buildStart=app.indexOf('async function buildGlobalTree(){');
const buildEnd=app.indexOf('\nfunction ensureArrowRenderer',buildStart);
assert.ok(buildStart>=0&&buildEnd>buildStart,'buildGlobalTree() introuvable');
const fn=app.slice(buildStart,buildEnd);

assert.ok((fn.match(/renderGlobalTree\(/g)||[]).length>=1,'buildGlobalTree doit rendre l’état de construction ou le résultat');
assert.equal((fn.match(/renderMoves\(\)/g)||[]).length,1,'buildGlobalTree ne doit rendre la liste des coups qu’une seule fois à la fin');
assert.equal((fn.match(/renderArrowsForPosition\(/g)||[]).length,1,'buildGlobalTree ne doit recalculer les flèches qu’une seule fois');
assert.match(fn,/state\.globalTreePendingFilter!==filterKey/,'la portée demandée pendant la construction doit être comparée au filtre capturé');
assert.match(fn,/state\.globalTreeSideFilter=next/,'la portée en attente doit être appliquée après la construction courante');

const openStart=app.indexOf('async function openGame(id)');
const openEnd=app.indexOf('let boardRotated=false;',openStart);
const openGame=app.slice(openStart,openEnd);
assert.match(openGame,/state\.globalTreePendingFilter=state\.globalTreeBuilding\?nextScope:null/);

const annoStart=app.indexOf('function renderAnnotations()');
const annoEnd=app.indexOf('function renderSelectedMoveInsights()',annoStart);
const annotations=app.slice(annoStart,annoEnd);
assert.match(annotations,/saveGlobalMoveAnnotations\(\)/,'une annotation globale doit être persistée');
assert.match(annotations,/invalidateGlobalTree\(\{rebuild:true\}\)/,'une annotation globale doit invalider l’arbre immédiatement');
assert.match(annotations,/void persistAnalysis\(\{invalidate:false\}\)/,'la sauvegarde d’une annotation déjà invalidée ne doit pas reconstruire l’arbre une seconde fois');

const renderStart=app.indexOf('function renderGlobalTree(fen){');
const renderEnd=app.indexOf('\nfunction invalidateGlobalTree',renderStart);
const renderer=app.slice(renderStart,renderEnd);
assert.doesNotMatch(renderer,/nodes\.get\(positionKeyFromFen\(fen\)\)\|\|/,'une position absente ne doit pas retomber sur la position initiale');
assert.doesNotMatch(renderer,/renderArrowsForPosition\(/,'le rendu de l’arbre ne doit pas recalculer les flèches déjà gérées par le rendu du plateau');
assert.match(renderer,/renderGlobalTree\(b\.dataset\.fen\)/,'cliquer une branche doit pouvoir déplacer la vue de l’arbre même sans jeu d’exemple');

console.log('STABILISATION BUILD TESTS OK');
