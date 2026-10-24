import {positionKeyFromFen} from '../chess/position.js';

export const TRAINING_PROGRESS_KEY='ht_training_progress_v1';

function normalizeEntry(value){
  const attempts=Math.max(0,Number(value?.attempts)||0);
  const successes=Math.max(0,Number(value?.successes)||0);
  const solvedAt=Number(value?.solvedAt)||0;
  const lastAttemptAt=Number(value?.lastAttemptAt)||0;
  return {attempts,successes,solvedAt,lastAttemptAt};
}

export function normalizeTrainingProgressKey(key){
  const raw=String(key||'').trim();
  if(!raw)return '';
  if(raw.includes('|')){
    const parts=raw.split('|');
    if(parts.length>=2){
      const positionKey=positionKeyFromFen(parts[1]);
      if(positionKey)return positionKey;
    }
  }
  return positionKeyFromFen(raw);
}

export function loadTrainingProgress(storage=globalThis.localStorage){
  try{
    const raw=storage?.getItem(TRAINING_PROGRESS_KEY);
    const data=raw?JSON.parse(raw):{};
    if(!data||typeof data!=='object'||Array.isArray(data))return {};
    const out={};
    for(const [rawKey,value] of Object.entries(data)){
      const key=normalizeTrainingProgressKey(rawKey);
      if(!key)continue;
      const next=normalizeEntry(value),previous=out[key];
      if(!previous){out[key]=next;continue}
      out[key]={
        attempts:previous.attempts+next.attempts,
        successes:previous.successes+next.successes,
        solvedAt:Math.max(previous.solvedAt,next.solvedAt),
        lastAttemptAt:Math.max(previous.lastAttemptAt,next.lastAttemptAt)
      };
    }
    const originalKeys=Object.keys(data);
    const migrated=originalKeys.some(key=>key!==normalizeTrainingProgressKey(key));
    if(migrated&&typeof storage?.setItem==='function')saveTrainingProgress(out,storage);
    return out;
  }catch(error){console.warn('Training progress data invalid',error);return {}}
}

export function saveTrainingProgress(progress,storage=globalThis.localStorage){
  try{
    const out={};
    for(const [rawKey,value] of Object.entries(progress&&typeof progress==='object'?progress:{})){
      const key=normalizeTrainingProgressKey(rawKey);
      if(!key)continue;
      const next=normalizeEntry(value),previous=out[key];
      out[key]=previous?{
        attempts:previous.attempts+next.attempts,
        successes:previous.successes+next.successes,
        solvedAt:Math.max(previous.solvedAt,next.solvedAt),
        lastAttemptAt:Math.max(previous.lastAttemptAt,next.lastAttemptAt)
      }:next;
    }
    storage?.setItem(TRAINING_PROGRESS_KEY,JSON.stringify(out));
    return true;
  }catch(error){console.warn('Training progress save failed',error);return false}
}

export function recordTrainingAttempt(progress,key,success,now=Date.now()){
  const map=progress&&typeof progress==='object'?progress:{};
  const positionKey=normalizeTrainingProgressKey(key);
  if(!positionKey)throw new Error('Training position key required');
  const previous=normalizeEntry(map[positionKey]);
  const next={
    attempts:previous.attempts+1,
    successes:previous.successes+(success?1:0),
    solvedAt:success?(previous.solvedAt||now):previous.solvedAt,
    lastAttemptAt:now
  };
  map[positionKey]=next;
  return next;
}

export function isTrainingSolved(progress,key){
  const positionKey=normalizeTrainingProgressKey(key);
  return !!positionKey&&Number(progress?.[positionKey]?.solvedAt||0)>0;
}
