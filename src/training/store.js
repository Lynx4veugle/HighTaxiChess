import {positionKeyFromFen} from '../chess/position.js';

export const TRAINING_PUZZLES_KEY='ht_training_puzzles_v1';
export const TRAINING_PUZZLES_SCHEMA_VERSION=2;
export const TRAINING_SCAN_STATE_KEY='ht_training_scan_state_v1';
export const TRAINING_SCAN_STATE_VERSION=1;

function hashText(text){
  let h=2166136261;
  const value=String(text??'');
  for(let i=0;i<value.length;i++){
    h^=value.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return (h>>>0).toString(16).padStart(8,'0');
}

export function trainingGameFingerprint(game,user=''){
  return `tgf-${hashText([
    game?.id||'',
    game?.source||'',
    game?.white||'',
    game?.black||'',
    game?.pgn||'',
    String(user||'').trim().toLowerCase()
  ].join('\u001f'))}`;
}

export function normalizeTrainingPositionKey(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  return positionKeyFromFen(raw);
}

function normalizeOccurrence(raw,positionKey){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const gameId=String(raw.gameId||'').trim();
  if(!gameId)return null;
  return {
    gameId,
    source:String(raw.source||'PGN'),
    type:String(raw.type||'').trim(),
    white:String(raw.white||'?'),
    black:String(raw.black||'?'),
    result:String(raw.result||'*'),
    date:String(raw.date||''),
    event:String(raw.event||''),
    moveNumber:Number(raw.moveNumber)||1,
    side:raw.side==='b'?'b':'w',
    playedSan:String(raw.playedSan||''),
    bestSan:String(raw.bestSan||''),
    playedMove:String(raw.playedMove||''),
    bestMove:String(raw.bestMove||''),
    bestPlayerCp:Number(raw.bestPlayerCp)||0,
    playedPlayerCp:Number(raw.playedPlayerCp)||0,
    lossCp:Number(raw.lossCp)||0,
    fen:String(raw.fen||positionKey),
    afterBestFen:String(raw.afterBestFen||positionKey),
    createdAt:Number(raw.createdAt)||Date.now()
  };
}

export function trainingOccurrenceKey(occurrence){
  return [
    String(occurrence?.gameId||''),
    normalizeTrainingPositionKey(occurrence?.positionKey||occurrence?.fen||''),
    String(occurrence?.type||''),
    String(occurrence?.bestMove||''),
    String(occurrence?.playedMove||'')
  ].join('|');
}

function representativeFromOccurrences(positionKey,occurrences,raw={}){
  const first=occurrences[0]||{};
  return {
    id:`training-position:${positionKey}`,
    positionKey,
    fen:String(raw.fen||first.fen||positionKey),
    type:String(raw.type||first.type||''),
    source:String(raw.source||first.source||'PGN'),
    white:String(raw.white||first.white||'?'),
    black:String(raw.black||first.black||'?'),
    result:String(raw.result||first.result||'*'),
    date:String(raw.date||first.date||''),
    event:String(raw.event||first.event||''),
    moveNumber:Number(raw.moveNumber||first.moveNumber||1),
    side:raw.side==='b'||first.side==='b'?'b':'w',
    playedSan:String(raw.playedSan||first.playedSan||''),
    bestSan:String(raw.bestSan||first.bestSan||''),
    playedMove:String(raw.playedMove||first.playedMove||''),
    bestMove:String(raw.bestMove||first.bestMove||''),
    bestPlayerCp:Number(raw.bestPlayerCp??first.bestPlayerCp)||0,
    playedPlayerCp:Number(raw.playedPlayerCp??first.playedPlayerCp)||0,
    lossCp:Number(raw.lossCp??first.lossCp)||0,
    afterBestFen:String(raw.afterBestFen||first.afterBestFen||positionKey),
    createdAt:Math.min(...occurrences.map(o=>Number(o.createdAt)||Date.now())),
    occurrences
  };
}

export function normalizeTrainingPuzzle(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const positionKey=normalizeTrainingPositionKey(raw.positionKey||raw.fen||'');
  if(!positionKey)return null;
  const sourceOccurrences=Array.isArray(raw.occurrences)&&raw.occurrences.length
    ? raw.occurrences
    : [raw];
  const occurrences=[];
  const seen=new Set();
  for(const candidate of sourceOccurrences){
    const occurrence=normalizeOccurrence({...raw,...candidate},positionKey);
    if(!occurrence||!occurrence.type||!occurrence.bestMove||!occurrence.playedMove)continue;
    const key=trainingOccurrenceKey(occurrence);
    if(seen.has(key))continue;
    seen.add(key);occurrences.push(occurrence);
  }
  if(!occurrences.length)return null;
  const result=representativeFromOccurrences(positionKey,occurrences,raw);
  result.occurrenceCount=occurrences.length;
  return result;
}

export function mergeTrainingPuzzles(existing=[],found=[]){
  const merged=new Map();
  for(const raw of Array.isArray(existing)?existing:[]){
    const puzzle=normalizeTrainingPuzzle(raw);
    if(puzzle)merged.set(puzzle.positionKey,puzzle);
  }
  for(const raw of Array.isArray(found)?found:[]){
    const incoming=normalizeTrainingPuzzle(raw);
    if(!incoming)continue;
    const current=merged.get(incoming.positionKey);
    if(!current){merged.set(incoming.positionKey,incoming);continue;}
    const occurrences=[...(current.occurrences||[]),...(incoming.occurrences||[])];
    const unique=[];const seen=new Set();
    for(const occurrence of occurrences){
      const key=trainingOccurrenceKey(occurrence);
      if(seen.has(key))continue;
      seen.add(key);unique.push(occurrence);
    }
    merged.set(incoming.positionKey,{
      ...current,
      occurrences:unique,
      occurrenceCount:unique.length
    });
  }
  return [...merged.values()];
}

export function loadTrainingPuzzles(storage=globalThis.localStorage){
  try{
    const raw=storage?.getItem(TRAINING_PUZZLES_KEY);
    if(!raw)return [];
    const data=JSON.parse(raw);
    const legacy=Array.isArray(data)?data:(data&&Array.isArray(data.puzzles)?data.puzzles:[]);
    const puzzles=mergeTrainingPuzzles([],legacy);
    const needsMigration=Array.isArray(data)||Number(data?.version||0)!==TRAINING_PUZZLES_SCHEMA_VERSION;
    if(needsMigration&&typeof storage?.setItem==='function')saveTrainingPuzzles(puzzles,storage);
    return puzzles;
  }catch(error){console.warn('Training puzzle data invalid',error);return []}
}

export function saveTrainingPuzzles(puzzles=[],storage=globalThis.localStorage){
  try{
    const normalized=mergeTrainingPuzzles([],puzzles);
    storage?.setItem(TRAINING_PUZZLES_KEY,JSON.stringify({version:TRAINING_PUZZLES_SCHEMA_VERSION,puzzles:normalized}));
    return true;
  }catch(error){console.warn('Training puzzle save failed',error);return false}
}

export function loadTrainingScanState(storage=globalThis.localStorage){
  try{
    const raw=storage?.getItem(TRAINING_SCAN_STATE_KEY);
    if(!raw)return {};
    const data=JSON.parse(raw);
    const source=data&&typeof data==='object'&&!Array.isArray(data)?(data.games&&typeof data.games==='object'?data.games:data):{};
    const out={};
    for(const [id,value] of Object.entries(source)){
      if(!id||!value||typeof value!=='object')continue;
      const fingerprint=String(value.fingerprint||'');
      const status=String(value.status||'analyzed');
      if(!fingerprint)continue;
      out[id]={fingerprint,status,analyzedAt:Number(value.analyzedAt)||0};
    }
    return out;
  }catch(error){console.warn('Training scan state invalid',error);return {}}
}

export function saveTrainingScanState(scanState={},storage=globalThis.localStorage){
  try{
    const out={};
    for(const [id,value] of Object.entries(scanState||{})){
      if(!id||!value?.fingerprint)continue;
      out[id]={fingerprint:String(value.fingerprint),status:String(value.status||'analyzed'),analyzedAt:Number(value.analyzedAt)||0};
    }
    storage?.setItem(TRAINING_SCAN_STATE_KEY,JSON.stringify({version:TRAINING_SCAN_STATE_VERSION,games:out}));
    return true;
  }catch(error){console.warn('Training scan state save failed',error);return false}
}

export function isTrainingGameScanned(scanState,game,user=''){
  const id=String(game?.id||'').trim();
  if(!id)return false;
  const entry=scanState?.[id];
  return !!entry&&entry.status==='analyzed'&&entry.fingerprint===trainingGameFingerprint(game,user);
}

export function markTrainingGameScanned(scanState,game,user='',status='analyzed'){
  const id=String(game?.id||'').trim();
  if(!id)return scanState||{};
  const out=scanState&&typeof scanState==='object'&&!Array.isArray(scanState)?scanState:{};
  out[id]={fingerprint:trainingGameFingerprint(game,user),status,analyzedAt:Date.now()};
  return out;
}
