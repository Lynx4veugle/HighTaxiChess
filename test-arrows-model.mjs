import assert from 'node:assert/strict';
import {buildArrowDescriptors} from './src/analysis/arrows.js';
import {positionKeyFromFen} from './src/chess/position.js';

const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const key=positionKeyFromFen(fen);
const edge={san:'e4',move:{from:'e2',to:'e4',promotion:null},count:12,playedByUser:8,stats:{white:7,draw:2,black:3},annotations:{'!!':5,'!':4,'?':1,'??':1},classification:'blunder'};
const tree={nodes:new Map([[key,{fen,children:new Map([['e2-e4-',edge]])}]])};
const arrows=buildArrowDescriptors(key,tree,{sideFilter:'all',engineBest:{from:'e2',to:'e4'}});
assert.equal(arrows.length,1);
assert.equal(arrows[0].count,12);
assert.equal(arrows[0].userCount,8);
assert.equal(arrows[0].engineBest,true);
assert.equal(arrows[0].source,'database');
assert.equal(arrows[0].classification,'blunder');
assert.ok(Object.isFrozen(arrows));
assert.ok(Object.isFrozen(arrows[0]));
const uciArrows=buildArrowDescriptors(key,tree,{sideFilter:'all',engineBest:'e2e4'});
assert.equal(uciArrows.length,1,'un coup UCI Stockfish doit être transformé en flèche exploitable');
assert.deepEqual({from:uciArrows[0].from,to:uciArrows[0].to},{from:'e2',to:'e4'});
assert.equal(uciArrows[0].engineBest,true);
console.log('ARROW MODEL TESTS OK');

const manyEdges=new Map();
for(let i=0;i<13;i++){
  const file='abcdefgh'[i%8], rank=i<8?3:4;
  manyEdges.set(`e2-${file}${rank}-`,{san:`${file}${rank}`,move:{from:'e2',to:`${file}${rank}`,promotion:null},count:20-i,playedByUser:1,stats:{white:1,draw:0,black:0},annotations:{},classification:'neutral'});
}
const manyTree={nodes:new Map([[key,{fen,children:manyEdges}]])};
const engineOutsideTop=buildArrowDescriptors(key,manyTree,{sideFilter:'all',engineBest:{from:'e2',to:'h4'}});
assert.equal(engineOutsideTop.length,14);
assert.equal(engineOutsideTop[0].engineBest,true,'la flèche Stockfish doit rester prioritaire avant la limite d’affichage');
assert.equal(engineOutsideTop[0].to,'h4');

const existingMap=new Map(manyEdges);
existingMap.set('e2-d4-',{san:'d4',move:{from:'e2',to:'d4',promotion:null},count:1,playedByUser:1,stats:{white:1,draw:0,black:0},annotations:{},classification:'neutral'});
const existingEngine=buildArrowDescriptors(key,{nodes:new Map([[key,{fen,children:existingMap}]])},{sideFilter:'all',engineBest:{from:'e2',to:'d4'}});
assert.equal(existingEngine[0].engineBest,true,'un coup moteur déjà joué doit lui aussi être prioritaire');
assert.equal(existingEngine[0].to,'d4');
