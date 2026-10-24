import fs from 'node:fs';
import assert from 'node:assert/strict';

assert.ok(fs.existsSync('.nojekyll'),'.nojekyll doit être présent pour un hébergement GitHub Pages prévisible');
assert.ok(!fs.existsSync('functions'),'Aucune fonction Cloudflare ne doit être requise');
assert.ok(!fs.existsSync('_headers'),'Le fichier _headers Cloudflare ne doit pas être présenté comme actif sur GitHub Pages');
for(const file of ['index.html','app.js','styles.css','chess.js','pgn.js','db.js','version.js','piece-assets.js','sw.js','manifest.webmanifest','src/analysis/stockfish.js','src/analysis/arrows.js','src/games/tree.js','src/persistence/storage.js','src/sync/chesscom.js','src/app/router.js','src/app/lifecycle.js','src/training/puzzles.js','src/training/controller.js','src/training/progress.js','src/training/store.js']) assert.ok(fs.existsSync(file),`Fichier manquant: ${file}`);
for(const file of ['stockfish-18-lite-single.js','stockfish-18-lite-single.wasm']) assert.ok(fs.existsSync(file),`Stockfish local manquant: ${file}`);
for(const key of ['wP','wN','wB','wR','wQ','wK','bP','bN','bB','bR','bQ','bK']){const file=`${key}.png`;assert.ok(fs.existsSync(file),`Pièce manquante: ${file}`);assert.ok(fs.statSync(file).size>1000,`Pièce vide: ${file}`)}
const version=fs.readFileSync('version.js','utf8');assert.match(version,/APP_VERSION="1\.0\.1"/);
const app=fs.readFileSync('app.js','utf8');assert.doesNotMatch(app,/Cloudflare|\/api\/chesscom/i);assert.match(app,/CHESSCOM_BASE|SYNC_BASE/);
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));assert.equal(manifest.start_url,'./','GitHub Pages doit utiliser un start_url relatif au dépôt');assert.equal(manifest.scope,'./','Le scope PWA doit rester relatif au dépôt');for(const icon of manifest.icons||[])assert.ok(!String(icon.src).startsWith('/'),`Icône absolue incompatible avec un dépôt GitHub Pages: ${icon.src}`);
const sw=fs.readFileSync('sw.js','utf8');assert.ok(sw.includes('if(/^\\/api'),'Service Worker doit exclure /api');assert.match(fs.readFileSync('app.js','utf8'),/stockfish-18-lite-single\.wasm/);assert.doesNotMatch(fs.readFileSync('app.js','utf8'),/stockfish@18\.0\.8/);
console.log('GITHUB PAGES PACKAGE TESTS OK');

const assets=fs.readFileSync('piece-assets.js','utf8');
for(const key of ['wP','wN','wB','wR','wQ','wK','bP','bN','bB','bR','bQ','bK']) assert.match(assets,new RegExp(`${key}:\"data:image/png;base64,`),`Pièce embarquée manquante: ${key}`);
assert.match(app,/PIECE_DATA\[key\]/,'Les pièces doivent utiliser les assets embarqués avant le chemin relatif');
assert.match(app,/setTimeout\(\(\)=>buildGlobalTree\(\),0\)/,'La construction de l’arbre global ne doit pas bloquer le changement d’onglet');
console.log('CURRENT GITHUB PAGES PACKAGE TESTS OK');
