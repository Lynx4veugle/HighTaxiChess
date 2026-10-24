import assert from 'node:assert/strict';
import {trainingPuzzleKey} from './src/training/puzzles.js';
import {loadTrainingProgress} from './src/training/progress.js';

const a={gameId:'g1',fen:'8/8/8/8/8/8/4K3/7k w - - 0 12',type:'blunder',bestMove:'e2e3',playedMove:'e2e4'};
const b={...a,fen:'8/8/8/8/8/8/4K3/7k w - - 14 99'};
assert.equal(trainingPuzzleKey(a),trainingPuzzleKey(b),'un même FEN de position doit avoir une clé d’entraînement identique malgré les compteurs');
const storage={getItem(){return JSON.stringify({[`${a.gameId}|${a.fen}|${a.type}|${a.bestMove}|${a.playedMove}`]:{attempts:2,successes:1,solvedAt:123,lastAttemptAt:456}})}};
const progress=loadTrainingProgress(storage);
assert.equal(progress[trainingPuzzleKey(a)].attempts,2);
assert.equal(progress[trainingPuzzleKey(a)].successes,1);
assert.equal(progress[trainingPuzzleKey(a)].solvedAt,123);
console.log('TRAINING TRANSPOSITION KEY TEST OK');
