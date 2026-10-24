import assert from 'node:assert/strict';
import {parsePGN} from './pgn.js';
import {validateAnalysisTree,validateStoredGame,validateStoredGames} from './src/persistence/validation.js';

const pgn='[White "HighTaxi"]\n[Black "Opponent"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0';
const parsed=parsePGN(pgn)[0];
const clean=(n,parent=null)=>({move:n.move||null,san:n.san||null,fen:n.fen,annotations:[],comment:'',note:'',clock:null,nags:[],children:(n.children||[]).map(c=>clean(c,n))});
const good={id:'backup-game',pgn,analysisTree:clean(parsed.root)};

assert.equal(validateStoredGame(good),true);
assert.equal(validateStoredGames([good]),true);
assert.equal(validateAnalysisTree(good.analysisTree),true);

assert.throws(()=>validateStoredGame({...good,analysisTree:{...good.analysisTree,fen:'8/8/8/8/8/8/4K3/7k w - - 0 1',children:[]}}),/Racine d’analyse différente/);
assert.throws(()=>validateStoredGame({...good,analysisTree:{...good.analysisTree,children:[{...good.analysisTree.children[0],fen:good.analysisTree.fen}]}}),/FEN d’analyse incohérent/);
assert.throws(()=>validateStoredGame({...good,pgn:'not a valid pgn'}),/PGN/i);
console.log('PERSISTENCE VALIDATION TESTS OK');
