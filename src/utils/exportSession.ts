/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sanitizeTitleSlug } from './monadLogic';

export interface ExportTurnData {
  turnIndex: number;
  timestamp: string;
  inputModality?: string;
  userInput: string;
  thinkingTrace?: string;
  modelOutput: string;
  modelUsed?: string;
  voiceNameUsed?: string;
  voiceStateUsed?: string;
  tokensUsed?: {
    prompt: number;
    output: number;
    thinking?: number;
    officialServerCount?: boolean;
  };
}

export interface ExportSessionPayload {
  sessionId: string;
  title: string;
  versionTag: string;
  createdAt?: string;
  updatedAt?: string;
  exportedAt?: string;
  personaTitle?: string;
  personaDomain?: string;
  llmModel?: string;
  voiceName?: string;
  voiceState?: string;
  strictMonad?: boolean;
  tokenSummary?: {
    totalPrompt?: number;
    totalOutput?: number;
    totalThinking?: number;
  };
  boundDriveFiles?: Array<{
    id: string;
    name: string;
    mimeType?: string;
    slot?: string | null;
  }>;
  turns: ExportTurnData[];
}

/**
 * Generates formatted, structured JSON string representing the session and turn history.
 */
export function generateSessionJson(payload: ExportSessionPayload): string {
  const normalizedPayload = {
    schemaVersion: '1.0.0',
    exportOrigin: 'Gemini Studio & MONAD Sovereign Kernel',
    exportedAt: payload.exportedAt || new Date().toISOString(),
    sessionMetadata: {
      sessionId: payload.sessionId,
      title: payload.title || 'جلسة_بدون_عنوان',
      versionTag: payload.versionTag || 'v001',
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: payload.updatedAt || new Date().toISOString(),
      llmModel: payload.llmModel || 'gemini-4-argon',
      persona: {
        title: payload.personaTitle || 'الشيخ جيمناي',
        domain: payload.personaDomain || 'تفكيك ومحاكمة ونمذجة الأنظمة والمعرفة',
        strictMonadLock: Boolean(payload.strictMonad),
      },
      voice: {
        name: payload.voiceName || 'Sadaltager',
        state: payload.voiceState || 'raayeq_ameeq',
      },
      tokenSummary: {
        totalPromptTokens: payload.tokenSummary?.totalPrompt ?? 0,
        totalOutputTokens: payload.tokenSummary?.totalOutput ?? 0,
        totalThinkingTokens: payload.tokenSummary?.totalThinking ?? 0,
      },
      boundDriveFiles: payload.boundDriveFiles || [],
    },
    statistics: {
      totalTurns: payload.turns.length,
      hasThinkingTraces: payload.turns.some(t => Boolean(t.thinkingTrace)),
    },
    turns: payload.turns.map((turn, index) => ({
      turnIndex: turn.turnIndex || index + 1,
      timestamp: turn.timestamp,
      inputModality: turn.inputModality || 'text',
      userInput: turn.userInput,
      thinkingTrace: turn.thinkingTrace || null,
      modelOutput: turn.modelOutput,
      modelUsed: turn.modelUsed || payload.llmModel || 'gemini-4-argon',
      voiceUsed: turn.voiceNameUsed || payload.voiceName || 'Sadaltager',
      voiceStateUsed: turn.voiceStateUsed || payload.voiceState || 'raayeq_ameeq',
      tokensUsed: turn.tokensUsed || null,
    })),
  };

  return JSON.stringify(normalizedPayload, null, 2);
}

/**
 * Generates clean, human-readable structured plain text transcript.
 */
export function generateSessionText(payload: ExportSessionPayload): string {
  const exportTime = payload.exportedAt || new Date().toISOString();
  const divider = '================================================================================';
  const subDivider = '--------------------------------------------------------------------------------';

  const lines: string[] = [];

  // Header
  lines.push(divider);
  lines.push(`سجل جلسة محادثة - Gemini Studio & MONAD Sovereign Kernel`);
  lines.push(divider);
  lines.push(`عنوان الجلسة: ${payload.title || 'جلسة بدون عنوان'}`);
  lines.push(`رمز الإصدار: ${payload.versionTag || 'v001'}`);
  lines.push(`معرف الجلسة: ${payload.sessionId}`);
  lines.push(`تاريخ الإنشاء: ${payload.createdAt || 'غير محدد'}`);
  lines.push(`تاريخ التصدير: ${exportTime}`);
  lines.push(`النموذج المستخدم: ${payload.llmModel || 'gemini-4-argon'}`);
  lines.push(`البيرسونا: ${payload.personaTitle || 'الشيخ جيمناي'} (${payload.personaDomain || 'تحليل ونمذجة'})`);
  lines.push(`الصوت والتون: ${payload.voiceName || 'Sadaltager'} [${payload.voiceState || 'الرايق العميق'}]`);
  lines.push(`قفل موناد الصارم: ${payload.strictMonad ? 'مفعّل (Strict Lock)' : 'معطل'}`);
  lines.push(`إجمالي عدد الأدوار: ${payload.turns.length}`);

  if (payload.tokenSummary) {
    lines.push(
      `استهلاك التوكنز: إدخال (${payload.tokenSummary.totalPrompt || 0}) | إخراج (${payload.tokenSummary.totalOutput || 0}) | تفكير (${payload.tokenSummary.totalThinking || 0})`
    );
  }

  if (payload.boundDriveFiles && payload.boundDriveFiles.length > 0) {
    lines.push(`الملفات المرتبطة من Google Drive (${payload.boundDriveFiles.length}):`);
    payload.boundDriveFiles.forEach(f => {
      lines.push(`  • [${f.slot || 'FILE'}] ${f.name} (${f.mimeType || 'unknown'})`);
    });
  }

  lines.push(divider);
  lines.push('');

  // Turns
  if (payload.turns.length === 0) {
    lines.push('(لا توجد رسائل مسجلة في هذه الجلسة بعد)');
  } else {
    payload.turns.forEach((turn, idx) => {
      const turnNum = turn.turnIndex || idx + 1;
      lines.push(subDivider);
      lines.push(`الدور رقم [${turnNum}] | التوقيت: ${turn.timestamp} | نوع المدخل: ${turn.inputModality || 'نصي'}`);
      if (turn.modelUsed) {
        lines.push(`النموذج: ${turn.modelUsed}`);
      }
      lines.push(subDivider);
      lines.push('');

      lines.push(`👤 [المستخدم / User]:`);
      lines.push(turn.userInput.trim());
      lines.push('');

      if (turn.thinkingTrace && turn.thinkingTrace.trim()) {
        lines.push(`💭 [سلسلة التفكير / Thinking Process]:`);
        const indentedThinking = turn.thinkingTrace
          .trim()
          .split('\n')
          .map(l => `  > ${l}`)
          .join('\n');
        lines.push(indentedThinking);
        lines.push('');
      }

      lines.push(`🧠 [رد النموذج / Model Response]:`);
      lines.push(turn.modelOutput.trim());
      lines.push('');

      if (turn.tokensUsed) {
        lines.push(
          `[إحصاء التوكنز للدور: إدخال ${turn.tokensUsed.prompt} | إخراج ${turn.tokensUsed.output}${
            turn.tokensUsed.thinking ? ` | تفكير ${turn.tokensUsed.thinking}` : ''
          }]`
        );
        lines.push('');
      }
    });
  }

  lines.push(divider);
  lines.push(`نهاية سجل الجلسة (${payload.turns.length} دور)`);
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Generates structured Markdown (.md) representation of the session.
 */
export function generateSessionMarkdown(payload: ExportSessionPayload): string {
  const exportTime = payload.exportedAt || new Date().toISOString();
  const md: string[] = [];

  md.push(`# ${payload.title || 'جلسة محادثة'}`);
  md.push('');
  md.push(`> **Gemini Studio & MONAD Sovereign Kernel** — سجل جلسة محادثة محفوظ محلياً`);
  md.push('');
  md.push(`| الخاصية | القيمة |`);
  md.push(`| :--- | :--- |`);
  md.push(`| **رمز الإصدار** | \`${payload.versionTag || 'v001'}\` |`);
  md.push(`| **معرف الجلسة** | \`${payload.sessionId}\` |`);
  md.push(`| **تاريخ التصدير** | \`${exportTime}\` |`);
  md.push(`| **النموذج الأساسي** | \`${payload.llmModel || 'gemini-4-argon'}\` |`);
  md.push(`| **البيرسونا** | ${payload.personaTitle || 'الشيخ جيمناي'} |`);
  md.push(`| **الصوت والتون** | ${payload.voiceName || 'Sadaltager'} (${payload.voiceState || 'الرايق العميق'}) |`);
  md.push(`| **عدد الأدوار** | **${payload.turns.length}** |`);
  md.push('');

  if (payload.boundDriveFiles && payload.boundDriveFiles.length > 0) {
    md.push(`### 📁 ملفات Google Drive المرتبطة بالجلسة`);
    payload.boundDriveFiles.forEach(f => {
      md.push(`- **[${f.slot || 'FILE'}]** \`${f.name}\` *(${f.mimeType || 'unknown'})*`);
    });
    md.push('');
  }

  md.push(`---`);
  md.push(`## 💬 مجرى المحادثة والأدوار`);
  md.push('');

  if (payload.turns.length === 0) {
    md.push('*لا توجد رسائل مسجلة في هذه الجلسة بعد.*');
  } else {
    payload.turns.forEach((turn, idx) => {
      const turnNum = turn.turnIndex || idx + 1;
      md.push(`### 🔹 الدور #${turnNum} (${turn.timestamp})`);
      md.push(`*الوسيط: \`${turn.inputModality || 'text'}\` • النموذج: \`${turn.modelUsed || payload.llmModel || 'gemini-4-argon'}\`*`);
      md.push('');
      md.push(`#### 👤 المستخدم`);
      md.push(turn.userInput.trim());
      md.push('');

      if (turn.thinkingTrace && turn.thinkingTrace.trim()) {
        md.push(`<details>`);
        md.push(`<summary>💭 <b>سلسلة التفكير (Thinking Trace)</b></summary>`);
        md.push('');
        md.push('```text');
        md.push(turn.thinkingTrace.trim());
        md.push('```');
        md.push('</details>');
        md.push('');
      }

      md.push(`#### 🧠 رد النموذج`);
      md.push(turn.modelOutput.trim());
      md.push('');

      if (turn.tokensUsed) {
        md.push(
          `*📊 توكنز الدور: إدخال \`${turn.tokensUsed.prompt}\` • إخراج \`${turn.tokensUsed.output}\`${
            turn.tokensUsed.thinking ? ` • تفكير \`${turn.tokensUsed.thinking}\`` : ''
          }*`
        );
        md.push('');
      }

      md.push(`---`);
      md.push('');
    });
  }

  return md.join('\n');
}

/**
 * Builds safe, clear filename for exporting session.
 * Example: "tahleel_sheikh_gemini_v001_2026-10-28.json"
 */
export function buildExportFilename(
  title: string,
  versionTag: string,
  format: 'json' | 'txt' | 'md',
  timestampStr?: string
): string {
  const slug = sanitizeTitleSlug(title) || 'session';
  const tag = (versionTag || 'v001').toLowerCase();
  const datePart = (timestampStr || new Date().toISOString()).slice(0, 10);
  return `${slug}_${tag}_${datePart}.${format}`;
}

/**
 * Initiates browser file download for a given text or json content.
 */
export function downloadFileLocally(content: string, filename: string, mimeType: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
    return true;
  } catch (err) {
    console.error('Failed to trigger download:', err);
    return false;
  }
}
