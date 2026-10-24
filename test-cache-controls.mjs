import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clearOpeningPrefixCache} from './src/games/tree.js';

const app=fs.readFileSync('./app.js','utf8');
assert.equal(typeof clearOpeningPrefixCache,'function','Le cache d’ouverture doit exposer une API explicite de nettoyage');
assert.match(app,/clearOpeningPrefixCache\(\)/,'Le bouton de nettoyage doit appeler l’API du module au lieu d’une variable implicite');
assert.doesNotMatch(app,/openingPrefixCache\.clear\(\)/,'app.js ne doit pas référencer un cache interne non importé');

console.log('CACHE CONTROL TESTS OK');
