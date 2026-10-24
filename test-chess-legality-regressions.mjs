import assert from 'node:assert/strict';
import {Chess} from './chess.js';

{
  const c=new Chess('4k3/8/8/4P3/8/8/8/4K3 w - d6 0 1');
  assert.equal(c.isLegal('e5','d6'),false,'en-passant doit exiger un pion adverse sur la case capturée');
  assert.equal(c.legalMoves('e5').some(m=>m.to==='d6'),false);
}
{
  const c=new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  assert.equal(c.isLegal('e5','d6'),true,'un en-passant réellement disponible doit rester légal');
}
{
  const c=new Chess('r3k2r/8/8/8/8/8/8/2K4R w K - 0 1');
  assert.equal(c.isLegal('c1','g1'),false,'un roque doit partir de e1/e8');
  assert.equal(c.legalMoves('c1').some(m=>m.to==='g1'),false);
}
{
  const c=new Chess('r3k2r/8/8/8/8/8/8/4K2R w K - 0 1');
  assert.equal(c.isLegal('e1','g1'),true,'le roque légal doit rester disponible');
  assert.equal(c.san({from:'e1',to:'g1'}),'O-O');
}
console.log('CHESS LEGALITY REGRESSION TESTS OK');
