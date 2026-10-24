import assert from 'node:assert/strict';
import { positionKeyFromFen, normalizeMove, sameMove } from './src/chess/position.js';
import { classifyAnnotations, mergeAnnotationCounts } from './src/analysis/classification.js';
import { buildArrowDescriptors } from './src/analysis/arrows.js';
import { createArrowRenderer } from './src/ui/arrows.js';
import { state, revisions } from './src/app/state.js';
import { mergeTrainingPuzzles, trainingGameFingerprint } from './src/training/store.js';

assert.equal(typeof positionKeyFromFen, 'function');
assert.equal(typeof normalizeMove, 'function');
assert.equal(typeof sameMove, 'function');
assert.equal(typeof classifyAnnotations, 'function');
assert.equal(typeof mergeAnnotationCounts, 'function');
assert.equal(typeof buildArrowDescriptors, 'function');
assert.equal(typeof createArrowRenderer, 'function');
assert.ok(state && revisions);
assert.equal(typeof mergeTrainingPuzzles, 'function');
assert.equal(typeof trainingGameFingerprint, 'function');
console.log('ARCHITECTURE MODULE TESTS OK');
