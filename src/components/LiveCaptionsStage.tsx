/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LiveCaptionsStageProps {
  userTranscript: string;
  modelTranscript: string;
  isInterimUser: boolean;
  voiceName: string;
  voiceStateShort: string;
  onClearCaptions?: () => void;
}

export const LiveCaptionsStage: React.FC<LiveCaptionsStageProps> = ({
  userTranscript,
  modelTranscript,
  isInterimUser,
  voiceName,
  voiceStateShort,
}) => {
  return (
    <div className="rounded-2xl p-3 md:p-3.5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 space-y-1.5 shadow-inner">
      <div className="flex items-center justify-between text-[11px] text-cyan-400 border-b border-slate-800 pb-1">
        <span className="font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>📺 شاشة الديكتيشن الصوتي ومخرجات جيمناي المنطوقة</span>
        </span>
        <span className="text-[10px] text-emerald-300 font-mono">
          State: {voiceStateShort} | Voice: {voiceName}
        </span>
      </div>

      {/* User Transcript Line */}
      <div className="text-xs md:text-sm text-cyan-200 font-semibold leading-relaxed min-h-[22px]">
        👤{' '}
        {userTranscript ? (
          <span className={isInterimUser ? 'text-cyan-300/80 italic' : 'text-cyan-100 font-bold'}>
            {userTranscript}
          </span>
        ) : (
          <span className="text-slate-500 font-normal">
            تحدث بالمايك للإملاء المباشر، أو انقر (ابدأ Live 3.8) للتفاعل الصوتي المستمر...
          </span>
        )}
      </div>

      {/* Model Transcript Line */}
      <div className="text-xs md:text-sm text-amber-200 font-semibold leading-relaxed min-h-[22px]">
        🧠{' '}
        {modelTranscript ? (
          <span className="text-amber-100 font-bold">{modelTranscript}</span>
        ) : (
          <span className="text-slate-500 font-normal">
            سيظهر رد النموذج هنا ملتزماً ببروتوكول MONAD v6.2 مع نطقه فوراً بالصوت والتون المختارين...
          </span>
        )}
      </div>
    </div>
  );
};
