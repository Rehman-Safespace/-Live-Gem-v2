/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { SavedTurn } from '../lib/firestoreStore';

interface ChatStreamProps {
  turns: SavedTurn[];
  isGenerating: boolean;
  onReplayTTS: (text: string) => void;
  showThinkingTrace: boolean;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
  turns,
  isGenerating,
  onReplayTTS,
  showThinkingTrace,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [turns, isGenerating]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto space-y-4 px-2 py-1 select-text scroll-smooth"
    >
      {/* Intro message */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 text-xs text-slate-300 leading-relaxed space-y-1.5 shadow-md">
        <div className="font-extrabold text-emerald-400 text-sm flex items-center gap-2">
          <span>✨</span>
          <span>
            مرحباً بك في استوديو Gemini 3.8 Flash + نواة MONAD Sovereign Kernel v6.2 المتكاملة!
          </span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          • <b>التزام صارم ببروتوكول MONAD v6.2 والسجل الثابت الكامل:</b> مدمج تلقائياً مع خريطة الأجزاء الـ 10 ومحركات القياس الـ 14 واللهجة المصرية الدارجة الكثيفة.<br />
          • <b>Google Drive + Firebase:</b> تم ربط حسابك وصلاحيات Google Drive لحفظ الجلسات واستدعاء الذكريات وتصفح وربط الملفات والمجلدات.<br />
          • <b>النماذج متعددة الوسائط:</b> دعم كامل لـ <code>gemini-4-argon</code> (تفكير عالي)، و<code>gemini-3.8-flash</code>، و<code>gemini-3.8-live</code>، و<code>gemini-3.8-flash-tts</code>، و<code>gemini-3.5-transcribe</code>.
        </p>
      </div>

      {/* Turns list */}
      {turns.map((turn, idx) => (
        <React.Fragment key={idx}>
          {/* User message */}
          {turn.userInput && (
            <div className="rounded-2xl bg-blue-950/45 border border-blue-500/35 p-3.5 text-xs md:text-sm text-slate-100 space-y-1.5 ml-6 md:ml-12 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-blue-300 font-bold border-b border-blue-900/50 pb-1">
                <span className="flex items-center gap-1.5">
                  <span>👤 أنت (User)</span>
                  {turn.inputModality === 'voice_dictation' && <span>🎙️ (إملاء)</span>}
                  {turn.inputModality === 'recorded_audio' && <span>🎤 (تسجيل صوتي)</span>}
                  {turn.inputModality === 'live_websocket_audio' && <span>⚡ (Live 3.8)</span>}
                </span>
                <span className="font-mono text-[10px] text-slate-400">{turn.timestamp}</span>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{turn.userInput}</div>
            </div>
          )}

          {/* Model message */}
          {turn.modelOutput && (
            <div className="rounded-2xl bg-slate-900/95 border border-purple-500/35 p-4 text-xs md:text-sm text-slate-100 space-y-2.5 mr-6 md:mr-12 shadow-lg">
              <div className="flex items-center justify-between text-[11px] text-purple-300 font-bold border-b border-slate-800 pb-1.5 flex-wrap gap-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <span>🧠</span>
                  <span>Gemini ({turn.modelUsed})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReplayTTS(turn.modelOutput)}
                    className="px-2.5 py-0.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold transition flex items-center gap-1"
                  >
                    <span>🔊 نطق الرد</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(turn.modelOutput)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition"
                    title="نسخ النص"
                  >
                    📋 نسخ
                  </button>
                  <span className="font-mono text-[10px] text-slate-400">{turn.timestamp}</span>
                </div>
              </div>

              {/* Thinking Trace */}
              {showThinkingTrace && turn.thinkingTrace && (
                <details className="rounded-xl p-2.5 text-xs text-purple-200/90 bg-purple-950/20 border-r-4 border-purple-500" open>
                  <summary className="cursor-pointer font-bold text-purple-300 select-none">
                    💭 سلسلة التفكير العميق (Thinking Trace)
                  </summary>
                  <div className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-slate-300 leading-relaxed max-h-60 overflow-y-auto">
                    {turn.thinkingTrace}
                  </div>
                </details>
              )}

              {/* Main Content */}
              <div className="whitespace-pre-wrap leading-relaxed">{turn.modelOutput}</div>
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Generating Indicator */}
      {isGenerating && (
        <div className="rounded-2xl bg-slate-900/95 border border-purple-500/40 p-4 text-xs text-slate-200 mr-6 md:mr-12 shadow-lg space-y-2 animate-pulse">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span>⏳ جاري التفكير العميق وتنفيذ بروتوكول MONAD v6.2 (High Thinking)...</span>
          </div>
          <p className="text-[11px] text-slate-400">
            يتم فحص المصادر ومطابقة الجذور والتحليل عبر محركات القياس الـ 14...
          </p>
        </div>
      )}
    </div>
  );
};
