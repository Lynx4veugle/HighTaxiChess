import assert from 'node:assert/strict';
import {loadTrainingProgress,saveTrainingProgress,recordTrainingAttempt,isTrainingSolved,TRAINING_PROGRESS_KEY} from './src/training/progress.js';

const store=new Map();
const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
assert.deepEqual(loadTrainingProgress(storage),{});
let progress={};
let entry=recordTrainingAttempt(progress,'p1',false,1000);
assert.deepEqual(entry,{attempts:1,successes:0,solvedAt:0,lastAttemptAt:1000});
entry=recordTrainingAttempt(progress,'p1',true,2000);
assert.deepEqual(entry,{attempts:2,successes:1,solvedAt:2000,lastAttemptAt:2000});
assert.equal(isTrainingSolved(progress,'p1'),true);
assert.equal(saveTrainingProgress(progress,storage),true);
assert.ok(store.get(TRAINING_PROGRESS_KEY));
assert.deepEqual(loadTrainingProgress(storage),progress);
store.set(TRAINING_PROGRESS_KEY,'{bad json');
assert.deepEqual(loadTrainingProgress(storage),{});
console.log('TRAINING PROGRESS TESTS OK');
