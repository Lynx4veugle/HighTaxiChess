import assert from 'node:assert/strict';
import fs from 'node:fs';
import {splitGames} from './pgn.js';
import {buildGlobalTreeAsync,buildGlobalTree} from './src/games/tree.js';

const source=fs.readFileSync('./fixtures/ChessCom_hightaxi_202609.pgn','utf8');
const chunks=splitGames(source);
const games=Array.from({length:8},(_,r)=>chunks.map((pgn,i)=>({id:`${r}-${i}`,white:'HighTaxi',black:'Stress',result:'1-0',pgn}))).flat();
let yielded=false;
setTimeout(()=>{yielded=true},0);
const tree=await buildGlobalTreeAsync(games,{maxPlies:24,yieldEvery:4});
assert.ok(tree&&tree.nodes.size>1);
assert.equal(yielded,true,'la construction async doit rendre la main au thread entre les lots');
console.log('GLOBAL TREE ASYNC YIELD TEST OK');

const transpositionGames=[
  {id:'g1',white:'HighTaxi',black:'A',result:'1-0',pgn:'[White "HighTaxi"]\n[Black "A"]\n[Result "1-0"]\n\n1. Nf3 d5 2. d4 Nf6 1-0'},
  {id:'g2',white:'HighTaxi',black:'B',result:'1-0',pgn:'[White "HighTaxi"]\n[Black "B"]\n[Result "1-0"]\n\n1. d4 Nf6 2. Nf3 d5 1-0'}
];
const t=buildGlobalTree(transpositionGames,{maxPlies:8});
const rootNode=t.nodes.get('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -') || t.nodes.values().next().value;
const d4Edge=[...rootNode.children.values()].find(e=>e.san==='d4');
const nf3Edge=[...rootNode.children.values()].find(e=>e.san==='Nf3');
assert.ok(d4Edge?.sampleFen&&nf3Edge?.sampleFen,'chaque branche doit conserver le FEN exact de son occurrence');
console.log('GLOBAL TREE SAMPLE-FEN REGRESSION OK');
