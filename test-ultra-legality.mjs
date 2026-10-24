import assert from 'node:assert/strict';
import {openingLineUltraFast} from './pgn.js';
const pgn='[SetUp "1"]\n[FEN "4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1"]\n[Result "*"]\n\n1. Ra2 *';
assert.equal(openingLineUltraFast(pgn,4).out.length,0);
const legal='[SetUp "1"]\n[FEN "4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1"]\n[Result "*"]\n\n1. Re3 *';
assert.equal(openingLineUltraFast(legal,4).out.length,1);
console.log('ULTRAFAST LEGALITY TEST OK');
