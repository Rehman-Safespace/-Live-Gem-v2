import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyQuranPartSlot,
  estimateTokens,
  sanitizeTitleSlug,
  getNextVersionTag,
  formatTokensNumber,
} from './monadLogic';

test('classifyQuranPartSlot correctly identifies Q1 through Q10', () => {
  assert.deepEqual(classifyQuranPartSlot('quran_part_1.txt'), { slot: 'Q1', sortOrder: 1 });
  assert.deepEqual(classifyQuranPartSlot('QURAN-PART-05.pdf'), { slot: 'Q5', sortOrder: 5 });
  assert.deepEqual(classifyQuranPartSlot('الجزء_10_مكتوب.txt'), { slot: 'Q10', sortOrder: 10 });
  assert.deepEqual(classifyQuranPartSlot('MONAD_CORE_LEDGER_Q1_TO_Q10_IMMUTABLE.json'), { slot: 'LEDGER', sortOrder: 11 });
  assert.deepEqual(classifyQuranPartSlot('monad_kernel_middleware.py'), { slot: 'MIDDLEWARE', sortOrder: 12 });
  assert.deepEqual(classifyQuranPartSlot('random_notes.docx'), { slot: null, sortOrder: 99 });
});

test('estimateTokens calculates reasonable token values for Arabic and code', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('Hello'), 2);
  const arabicText = 'الشيخ جيمناي خريج ازهر نيوجيرسي ولقبي الرايق العميييق';
  const est = estimateTokens(arabicText);
  assert.ok(est > 10 && est < 30);
});

test('sanitizeTitleSlug handles Arabic, English, and symbols', () => {
  assert.equal(sanitizeTitleSlug('جلسة 1: تفكيك وتحليل!'), 'جلسة_1_تفكيك_وتحليل');
  assert.equal(sanitizeTitleSlug('Session #42 - Live Test'), 'Session_42_Live_Test');
  assert.equal(sanitizeTitleSlug(''), 'جلسة_الشيخ_جيمناي');
});

test('getNextVersionTag increments version numbers properly', () => {
  assert.equal(getNextVersionTag([]), 'v001');
  assert.equal(getNextVersionTag(['v001', 'v002']), 'v003');
  assert.equal(getNextVersionTag(['v001', 'v005', 'v002']), 'v006');
});

test('formatTokensNumber formats numbers with K and M suffix', () => {
  assert.equal(formatTokensNumber(500), '500');
  assert.equal(formatTokensNumber(1500), '1.5K');
  assert.equal(formatTokensNumber(4000000), '4M');
  assert.equal(formatTokensNumber(1048576), '1.05M');
});
