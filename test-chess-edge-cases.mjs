import assert from 'node:assert/strict';
import {Chess} from './chess.js';

// Legal en-passant removes the captured pawn.
let c=new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
assert.ok(c.isLegal('e5','d6'));
assert.equal(c.play({from:'e5',to:'d6'}).fen,'4k3/8/3P4/8/8/8/8/4K3 b - - 0 1');

// The same en-passant is illegal when the pawn is pinned to the king.
c=new Chess('4r1k1/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
assert.equal(c.isLegal('e5','d6'),false);

// Both castling sides are legal on an empty board with intact rooks/rights.
c=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
assert.ok(c.isLegal('e1','g1'));assert.ok(c.isLegal('e1','c1'));

// Promotion exposes all four promotion choices.
c=new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
assert.deepEqual(c.legalMoves('a7').map(m=>m.promotion),['q','r','b','n']);
assert.equal(c.play({from:'a7',to:'a8',promotion:'n'}).fen,'N3k3/8/8/8/8/8/8/4K3 b - - 0 1');

// Stalemate and checkmate are distinguished.
c=new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
assert.equal(c.status().stalemate,true);assert.equal(c.status().checkmate,false);
c=new Chess();
c.play({from:'f2',to:'f3'});c.play({from:'e7',to:'e5'});c.play({from:'g2',to:'g4'});c.play({from:'d8',to:'h4'});
assert.equal(c.status().checkmate,true);

// SAN disambiguation differentiates two legal same-type pieces.
c=new Chess('4k3/8/8/8/8/2N5/3N4/4K3 w - - 0 1');
assert.equal(c.san({from:'c3',to:'e4'}),'Nce4');
assert.equal(c.san({from:'d2',to:'e4'}),'Nde4');

console.log('CHESS EDGE CASE TESTS OK');
