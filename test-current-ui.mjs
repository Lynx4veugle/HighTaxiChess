import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('./app.js','utf8'), index=fs.readFileSync('./index.html','utf8'), pgn=fs.readFileSync('./pgn.js','utf8'), version=fs.readFileSync('./version.js','utf8'), sw=fs.readFileSync('./sw.js','utf8'), css=fs.readFileSync('./styles.css','utf8');
assert.match(version,/APP_VERSION="1\.0\.1"/);
for(const icon of ["!!","!","★","👍","✓","📖","?!","?","❌","??"]) assert.ok(app.includes(`icon:"${icon}"`),`Annotation absente: ${icon}`);
assert.match(pgn,/HighTaxi/); assert.match(pgn,/!!/); assert.match(pgn,/📖/); assert.match(pgn,/❌/);
assert.match(index,/id="analysisExportBtn"/); assert.match(index,/id="moveInsights"/); assert.match(index,/id="settingsPanel"/); assert.match(index,/id="settingsRebuild"/);
assert.match(app,/scheduleBackgroundPersist/); assert.match(app,/renderMovesList/); assert.match(app,/function renderSelectedMoveInsights/);
assert.match(index,/setting_autoEngine/); assert.match(index,/setting_showArrows/); assert.match(index,/setting_compactMoves/);
assert.match(sw,/v1\.0\.1/);
console.log('CURRENT-VERSION UI/ANNOTATION/PERFORMANCE TESTS OK');

assert.match(index,/id="trainingScanBtn"/);assert.match(index,/id="trainingForceScanBtn"/);assert.match(index,/id="trainingExportBtn"/);assert.match(app,/trainingController\.scan\(\)/);assert.match(app,/trainingController\.exportFile\(\)/);
assert.equal((app.match(/trainingController\.scan\(\)/g)||[]).length,1);assert.match(app,/trainingController\.scan\(\{force:true\}\)/);assert.equal((app.match(/trainingController\.stop\(\)/g)||[]).length,1);assert.equal((app.match(/trainingController\.exportFile\(\)/g)||[]).length,1);assert.equal((app.match(/trainingController\.clear\(\)/g)||[]).length,1);

const boardStart=app.indexOf('function boardSquares()');
const boardEnd=app.indexOf('function pieceSVG',boardStart);
const boardSquares=app.slice(boardStart,boardEnd);
if(boardSquares.includes('userSide(state.activeGame)'))throw new Error('le plateau ne doit pas tourner automatiquement selon la couleur');
if(!boardSquares.includes('const flip=boardRotated'))throw new Error('le bouton Rotation doit piloter seul l’orientation du plateau');

const openStart=app.indexOf("async function openGame(id)");
const openEnd=app.indexOf("let boardRotated=false;",openStart);
const openGame=app.slice(openStart,openEnd);
assert.doesNotMatch(openGame,/boardRotated=false/,'une partie ouverte ne doit pas réinitialiser une rotation manuelle');

assert.match(app,/loadTrainingPuzzles\(\)/);
assert.match(app,/loadTrainingScanState\(\)/);
assert.match(app,/mergeTrainingPuzzles/);
assert.match(app,/addEventListener\("pointerdown"/,'le plateau doit supporter le début d’un déplacement tactile');
assert.match(app,/addEventListener\("pointerup"/,'le plateau doit supporter la fin d’un déplacement tactile');
assert.match(css,/touch-action:none/,'le plateau doit capturer correctement les gestes tactiles sans scroll concurrent');
