import assert from 'node:assert/strict';
import {trainingPuzzleKey} from './src/training/puzzles.js';
import {recordTrainingAttempt,isTrainingSolved,loadTrainingProgress,saveTrainingProgress} from './src/training/progress.js';
import {mergeTrainingPuzzles,loadTrainingPuzzles,saveTrainingPuzzles,loadTrainingScanState,saveTrainingScanState,trainingGameFingerprint,isTrainingGameScanned,markTrainingGameScanned} from './src/training/store.js';
import {createTrainingController} from './src/training/controller.js';

const store=new Map();
const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value))};
globalThis.localStorage=storage;
globalThis.document={body:{classList:{contains:()=>false}},getElementById:()=>null};
const fen='8/8/8/8/8/8/4K3/7k w - -';
const fullFen=`${fen} 0 12`;
const base={fen:fullFen,type:'blunder',gameId:'g1',white:'HighTaxi',black:'A',result:'0-1',bestMove:'e2e3',playedMove:'e2e4',bestSan:'Ke3',playedSan:'Ke4',source:'Chess.com'};
const samePositionOtherGame={...base,gameId:'g2',black:'B',playedMove:'e2e1'};

let puzzles=mergeTrainingPuzzles([],[
  {...base,gameId:'g1'},
  {...base,gameId:'g2'},
  {...base,gameId:'g3'}
]);
assert.equal(puzzles.length,1,'une FEN doit créer un seul exercice logique');
assert.equal(puzzles[0].occurrences.length,3,'les occurrences doivent être conservées');
assert.equal(trainingPuzzleKey(puzzles[0]),fen);
assert.equal(puzzles[0].fen,fullFen,'le puzzle doit conserver le FEN de position pour l’export et l’historique');
assert.notEqual(puzzles[0].positionKey,puzzles[0].fen,'la clé d’identité doit être séparée du FEN complet');

const reloadFens=['8/8/8/8/8/8/4K3/7k w - - 0 1','8/8/8/8/8/8/3K4/7k w - - 0 1','8/8/8/8/8/8/2K5/7k w - - 0 1','8/8/8/8/8/8/1K6/7k w - - 0 1','8/8/8/8/8/8/K7/7k w - - 0 1'];
const reloadPuzzles=reloadFens.map((fen,i)=>({...base,gameId:`reload-${i+1}`,fen}));
saveTrainingPuzzles(reloadPuzzles,storage);
let restored=loadTrainingPuzzles(storage);
assert.equal(restored.length,5,'cinq exercices doivent survivre à la sérialisation/reload');

let progress={};
recordTrainingAttempt(progress,trainingPuzzleKey(restored[0]),false,1000);
recordTrainingAttempt(progress,trainingPuzzleKey(restored[1]),false,1001);
saveTrainingProgress(progress,storage);
const progressAfterFailureReload=loadTrainingProgress(storage);
assert.equal(progressAfterFailureReload[trainingPuzzleKey(restored[0])].attempts,1,'une tentative échouée doit survivre au reload');
assert.equal(isTrainingSolved(progressAfterFailureReload,trainingPuzzleKey(restored[0])),false);
recordTrainingAttempt(progress,trainingPuzzleKey(restored[0]),true,2000);
recordTrainingAttempt(progress,trainingPuzzleKey(restored[1]),true,2001);
saveTrainingProgress(progress,storage);
progress=loadTrainingProgress(storage);
assert.equal(isTrainingSolved(progress,trainingPuzzleKey(restored[0])),true);
assert.equal(isTrainingSolved(progress,trainingPuzzleKey(restored[1])),true);
assert.equal(restored.filter(p=>!isTrainingSolved(progress,trainingPuzzleKey(p))).length,3,'cinq exercices, deux résolus => trois actifs');

// Legacy V1 progress migrates from gameId|position|type|best|played to the global position key.
store.set('ht_training_progress_v1',JSON.stringify({
  [`gA|${fen}|blunder|e2e3|e2e4`]:{attempts:2,successes:0,solvedAt:0,lastAttemptAt:50},
  [`gB|${fen}|missedWin|e2e3|e2e4`]:{attempts:1,successes:1,solvedAt:99,lastAttemptAt:99}
}));
progress=loadTrainingProgress(storage);
assert.deepEqual(progress[fen],{attempts:3,successes:1,solvedAt:99,lastAttemptAt:99});
assert.equal(isTrainingSolved(progress,fen),true);

// Scan state lifecycle: new -> scanned -> unchanged -> modified.
const game={id:'scan-1',source:'Chess.com',white:'HighTaxi',black:'X',pgn:'PGN A'};
let scanState=loadTrainingScanState(storage);
assert.equal(isTrainingGameScanned(scanState,game,'HighTaxi'),false);
markTrainingGameScanned(scanState,game,'HighTaxi');
saveTrainingScanState(scanState,storage);
scanState=loadTrainingScanState(storage);
assert.equal(isTrainingGameScanned(scanState,game,'HighTaxi'),true);
assert.notEqual(trainingGameFingerprint(game,'HighTaxi'),trainingGameFingerprint({...game,pgn:'PGN B'},'HighTaxi'));
assert.equal(isTrainingGameScanned(scanState,{...game,pgn:'PGN B'},'HighTaxi'),false);

// Exact controller incremental behavior: 100 analyzed -> +3 new -> modification -> forced rescan.
const makeGame=id=>({id,source:'Chess.com',white:'HighTaxi',black:`Opp-${id}`,pgn:id});
const allGames=[...Array(100)].map((_,i)=>makeGame(`g${i}`));
let analyzed=[];
const state={trainingPuzzles:[],trainingProgress:{},trainingScanState:{},trainingScanActive:false};
const controller=createTrainingController({
  state,
  getGames:()=>allGames,
  currentUser:()=> 'HighTaxi',
  analyzeFen:async()=>({cp:0,bestMove:'e2e4'}),
  cancelEngineAnalysis:()=>{},
  render:()=>{},
  toast:()=>{},
  onPositionChanged:()=>{},
  scanGame:async(game)=>{analyzed.push(game.id);return [{...base,gameId:game.id,fen:game.id==='g0'?fen:`8/8/8/8/8/8/4K3/7k w - - 0 ${analyzed.length}`}]}
});
await controller.scan();
assert.equal(analyzed.length,100);
assert.equal(Object.keys(state.trainingScanState).length,100);
await controller.scan();
assert.equal(analyzed.length,100,'un second scan sans modification ne doit analyser aucune partie');
allGames.push(makeGame('g100'),makeGame('g101'),makeGame('g102'));
await controller.scan();
assert.equal(analyzed.length,103,'trois nouvelles parties doivent être analysées');
allGames[0].pgn='g0-modified';
await controller.scan();
assert.equal(analyzed.filter(id=>id==='g0').length,2,'une partie modifiée doit être réanalysée');
await controller.scan({force:true});
assert.equal(analyzed.length,207,'un rescan forcé doit analyser les 103 parties');
state.trainingProgress={};
recordTrainingAttempt(state.trainingProgress,trainingPuzzleKey(state.trainingPuzzles[0]),true,500);
saveTrainingProgress(state.trainingProgress,storage);
const solvedKey=trainingPuzzleKey(state.trainingPuzzles[0]);
assert.equal(isTrainingSolved(state.trainingProgress,solvedKey),true);
const mergedAgain=mergeTrainingPuzzles(state.trainingPuzzles,[{...base,gameId:'new-occurrence',fen:fullFen}]);
assert.equal(mergedAgain.filter(p=>trainingPuzzleKey(p)===solvedKey).length,1,'une nouvelle occurrence ne doit pas créer un second exercice');
assert.equal(isTrainingSolved(state.trainingProgress,solvedKey),true,'la nouvelle occurrence reste maîtrisée par sa position');

console.log('TRAINING PERSISTENCE V2 TESTS OK');
