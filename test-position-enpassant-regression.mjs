import assert from 'node:assert/strict';
import {positionKeyFromFen} from './src/chess/position.js';

// White pawn e5 is pinned to the king e1 by the black rook e8.
// e5xd6 en-passant is therefore illegal; the EP target must not split the position key.
const withEp='4r1k1/8/8/3pP3/8/8/8/4K3 w - d6 0 2';
const withoutEp='4r1k1/8/8/3pP3/8/8/8/4K3 w - - 0 2';
assert.equal(positionKeyFromFen(withEp),positionKeyFromFen(withoutEp),'Un en-passant non capturable légalement ne doit pas créer une position distincte');
console.log('POSITION EN-PASSANT REGRESSION TEST OK');
