import assert from 'node:assert/strict';
import {createTrainingController} from './src/training/controller.js';
import {parsePGN} from './pgn.js';
import {Chess} from './chess.js';

const game={id:'controller-game',source:'Chess.com',white:'HighTaxi',black:'Opponent',result:'1-0',date:'2026.09.23',pgn:'[White "HighTaxi"]\n[Black "Opponent"]\n[Result "1-0"]\n\n1. e4 e5 1-0'};
const parsed=parsePGN(game.pgn)[0];
const start=parsed.root.fen;
const e4=parsed.root.children[0].fen;
const d4=new Chess(start);d4.play({from:'d2',to:'d4'});
const evals=new Map([[start,{cp:0,bestMove:'d2d4'}],[d4.fen(),{cp:-400,bestMove:'e7e5'}],[e4,{cp:-150,bestMove:'e7e5'}]]);
const elements=new Map();
for(const id of ['trainingProgress','trainingScanBtn','trainingStopBtn'])elements.set(id,{hidden:id!=='trainingProgress',disabled:false,textContent:''});
globalThis.document={body:{classList:{contains:()=>false}},getElementById:id=>elements.get(id),createElement:()=>({}),};
const store=new Map();
globalThis.localStorage={setItem:(k,v)=>store.set(k,String(v)),getItem:k=>store.get(k)||null};
globalThis.confirm=()=>true;
let toasts=[];let rendered=0;let cancelCount=0;let positionChanged=0;
const preExisting={gameId:'old',fen:start,type:'blunder',bestMove:'d2d4',playedMove:'e2e4'};
const state={trainingPuzzles:[preExisting],trainingProgress:{},trainingScanState:{},trainingScanActive:false};
const controller=createTrainingController({
  state,getGames:()=>[game],currentUser:()=> 'HighTaxi',analyzeFen:async fen=>evals.get(fen)||{cp:0,bestMove:'e7e5'},
  cancelEngineAnalysis:()=>{cancelCount++},render:()=>{rendered++},toast:msg=>toasts.push(msg),onPositionChanged:()=>{positionChanged++}
});
await controller.scan();
assert.equal(controller.active(),false);
assert.equal(state.trainingScanActive,false);
assert.equal(state.trainingPuzzles.length,1,'la même position doit rester un exercice logique unique');
assert.ok(state.trainingPuzzles[0].occurrences.some(p=>p.gameId==='old'));
assert.ok(state.trainingPuzzles[0].occurrences.some(p=>p.gameId==='controller-game'));
assert.equal(Object.keys(state.trainingScanState).length,1);
assert.equal(cancelCount,1);
assert.ok(store.get('ht_training_puzzles_v1').includes('controller-game'));

let rejectBlocked=null;
const stopController=createTrainingController({
  state:{trainingPuzzles:[],trainingScanActive:false},
  getGames:()=>[game],
  currentUser:()=> 'HighTaxi',
  analyzeFen:()=>new Promise((resolve,reject)=>{rejectBlocked=reject}),
  cancelEngineAnalysis:()=>{cancelCount++;rejectBlocked?.(new Error('Stockfish request cancelled'));},
  render:()=>{},
  toast:msg=>toasts.push(msg),
  onPositionChanged:()=>{}
});
const blockedScan=stopController.scan();
await Promise.resolve();
assert.ok(rejectBlocked,'le scan doit avoir atteint l’analyse moteur');
stopController.stop();
await blockedScan;
assert.equal(cancelCount,3,'arrêter un scan actif doit aussi annuler l’analyse moteur courante');
assert.equal(stopController.active(),false);
assert.ok(rendered>=1);
assert.ok(toasts.some(t=>t.includes('Scan arrêté')||t.includes('Scan terminé')));
assert.equal(elements.get('trainingExportBtn'),undefined);
console.log('TRAINING CONTROLLER TESTS OK');
