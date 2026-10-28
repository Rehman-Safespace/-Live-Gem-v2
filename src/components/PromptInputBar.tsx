/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';

interface PromptInputBarProps {
  inputPrompt: string;
  setInputPrompt: (val: string) => void;
  onSend: (text?: string) => void;
  isGenerating: boolean;
  onMicClick: () => void;
  isRecording: boolean;
  // Enhanced voice & transcription features
  isLiveVoiceActive?: boolean;
  onToggleLiveVoice?: () => void;
  isTranscribingAudio?: boolean;
  onToggleTranscribeMic?: () => void;
  onUploadAudioFile?: (file: File) => void;
  isTranscribingFile?: boolean;
  isDictating?: boolean;
  onToggleDictation?: () => void;
  liveTimerSeconds?: number;
}

export const PromptInputBar: React.FC<PromptInputBarProps> = ({
  inputPrompt,
  setInputPrompt,
  onSend,
  isGenerating,
  onMicClick,
  isRecording,
  isLiveVoiceActive = false,
  onToggleLiveVoice,
  isTranscribingAudio = false,
  onToggleTranscribeMic,
  onUploadAudioFile,
  isTranscribingFile = false,
  isDictating = false,
  onToggleDictation,
  liveTimerSeconds = 0,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTimer = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadAudioFile) {
      onUploadAudioFile(file);
    }
    // reset input so the same file can be re-uploaded if needed
    e.target.value = '';
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
          placeholder="تحدث بالمايك للإملاء أو التفاعل الصوتي المباشر، أو اكتب رسالتك هنا (Enter للإرسال)..."
          className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
        />

        {/* Primary Mic Trigger (Fallback / Contextual) */}
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

        {/* Send Button */}
        <button
          onClick={() => onSend()}
          disabled={isGenerating || (!inputPrompt.trim())}
          className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs md:text-sm font-extrabold shadow-lg transition shrink-0"
        >
          إرسال 🚀
        </button>
      </div>

      {/* Voice Features Toolbar: gemini-3.8-live & gemini-3.5-transcribe */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Feature 1: Real-Time Live Voice Conversation (gemini-3.8-live) */}
          {onToggleLiveVoice && (
            <button
              onClick={onToggleLiveVoice}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition shadow-sm ${
                isLiveVoiceActive
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-950 hover:bg-cyan-950/80 text-cyan-300 border-cyan-500/40 hover:border-cyan-400'
              }`}
              title="محادثة صوتية ثنائية الاتجاه ومباشرة بالكامل عبر نموذج gemini-3.8-live عبر WebSocket"
            >
              <span className={`w-2 h-2 rounded-full ${isLiveVoiceActive ? 'bg-white animate-ping' : 'bg-cyan-400'}`} />
              <span>{isLiveVoiceActive ? `⚡ Live 3.8 نشط (${formatTimer(liveTimerSeconds)})` : '⚡ محادثة لايف (gemini-3.8-live)'}</span>
            </button>
          )}

          {/* Feature 2a: Mic Recording & Audio Transcription (gemini-3.5-transcribe) */}
          {onToggleTranscribeMic && (
            <button
              onClick={onToggleTranscribeMic}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition shadow-sm ${
                isTranscribingAudio
                  ? 'bg-red-600 text-white border-red-300 animate-pulse'
                  : 'bg-slate-950 hover:bg-purple-950/80 text-purple-300 border-purple-500/40 hover:border-purple-400'
              }`}
              title="تسجيل مقطع صوتي وتفريغه بدقة عالية بواسطة نموذج gemini-3.5-transcribe"
            >
              <span>{isTranscribingAudio ? '⏹️' : '🎙️'}</span>
              <span>{isTranscribingAudio ? `جاري التسجيل (${formatTimer(liveTimerSeconds)})` : 'تفريغ بالمايك (gemini-3.5-transcribe)'}</span>
            </button>
          )}

          {/* Feature 2b: Audio File Upload & Transcribe (gemini-3.5-transcribe) */}
          {onUploadAudioFile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isTranscribingFile}
                className="px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition shadow-sm bg-slate-950 hover:bg-amber-950/80 text-amber-300 border-amber-500/40 hover:border-amber-400 disabled:opacity-50"
                title="رفع ملف صوتي وتفريغ محتواه بدقة عبر نموذج gemini-3.5-transcribe"
              >
                <span>{isTranscribingFile ? '⏳' : '📁'}</span>
                <span>{isTranscribingFile ? 'جاري التفريغ...' : 'رفع ملف صوتي (gemini-3.5-transcribe)'}</span>
              </button>
            </>
          )}

          {/* Web Speech Dictation Alternative */}
          {onToggleDictation && (
            <button
              onClick={onToggleDictation}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 border transition shadow-sm ${
                isDictating
                  ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="إملاء صوتي لحظي عبر متصفح الويب (Web Speech)"
            >
              <span>✍️</span>
              <span>{isDictating ? 'إملاء متصفح نشط' : 'إملاء المتصفح'}</span>
            </button>
          )}
        </div>

        {/* Status Hint */}
        <div className="text-[10px] text-slate-400 hidden sm:block">
          {isLiveVoiceActive ? (
            <span className="text-cyan-400 font-mono">16kHz Mic In ➔ 24kHz Audio Out</span>
          ) : isTranscribingAudio ? (
            <span className="text-purple-300 font-mono">High-Fidelity Audio Buffer</span>
          ) : (
            <span>نواة MONAD v6.2 | محرك صوت جيمناي المتقدم</span>
          )}
        </div>
      </div>
    </div>
  );
};
