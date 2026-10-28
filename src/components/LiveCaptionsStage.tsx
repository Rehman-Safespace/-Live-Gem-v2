/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface LiveCaptionsStageProps {
  userTranscript: string;
  modelTranscript: string;
  isInterimUser: boolean;
  voiceName: string;
  voiceStateShort: string;
  activeVoiceMode?: 'none' | 'live_ws' | 'transcribe_mic' | 'transcribe_file' | 'web_speech';
  onClearCaptions?: () => void;
  onReplayModelAudio?: (text: string) => void;
}

export const LiveCaptionsStage: React.FC<LiveCaptionsStageProps> = ({
  userTranscript,
  modelTranscript,
  isInterimUser,
  voiceName,
  voiceStateShort,
  activeVoiceMode = 'none',
  onClearCaptions,
  onReplayModelAudio,
}) => {
  const [copiedKey, setCopiedKey] = useState<'user' | 'model' | null>(null);

  const handleCopy = (text: string, key: 'user' | 'model') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getModeBadge = () => {
    switch (activeVoiceMode) {
      case 'live_ws':
        return {
          text: '⚡ Live API Stream (gemini-3.8-live)',
          className: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
        };
      case 'transcribe_mic':
        return {
          text: '🎙️ تفريغ بالمايك (gemini-3.5-transcribe)',
          className: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'transcribe_file':
        return {
          text: '📁 تفريغ ملف صوتي (gemini-3.5-transcribe)',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'web_speech':
        return {
          text: '✍️ إملاء متصفح الويب (Web Speech)',
          className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      default:
        return {
          text: '💬 وضع الصوت الذكي',
          className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
    }
  };

  const modeBadge = getModeBadge();

  return (
    <div className="rounded-2xl p-3 md:p-3.5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 space-y-2 shadow-inner">
      <div className="flex items-center justify-between text-[11px] text-cyan-400 border-b border-slate-800 pb-1.5 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${activeVoiceMode === 'live_ws' ? 'bg-rose-400 animate-ping' : 'bg-cyan-400'}`} />
            <span>📺 شاشة المحادثة والتفريغ الصوتي اللحظي</span>
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${modeBadge.className}`}>
            {modeBadge.text}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-300 font-mono">
            State: {voiceStateShort} | Voice: {voiceName}
          </span>
          {onClearCaptions && (userTranscript || modelTranscript) && (
            <button
              onClick={onClearCaptions}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="مسح محتوى الشاشة الحالي"
            >
              🧹 مسح
            </button>
          )}
        </div>
      </div>

      {/* User Transcript Line */}
      <div className="flex items-start justify-between gap-2 bg-slate-950/60 p-2 rounded-xl border border-cyan-900/30">
        <div className="text-xs md:text-sm text-cyan-200 font-semibold leading-relaxed min-h-[22px] flex-1">
          <span className="text-slate-400 mr-1">👤 المستخدم:</span>
          {userTranscript ? (
            <span className={isInterimUser ? 'text-cyan-300/80 italic' : 'text-cyan-100 font-bold'}>
              {userTranscript}
            </span>
          ) : (
            <span className="text-slate-500 font-normal">
              تحدث بالمايك للتفريغ بـ gemini-3.5-transcribe أو انقر (محادثة لايف) لـ gemini-3.8-live...
            </span>
          )}
        </div>
        {userTranscript && (
          <button
            onClick={() => handleCopy(userTranscript, 'user')}
            className="text-[10px] text-slate-400 hover:text-cyan-300 shrink-0 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
            title="نسخ نص المستخدم"
          >
            {copiedKey === 'user' ? '✓ نُسخ' : '📋 نسخ'}
          </button>
        )}
      </div>

      {/* Model Transcript Line */}
      <div className="flex items-start justify-between gap-2 bg-slate-950/60 p-2 rounded-xl border border-amber-900/30">
        <div className="text-xs md:text-sm text-amber-200 font-semibold leading-relaxed min-h-[22px] flex-1">
          <span className="text-slate-400 mr-1">🧠 الشيخ جيمناي:</span>
          {modelTranscript ? (
            <span className="text-amber-100 font-bold">{modelTranscript}</span>
          ) : (
            <span className="text-slate-500 font-normal">
              سيظهر رد النموذج المنطوق مباشرة ببروتوكول MONAD وبصوت {voiceName}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {modelTranscript && onReplayModelAudio && (
            <button
              onClick={() => onReplayModelAudio(modelTranscript)}
              className="text-[10px] text-amber-300 hover:text-amber-200 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/40"
              title="إعادة نطق رد النموذج"
            >
              🔊 نطق
            </button>
          )}
          {modelTranscript && (
            <button
              onClick={() => handleCopy(modelTranscript, 'model')}
              className="text-[10px] text-slate-400 hover:text-amber-300 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
              title="نسخ نص النموذج"
            >
              {copiedKey === 'model' ? '✓ نُسخ' : '📋 نسخ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
