import assert from 'node:assert/strict';
import {createStockfishController} from './src/analysis/stockfish.js';

class FakeWorker{
  constructor(){this.messages=[];this.onmessage=null;this.onerror=null;this.terminated=false;}
  postMessage(message){this.messages.push(message);}
  terminate(){this.terminated=true;}
  emit(line){if(!this.terminated)this.onmessage?.({data:line});}
  fail(message='worker failed'){if(!this.terminated)this.onerror?.({message});}
}

const workers=[];
const controller=createStockfishController({workerFactory:()=>{const w=new FakeWorker();workers.push(w);return w},timeoutMs:200});
const ready=controller.ensureReady();
workers[0].emit('uciok');workers[0].emit('readyok');await ready;

const first=controller.analyze('fen-A');await Promise.resolve();
controller.cancel();
await assert.rejects(first,/cancelled/);
const second=controller.analyze('fen-B');
assert.equal(workers.length,2,'une annulation doit pouvoir repartir sur un Worker propre');
workers[1].emit('uciok');workers[1].emit('readyok');await Promise.resolve();
workers[0].emit('bestmove a2a4');
workers[1].emit('info depth 10 score cp 42 pv e2e4');
workers[1].emit('bestmove e2e4');
const result=await second;
assert.equal(result.bestMove,'e2e4');
assert.equal(result.depth,10);

const third=controller.analyze('fen-C');await Promise.resolve();
workers[1].fail('boom');
await assert.rejects(third,/boom/);
const fourth=controller.analyze('fen-D');
assert.equal(workers.length,3,'un Worker défaillant doit pouvoir être remplacé');
workers[2].emit('uciok');workers[2].emit('readyok');await Promise.resolve();workers[2].emit('bestmove d2d4');
assert.equal((await fourth).bestMove,'d2d4');
const fifth=controller.analyze('fen-E');await Promise.resolve();
const sixth=controller.analyze('fen-F');
workers[2].fail('boom-pending');
await assert.rejects(fifth,/boom-pending/);
await assert.rejects(sixth,/boom-pending/);

const seventh=controller.analyze('fen-G');
assert.equal(workers.length,4,'après une panne le prochain appel doit recréer un Worker');
workers[3].emit('uciok');workers[3].emit('readyok');await Promise.resolve();workers[3].emit('bestmove g2g4');
assert.equal((await seventh).bestMove,'g2g4');

await controller.dispose();
console.log('STOCKFISH CANCEL/WORKER RACE REGRESSION TESTS OK');
