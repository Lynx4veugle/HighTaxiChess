import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildGlobalTree} from './src/games/tree.js';

const malformed={
  id:'bad',white:'HighTaxi',black:'Broken',result:'1-0',
  pgn:'[SetUp "1"]\n[FEN "not a fen"]\n[White "HighTaxi"]\n[Black "Broken"]\n[Result "1-0"]\n\n1. e4 1-0'
};
const valid={
  id:'good',white:'HighTaxi',black:'Good',result:'1-0',
  pgn:'[White "HighTaxi"]\n[Black "Good"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 1-0'
};

const tree=buildGlobalTree([malformed,valid],{maxPlies:4,user:'HighTaxi'});
assert.equal(tree.nodes.size>1,true,'une partie valide doit rester représentée même si une autre entrée est corrompue');

const app=fs.readFileSync('./app.js','utf8');
assert.match(app,/state\.globalTreePendingFilter=state\.globalTreeBuilding\?next:null/,'une nouvelle portée demandée pendant une construction doit être mémorisée');
assert.match(app,/invalidateGlobalTree\(\{rebuild:true\}\);/,'une modification d’annotation doit invalider et reconstruire l’arbre global');
assert.doesNotMatch(app,/nodes\.get\(positionKeyFromFen\(fen\)\)\|\|state\.globalTree\.nodes\.get\(positionKeyFromFen\(Chess\.START_FEN\)\)/,'une position absente ne doit pas afficher silencieusement les coups de la position initiale');

console.log('STABILISATION REGRESSION TESTS OK');
