import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('./app.js','utf8');
const board=fs.readFileSync('./src/ui/board.js','utf8');
const moves=fs.readFileSync('./src/ui/moves.js','utf8');
assert.match(app,/src\/chess\/position\.js/);
assert.match(app,/src\/games\/tree\.js/);
assert.match(app,/(?:async )?function buildGlobalTree\(\)/);
assert.match(app,/src\/analysis\/stockfish\.js/);
assert.match(app,/src\/analysis\/arrows\.js/);
assert.match(app,/src\/persistence\/storage\.js/);
assert.match(app,/src\/training\/store\.js/);
assert.match(app,/src\/sync\/chesscom\.js/);
assert.match(app,/src\/app\/router\.js/);
assert.match(app,/src\/app\/state\.js/);
assert.doesNotMatch(app,/let allGames=/);
assert.doesNotMatch(app,/let activeGame=/);
assert.equal((app.match(/b\.dataset\.screen===id/g)||[]).length,1,'router screen update must not have a duplicate legacy block');
assert.match(app,/src\/app\/lifecycle\.js/);
assert.match(app,/src\/ui\/board\.js/);
assert.match(app,/src\/ui\/moves\.js/);
assert.doesNotMatch(app,/function positionKeyFromFen\(/);
assert.doesNotMatch(app,/function openingPrefixForGame\(/);
assert.doesNotMatch(app,/function mergeAnnotationCounts\(/);
assert.match(board,/createBoardRenderer/);
assert.match(moves,/createMoveNavigator/);
// The composition layer grew slightly only to host cancellation-safe async tree orchestration.
assert.ok(app.split('\n').length<=780,'app.js should stay below the conservative composition-layer ceiling'
);
console.log('APP ARCHITECTURE TESTS OK');

assert.match(app,/normalizeEngineEvaluation/);
assert.match(app,/cancelEngineAnalysis/);
