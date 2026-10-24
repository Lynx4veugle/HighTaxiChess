import assert from 'node:assert/strict';
import {splitGames} from './pgn.js';

const source='[White "A"]\n[Black "B"]\n\n1. e4 (1. d4 d5 1-0) e5 1/2-1/2\n[White "C"]\n[Black "D"]\n\n1. e4 *';
const games=splitGames(source);
assert.equal(games.length,2,'un résultat situé dans une variante ne doit pas couper la partie');
assert.match(games[0],/1\/2-1\/2/);
assert.match(games[1],/\[White "C"\]/);

const trailingComments='[White "E"]\n[Black "F"]\n\n1. e4 e5 1-0\n{commentaire final}';
assert.equal(splitGames(trailingComments).length,1,'les commentaires après le résultat ne doivent pas créer une fausse partie');

const headerless='1. e4 e5 1-0\n1. d4 d5 *';
assert.equal(splitGames(headerless).length,2,'deux parties sans en-têtes doivent rester séparées après un résultat');

console.log('PGN SPLIT VARIATION REGRESSION TEST OK');
