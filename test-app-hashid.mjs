import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hashId} from './src/sync/chesscom.js';

const app=fs.readFileSync('./app.js','utf8');
assert.match(app,/import \{[^}]*hashId[^}]*\} from "\.\/src\/sync\/chesscom\.js"/,'app.js doit importer hashId depuis le module de synchronisation');
assert.match(app,/hashId\(`Club\|\$\{canonicalPgn\}`\)/,'L’ajout d’une partie de club doit pouvoir générer son identifiant sans variable globale implicite');
assert.equal(hashId('Club|demo'),hashId('Club|demo'),'hashId doit rester déterministe');

console.log('APP HASH-ID TESTS OK');
