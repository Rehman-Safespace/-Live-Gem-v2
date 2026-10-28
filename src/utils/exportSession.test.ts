import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSessionJson,
  generateSessionText,
  generateSessionMarkdown,
  buildExportFilename,
  ExportSessionPayload,
} from './exportSession';

const mockPayload: ExportSessionPayload = {
  sessionId: 'sess_123456789',
  title: 'تحليل المنظومة التقنية',
  versionTag: 'v002',
  createdAt: '2026-10-28T10:00:00.000Z',
  updatedAt: '2026-10-28T11:00:00.000Z',
  exportedAt: '2026-10-28T11:05:00.000Z',
  personaTitle: 'الشيخ جيمناي',
  personaDomain: 'تفكيك الأنظمة المعقدة',
  llmModel: 'gemini-4-argon',
  voiceName: 'Sadaltager',
  voiceState: 'raayeq_ameeq',
  strictMonad: true,
  tokenSummary: {
    totalPrompt: 1200,
    totalOutput: 800,
    totalThinking: 450,
  },
  boundDriveFiles: [
    { id: 'f1', name: 'quran_part_1.txt', mimeType: 'text/plain', slot: 'Q1' },
  ],
  turns: [
    {
      turnIndex: 1,
      timestamp: '11:01 AM',
      inputModality: 'text',
      userInput: 'اشرح لي مبدأ السيادة في بروتوكول MONAD',
      thinkingTrace: 'تحليل السؤال: يبحث عن مبدأ السيادة واستقلال النواة...',
      modelOutput: 'يا مرحب يا صديقي.. مبدأ السيادة هنا معناه إن البيانات والنواة مستقلة تماماً.',
      modelUsed: 'gemini-4-argon',
      tokensUsed: { prompt: 150, output: 220, thinking: 90 },
    },
    {
      turnIndex: 2,
      timestamp: '11:03 AM',
      inputModality: 'voice_dictation',
      userInput: 'وكيف يتم ربط ملفات الدرايف العشرة؟',
      modelOutput: 'يتم الربط عبر مصفوفة Q1 إلى Q10 المباشرة.',
      modelUsed: 'gemini-4-argon',
    },
  ],
};

test('generateSessionJson generates valid, parsed JSON with full structure', () => {
  const jsonStr = generateSessionJson(mockPayload);
  assert.ok(jsonStr.length > 50);

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.schemaVersion, '1.0.0');
  assert.equal(parsed.sessionMetadata.sessionId, 'sess_123456789');
  assert.equal(parsed.sessionMetadata.title, 'تحليل المنظومة التقنية');
  assert.equal(parsed.sessionMetadata.versionTag, 'v002');
  assert.equal(parsed.sessionMetadata.persona.title, 'الشيخ جيمناي');
  assert.equal(parsed.sessionMetadata.tokenSummary.totalPromptTokens, 1200);
  assert.equal(parsed.statistics.totalTurns, 2);
  assert.equal(parsed.statistics.hasThinkingTraces, true);
  assert.equal(parsed.turns.length, 2);
  assert.equal(parsed.turns[0].turnIndex, 1);
  assert.equal(parsed.turns[0].userInput, 'اشرح لي مبدأ السيادة في بروتوكول MONAD');
  assert.ok(parsed.turns[0].thinkingTrace.includes('تحليل السؤال'));
  assert.equal(parsed.turns[1].turnIndex, 2);
  assert.equal(parsed.turns[1].thinkingTrace, null);
});

test('generateSessionJson handles empty turns safely', () => {
  const emptyPayload: ExportSessionPayload = {
    sessionId: 'empty_sess',
    title: 'جلسة جديدة',
    versionTag: 'v001',
    turns: [],
  };
  const jsonStr = generateSessionJson(emptyPayload);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.turns.length, 0);
  assert.equal(parsed.statistics.totalTurns, 0);
  assert.equal(parsed.statistics.hasThinkingTraces, false);
});

test('generateSessionText produces formatted, readable text transcript', () => {
  const textStr = generateSessionText(mockPayload);
  assert.ok(textStr.includes('سجل جلسة محادثة - Gemini Studio & MONAD Sovereign Kernel'));
  assert.ok(textStr.includes('عنوان الجلسة: تحليل المنظومة التقنية'));
  assert.ok(textStr.includes('رمز الإصدار: v002'));
  assert.ok(textStr.includes('الدور رقم [1]'));
  assert.ok(textStr.includes('👤 [المستخدم / User]:'));
  assert.ok(textStr.includes('اشرح لي مبدأ السيادة في بروتوكول MONAD'));
  assert.ok(textStr.includes('💭 [سلسلة التفكير / Thinking Process]:'));
  assert.ok(textStr.includes('🧠 [رد النموذج / Model Response]:'));
  assert.ok(textStr.includes('الدور رقم [2]'));
  assert.ok(textStr.includes('وكيف يتم ربط ملفات الدرايف العشرة؟'));
  assert.ok(textStr.includes('نهاية سجل الجلسة (2 دور)'));
});

test('generateSessionMarkdown creates Markdown tables and details', () => {
  const mdStr = generateSessionMarkdown(mockPayload);
  assert.ok(mdStr.includes('# تحليل المنظومة التقنية'));
  assert.ok(mdStr.includes('| **رمز الإصدار** | `v002` |'));
  assert.ok(mdStr.includes('### 🔹 الدور #1'));
  assert.ok(mdStr.includes('<summary>💭 <b>سلسلة التفكير (Thinking Trace)</b></summary>'));
  assert.ok(mdStr.includes('#### 🧠 رد النموذج'));
});

test('buildExportFilename creates clean, predictable filenames for various formats', () => {
  const jsonName = buildExportFilename('جلسة 1: تحليل معمق!', 'v001', 'json', '2026-10-28T12:00:00Z');
  assert.equal(jsonName, 'جلسة_1_تحليل_معمق_v001_2026-10-28.json');

  const txtName = buildExportFilename('My Session', 'v003', 'txt', '2026-10-28T12:00:00Z');
  assert.equal(txtName, 'My_Session_v003_2026-10-28.txt');

  const mdName = buildExportFilename('', 'v005', 'md', '2026-10-28T12:00:00Z');
  assert.equal(mdName, 'جلسة_الشيخ_جيمناي_v005_2026-10-28.md');
});
