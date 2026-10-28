/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DriveItem } from '../lib/drive';

interface VoiceControlConsoleProps {
  isRecording: boolean;
  isMuted: boolean;
  onToggleMic: () => void;
  onToggleMute: () => void;
  liveTimerSeconds: number;
  engineMode: string;
  isDictating: boolean;
  onToggleDictation: () => void;
  autoSendDictation: boolean;
  onToggleAutoSendDictation: (enabled: boolean) => void;
  autoSpeakReply: boolean;
  onToggleAutoSpeakReply: (enabled: boolean) => void;
  audioMeterLevel: number;
  onStopAudioPlayback: () => void;
  onNewSessionVersion: () => void;
  q10Status: Record<string, boolean>;
  boundDriveFiles: DriveItem[];
  onUnbindDriveItem: (id: string) => void;
  onOpenDriveModal: () => void;
}

export const VoiceControlConsole: React.FC<VoiceControlConsoleProps> = ({
  isRecording,
  isMuted,
  onToggleMic,
  onToggleMute,
  liveTimerSeconds,
  engineMode,
  isDictating,
  onToggleDictation,
  autoSendDictation,
  onToggleAutoSendDictation,
  autoSpeakReply,
  onToggleAutoSpeakReply,
  audioMeterLevel,
  onStopAudioPlayback,
  onNewSessionVersion,
  q10Status,
  boundDriveFiles,
  onUnbindDriveItem,
  onOpenDriveModal,
}) => {
  const formatTimer = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const linkedQCount = Object.values(q10Status).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* 1. Main Interaction Console */}
      <div className="rounded-2xl p-4 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 flex flex-col items-center text-center space-y-3 shadow-xl">
        <div className="w-full flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold text-slate-200">🎛️ مشغّل التفاعل الصوتي والجلسة</span>
          <span className="font-mono text-cyan-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
            {formatTimer(liveTimerSeconds)}
          </span>
        </div>

        {/* Big Mic Button & Mute Button */}
        <div className="flex items-center justify-center gap-3 my-1">
          <button
            onClick={onToggleMic}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition transform active:scale-95 border-2 border-white/20 ${
              isRecording
                ? 'bg-gradient-to-br from-rose-600 to-red-700 animate-pulse'
                : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 hover:from-blue-500 hover:to-purple-600'
            }`}
          >
            <span className="text-3xl">{isRecording ? '⏹️' : '🎙️'}</span>
            <span className="text-[11px] font-bold mt-1">
              {isRecording
                ? 'إيقاف المايك'
                : engineMode === 'websocket_live'
                ? 'ابدأ Live 3.8'
                : 'تحدث بالمايك'}
            </span>
          </button>

          <button
            onClick={onToggleMute}
            disabled={!isRecording}
            className={`w-16 h-20 px-2.5 rounded-2xl flex flex-col items-center justify-center shadow-lg transition border disabled:opacity-40 disabled:cursor-not-allowed ${
              isMuted
                ? 'bg-amber-600/90 border-amber-300 text-white'
                : 'bg-slate-950/90 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="text-2xl">{isMuted ? '🔇' : '🎙️'}</span>
            <span className="text-[10px] font-bold mt-1">{isMuted ? 'إلغاء الكتم' : 'كتم المايك'}</span>
          </button>
        </div>

        {/* Dictation Toggle */}
        <button
          onClick={onToggleDictation}
          className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
            isDictating
              ? 'bg-cyan-600/40 border-cyan-400 text-cyan-200 animate-pulse'
              : 'bg-cyan-600/20 hover:bg-cyan-600/35 border-cyan-500/40 text-cyan-200'
          }`}
        >
          <span>✍️</span>
          <span>{isDictating ? 'إيقاف الإملاء الصوتي (يستمع إليك...)' : 'إملاء صوتي مستمر لـ Gemini'}</span>
        </button>

        {/* Control Toggles */}
        <div className="w-full bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 text-right space-y-1.5 text-[11px]">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-cyan-200 font-semibold">⚡ إرسال تلقائي بعد التوقف (1.8 ثانية):</span>
            <input
              type="checkbox"
              checked={autoSendDictation}
              onChange={(e) => onToggleAutoSendDictation(e.target.checked)}
              className="rounded text-cyan-500 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-emerald-300 font-semibold">🔊 نطق الرد تلقائياً (gemini-3.8-flash-tts):</span>
            <input
              type="checkbox"
              checked={autoSpeakReply}
              onChange={(e) => onToggleAutoSpeakReply(e.target.checked)}
              className="rounded text-emerald-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Audio Meter */}
        <div className="w-full space-y-1 pt-0.5">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>مؤشر التقاط الصوت</span>
            <span className={isMuted ? 'text-amber-400 font-bold' : 'text-emerald-400 font-semibold'}>
              {isMuted ? '🔇 مكتوم مؤقتاً' : isRecording ? '🟢 المايك نشط' : 'المايك جاهز'}
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 transition-all duration-75"
              style={{ width: `${Math.min(100, isMuted ? 0 : audioMeterLevel)}%` }}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="w-full flex gap-2 pt-1">
          <button
            onClick={onStopAudioPlayback}
            className="w-1/2 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition"
          >
            🔇 إيقاف الصوت
          </button>
          <button
            onClick={onNewSessionVersion}
            className="w-1/2 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-200 text-xs font-semibold transition"
          >
            ➕ جلسة جديدة (v+1)
          </button>
        </div>
      </div>

      {/* 2. Quran 10 Parts & Bound Drive Files Matrix */}
      <div className="rounded-2xl p-4 bg-slate-900/90 backdrop-blur-md border border-amber-500/40 space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>🏛️ مصفوفة الملفات المرجعية (Q1..Q10)</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
            {linkedQCount} / 10 Linked
          </span>
        </div>

        <div className="bg-slate-950/90 p-2 rounded-xl border border-slate-800 space-y-1">
          <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
            {Array.from({ length: 10 }, (_, i) => {
              const slot = `Q${i + 1}`;
              const isLinked = Boolean(q10Status[slot]);
              return (
                <div
                  key={slot}
                  className={`py-1 px-1 rounded-lg transition font-extrabold ${
                    isLinked
                      ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-500'
                  }`}
                >
                  {isLinked ? `🟢 ${slot}` : `⚪ ${slot}`}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bound Drive items chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>ملفات Google Drive المرتبطة بالسياق:</span>
            <button
              onClick={onOpenDriveModal}
              className="text-[10px] text-cyan-300 hover:text-cyan-200 underline font-bold"
            >
              + تصفح Drive
            </button>
          </div>

          <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
            {boundDriveFiles.length === 0 ? (
              <div className="text-[11px] text-slate-500 text-center py-2 bg-slate-950/60 rounded-xl border border-slate-800">
                لم يتم ربط ملفات من Google Drive بعد. اضغط تصفح Drive بالأسفل لربط ملفاتك.
              </div>
            ) : (
              boundDriveFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-[11px]"
                >
                  <span className="truncate text-cyan-200 font-medium flex items-center gap-1.5">
                    <span>{file.isFolder ? '📁' : '📄'}</span>
                    {file.slot && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/40 font-mono font-bold">
                        {file.slot}
                      </span>
                    )}
                    <span className="truncate">{file.name}</span>
                  </span>
                  <button
                    onClick={() => onUnbindDriveItem(file.id)}
                    className="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5"
                    title="إلغاء الربط"
                  >
                    ✖
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
