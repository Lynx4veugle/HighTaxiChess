import assert from 'node:assert/strict';
import {Chess} from './chess.js';
const valid='8/8/8/8/8/8/4K3/4k3 w - - 0 1';
assert.doesNotThrow(()=>new Chess(valid));
for(const fen of [
  '8/8/8/8/8/8/4K3/4k3 w QQ - 0 1',
  '8/8/8/8/8/8/4K3/4k3 w - a1 0 1',
  '8/8/8/8/8/8/4K3/4k3 w - a3 0 1',
  '8/8/8/8/8/8/4K3/4k3 w - - -1 1',
  '8/8/8/8/8/8/4K3/4k3 w - - 0 0'
])assert.throws(()=>new Chess(fen),/FEN invalide/);
console.log('FEN VALIDATION TESTS OK');
