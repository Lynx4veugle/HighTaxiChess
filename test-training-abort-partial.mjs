import assert from 'node:assert/strict';
import {scanGameForTrainingPuzzles} from './src/training/puzzles.js';

const game={
  id:'partial-training',
  source:'Chess.com',
  white:'HighTaxi',
  black:'Opponent',
  result:'1-0',
  pgn:'[White "HighTaxi"]\n[Black "Opponent"]\n[Result "1-0"]\n\n1. e4 e5 1-0'
};
const controller=new AbortController();
let calls=0;
const evals=new Map();
const analyze=async fen=>{
  calls++;
  if(!evals.has(fen)){
    if(calls===1)evals.set(fen,{cp:0,bestMove:'d2d4'});
    else if(calls===2)evals.set(fen,{cp:-400,bestMove:'e7e5'});
    else evals.set(fen,{cp:-150,bestMove:'e7e5'});
  }
  return evals.get(fen);
};
let progressCalls=0;
await assert.rejects(
  scanGameForTrainingPuzzles(game,'HighTaxi',analyze,{
    signal:controller.signal,
    onProgress:info=>{progressCalls++;if(info.processed===1)controller.abort();}
  }),
  error=>error.name==='AbortError'&&Array.isArray(error.puzzles)&&error.puzzles.length===1
);
assert.ok(progressCalls>=1);
console.log('TRAINING ABORT PARTIAL-PUZZLE REGRESSION TEST OK');
