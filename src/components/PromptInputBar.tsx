/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';

interface PromptInputBarProps {
  inputPrompt: string;
  setInputPrompt: (val: string) => void;
  onSend: (text?: string) => void;
  isGenerating: boolean;
  onMicClick: () => void;
  isRecording: boolean;
}

export const PromptInputBar: React.FC<PromptInputBarProps> = ({
  inputPrompt,
  setInputPrompt,
  onSend,
  isGenerating,
  onMicClick,
  isRecording,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleQuickPrompt = (prefix: string) => {
    const current = inputPrompt.trim();
    setInputPrompt(current ? `${prefix}\n${current}` : prefix);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="pt-2 border-t border-slate-800 flex flex-col gap-2 shrink-0">
      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
        <button
          onClick={() =>
            handleQuickPrompt(
              'نفّذ بروتوكول التفكيك العكسي السداسي (Bidirectional Deconstruction Protocol) ومحركات القياس الـ 14 ومعادلة الميزان الفيزيائي W_final = Mizan(W_raw) ⊙ M_physics عبر الأجزاء العشرة (QURAN_PART_1 إلى QURAN_PART_10) والسجل الثابت على المفهوم التالي: '
            )
          }
          className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-600/40 text-amber-200 shrink-0 transition font-semibold"
        >
          🏛️ تفكيك MONAD السداسي (Q1..Q10)
        </button>

        <button
          onClick={() =>
            handleQuickPrompt(
              'طبق فلتر مانع التشويش (Anti-Spin Dictionary) وبروتوكول NULL لتفكيك هذا المصطلح وإرجاعه لعملياته المادية والفيزيائية مع ذكر إحداثيات QURAN_PART_1..10: '
            )
          }
          className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 shrink-0 transition font-semibold"
        >
          🔬 فلتر Anti-Spin وتفكيك الجذر
        </button>

        <button
          onClick={() =>
            handleQuickPrompt(
              'استحضر ملفات Google Drive المرتبطة بالسياق وذاكرة المحادثات المسترجعة، وحلل الفكرة التالية بدقة: '
            )
          }
          className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 shrink-0 transition font-semibold"
        >
          🧠 ربط Drive والذاكرة المسترجعة
        </button>
      </div>

      {/* Input Box */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={2}
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="تحدث بالمايك للإملاء المباشر، أو اكتب رسالتك هنا (Enter للإرسال)..."
          className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
        />

        <button
          onClick={onMicClick}
          className={`p-3.5 rounded-xl border text-sm font-bold shadow transition shrink-0 ${
            isRecording
              ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-300'
          }`}
          title={isRecording ? 'إيقاف المايك' : 'تحدث بالمايك'}
        >
          {isRecording ? '⏹️' : '🎙️'}
        </button>

        <button
          onClick={() => onSend()}
          disabled={isGenerating || (!inputPrompt.trim())}
          className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs md:text-sm font-extrabold shadow-lg transition shrink-0"
        >
          إرسال 🚀
        </button>
      </div>
    </div>
  );
};
