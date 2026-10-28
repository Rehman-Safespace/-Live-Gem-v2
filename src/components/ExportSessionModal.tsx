/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ExportSessionPayload,
  generateSessionJson,
  generateSessionText,
  generateSessionMarkdown,
  buildExportFilename,
  downloadFileLocally,
} from '../utils/exportSession';

import { createDriveFile } from '../lib/drive';

interface ExportSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: ExportSessionPayload | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  accessToken?: string | null;
}

export const ExportSessionModal: React.FC<ExportSessionModalProps> = ({
  isOpen,
  onClose,
  sessionData,
  onNotify,
  accessToken,
}) => {
  const [format, setFormat] = useState<'json' | 'txt' | 'md'>('json');
  const [includeThinking, setIncludeThinking] = useState<boolean>(true);
  const [includeTokens, setIncludeTokens] = useState<boolean>(true);
  const [includeDriveFiles, setIncludeDriveFiles] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState<boolean>(false);

  // Filtered payload based on user preferences
  const preparedPayload = useMemo<ExportSessionPayload | null>(() => {
    if (!sessionData) return null;

    const filteredTurns = sessionData.turns.map(turn => ({
      ...turn,
      thinkingTrace: includeThinking ? turn.thinkingTrace : undefined,
      tokensUsed: includeTokens ? turn.tokensUsed : undefined,
    }));

    return {
      ...sessionData,
      tokenSummary: includeTokens ? sessionData.tokenSummary : undefined,
      boundDriveFiles: includeDriveFiles ? sessionData.boundDriveFiles : [],
      turns: filteredTurns,
    };
  }, [sessionData, includeThinking, includeTokens, includeDriveFiles]);

  // Generated content string
  const exportedContent = useMemo<string>(() => {
    if (!preparedPayload) return '';
    if (format === 'json') {
      return generateSessionJson(preparedPayload);
    }
    if (format === 'txt') {
      return generateSessionText(preparedPayload);
    }
    return generateSessionMarkdown(preparedPayload);
  }, [preparedPayload, format]);

  const filename = useMemo<string>(() => {
    if (!sessionData) return `session.${format}`;
    return buildExportFilename(
      sessionData.title || 'جلسة_جيمناي',
      sessionData.versionTag || 'v001',
      format
    );
  }, [sessionData, format]);

  if (!isOpen || !sessionData) return null;

  const handleDownload = () => {
    const mimeTypes: Record<'json' | 'txt' | 'md', string> = {
      json: 'application/json',
      txt: 'text/plain',
      md: 'text/markdown',
    };
    const success = downloadFileLocally(exportedContent, filename, mimeTypes[format]);
    if (success) {
      if (onNotify) {
        onNotify(`💾 تم تحميل ملف (${filename}) محلياً بنجاح!`, 'success');
      }
      onClose();
    } else {
      if (onNotify) {
        onNotify('تعذر تنزيل الملف، يمكنك نسخه يدوياً من نافذة المعاينة.', 'error');
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedContent);
      setCopied(true);
      if (onNotify) {
        onNotify('📋 تم نسخ سجل الجلسة بالكامل إلى الحافظة!', 'success');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      if (onNotify) {
        onNotify('فشل النسخ إلى الحافظة.', 'error');
      }
    }
  };

  const handleSaveToDrive = async () => {
    if (!accessToken) {
      if (onNotify) onNotify('يرجى تسجيل الدخول بحساب Google أولاً لحفظ الملف في Google Drive', 'warning');
      return;
    }
    setIsSavingToDrive(true);
    const mimeTypes: Record<'json' | 'txt' | 'md', string> = {
      json: 'application/json',
      txt: 'text/plain',
      md: 'text/markdown',
    };
    try {
      await createDriveFile(accessToken, filename, exportedContent, mimeTypes[format]);
      if (onNotify) {
        onNotify(`☁️ تم حفظ ملف (${filename}) في حساب Google Drive بنجاح!`, 'success');
      }
      onClose();
    } catch (err: any) {
      if (onNotify) {
        onNotify(`فشل الحفظ في Google Drive: ${err.message}`, 'error');
      }
    } finally {
      setIsSavingToDrive(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-5"
    >
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-3xl w-full p-4 md:p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-700 flex items-center justify-center text-lg shadow">
              💾
            </div>
            <div>
              <h3 id="export-modal-title" className="text-sm md:text-base font-extrabold text-emerald-300">
                تصدير سجل المحادثة محلياً أو إلى Google Drive
              </h3>
              <p className="text-[11px] text-slate-400">
                احفظ سجل الجلسة بالكامل على جهازك أو مباشرة في سحابة Google Drive كملف JSON مهيكل أو TXT أو Markdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق نافذة التصدير"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
          >
            ✖ إغلاق
          </button>
        </div>

        {/* Format Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span>📦 صيغة التصدير المستهدفة:</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                format === 'json'
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="text-base">⚙️ JSON مهيكل</span>
              <span className="text-[10px] font-mono text-emerald-400/90">.json (كامل ومفصل)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('txt')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                format === 'txt'
                  ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="text-base">📄 نص منسق (Transcript)</span>
              <span className="text-[10px] font-mono text-cyan-400/90">.txt (للقراءة السهلة)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('md')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                format === 'md'
                  ? 'bg-purple-950/90 border-purple-400 text-purple-200 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="text-base">📝 ملف ماركداون</span>
              <span className="text-[10px] font-mono text-purple-400/90">.md (Notion / GitHub)</span>
            </button>
          </div>
        </div>

        {/* Options & Filename Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          {/* Options Toggles */}
          <div className="space-y-2">
            <span className="font-bold text-amber-300 block mb-1">خيارات التضمين:</span>
            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span>💭 تضمين سلاسل التفكير (Thinking Traces):</span>
              <input
                type="checkbox"
                checked={includeThinking}
                onChange={e => setIncludeThinking(e.target.checked)}
                className="rounded text-emerald-500 cursor-pointer w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span>📊 تضمين إحصائيات التوكنز والوسيط:</span>
              <input
                type="checkbox"
                checked={includeTokens}
                onChange={e => setIncludeTokens(e.target.checked)}
                className="rounded text-emerald-500 cursor-pointer w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span>⚡ تضمين قائمة ملفات Google Drive المرتبطة:</span>
              <input
                type="checkbox"
                checked={includeDriveFiles}
                onChange={e => setIncludeDriveFiles(e.target.checked)}
                className="rounded text-emerald-500 cursor-pointer w-4 h-4"
              />
            </label>
          </div>

          {/* Metadata & File Info */}
          <div className="space-y-1.5 border-t md:border-t-0 md:border-r border-slate-800 md:pr-3">
            <span className="font-bold text-cyan-300 block mb-1">تفاصيل الملف الناتج:</span>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>
                اسم الملف: <span className="font-mono text-emerald-300 font-bold break-all">{filename}</span>
              </div>
              <div>
                عدد الأدوار: <span className="font-mono text-slate-200 font-bold">{sessionData.turns.length} دور</span>
              </div>
              <div>
                الحجم التقديري: <span className="font-mono text-slate-200">{(exportedContent.length / 1024).toFixed(1)} KB</span>
              </div>
              <div className="text-[10px] text-slate-500">
                🔒 متصل بحساب Google Drive لتصدير وحفظ الملفات مباشرة أو تنزيلها محلياً.
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="flex-1 flex flex-col min-h-[160px] max-h-[220px] space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>👁️ معاينة المحتوى المستخرج:</span>
            <span className="font-mono text-[10px]">{exportedContent.split('\n').length} سطر</span>
          </div>
          <div
            className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-y-auto whitespace-pre leading-relaxed select-text text-left"
            dir="ltr"
          >
            {exportedContent}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800 flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
          >
            <span>{copied ? '✅ تم النسخ!' : '📋 نسخ للحافظة'}</span>
          </button>
          {accessToken && (
            <button
              type="button"
              disabled={isSavingToDrive}
              onClick={handleSaveToDrive}
              className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <span>{isSavingToDrive ? 'جاري الرفع لـ Drive...' : '☁️ حفظ في Google Drive'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <span>📥 تحميل الملف محلياً ({filename})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
