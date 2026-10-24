import assert from 'node:assert/strict';
import {openingLineUltraFast} from './pgn.js';

// White rook on e2 is pinned to the king on e1 by Black rook e8.
// "Ra2" is pseudo-legal but illegal because it exposes the white king.
const pgn='[SetUp "1"]\n[FEN "4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1"]\n[Result "*"]\n\n1. Ra2 *';
const line=openingLineUltraFast(pgn,4);
assert.equal(line.out.length,0,'openingLineUltraFast ne doit jamais accepter un coup pseudo-légal qui expose le roi');
console.log('PGN ULTRAFAST LEGALITY REGRESSION TEST OK');
