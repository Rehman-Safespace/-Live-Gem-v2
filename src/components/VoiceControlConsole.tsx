/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
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
  onOpenExportModal?: () => void;
  q10Status: Record<string, boolean>;
  boundDriveFiles: DriveItem[];
  onUnbindDriveItem: (id: string) => void;
  onOpenDriveModal: () => void;
  // Enhanced voice features
  isLiveVoiceActive?: boolean;
  onToggleLiveVoice?: () => void;
  isTranscribingAudio?: boolean;
  onToggleTranscribeMic?: () => void;
  onUploadAudioFile?: (file: File) => void;
  isTranscribingFile?: boolean;
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
  onOpenExportModal,
  q10Status,
  boundDriveFiles,
  onUnbindDriveItem,
  onOpenDriveModal,
  isLiveVoiceActive = false,
  onToggleLiveVoice,
  isTranscribingAudio = false,
  onToggleTranscribeMic,
  onUploadAudioFile,
  isTranscribingFile = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTimer = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const linkedQCount = Object.values(q10Status).filter(Boolean).length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadAudioFile) {
      onUploadAudioFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Interaction Console */}
      <div className="rounded-2xl p-4 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 flex flex-col items-center text-center space-y-3 shadow-xl">
        <div className="w-full flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold text-slate-200">🎛️ مشغّل التفاعل الصوتي المزدوج</span>
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
                : isLiveVoiceActive
                ? 'إيقاف Live 3.8'
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

        {/* Dedicated Voice Triggers: gemini-3.8-live & gemini-3.5-transcribe */}
        <div className="w-full grid grid-cols-2 gap-2 text-xs">
          {/* Live Voice Button */}
          {onToggleLiveVoice && (
            <button
              onClick={onToggleLiveVoice}
              className={`py-2 px-2.5 rounded-xl border font-bold transition flex items-center justify-center gap-1.5 shadow ${
                isLiveVoiceActive
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border-cyan-500/40'
              }`}
              title="محادثة صوتية لايف حية (Live API - gemini-3.8-live)"
            >
              <span className={`w-2 h-2 rounded-full ${isLiveVoiceActive ? 'bg-white animate-ping' : 'bg-cyan-400'}`} />
              <span className="truncate">{isLiveVoiceActive ? 'إيقاف Live 3.8' : '⚡ Live 3.8 مباشر'}</span>
            </button>
          )}

          {/* Transcribe Mic Button */}
          {onToggleTranscribeMic && (
            <button
              onClick={onToggleTranscribeMic}
              className={`py-2 px-2.5 rounded-xl border font-bold transition flex items-center justify-center gap-1.5 shadow ${
                isTranscribingAudio
                  ? 'bg-red-600 text-white border-red-300 animate-pulse'
                  : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-500/40'
              }`}
              title="تسجيل وتفريغ الصوت بدقة (gemini-3.5-transcribe)"
            >
              <span>{isTranscribingAudio ? '⏹️' : '🎙️'}</span>
              <span className="truncate">{isTranscribingAudio ? 'إيقاف وتفريغ' : 'تفريغ 3.5 بالمايك'}</span>
            </button>
          )}
        </div>

        {/* Secondary Audio Row: File Upload Transcribe & Web Speech */}
        <div className="w-full flex items-center gap-2">
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
                className="flex-1 py-1.5 px-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/40 text-amber-200 text-[11px] font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
                title="رفع ملف صوتي وتفريغه عبر gemini-3.5-transcribe"
              >
                <span>{isTranscribingFile ? '⏳' : '📁'}</span>
                <span>{isTranscribingFile ? 'جاري التفريغ...' : 'تفريغ ملف صوتي'}</span>
              </button>
            </>
          )}

          <button
            onClick={onToggleDictation}
            className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center gap-1 ${
              isDictating
                ? 'bg-emerald-600/40 border-emerald-400 text-emerald-200 animate-pulse'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="إملاء متصفح فوري (Web Speech API)"
          >
            <span>✍️</span>
            <span>{isDictating ? 'إملاء متصفح نشط' : 'إملاء المتصفح'}</span>
          </button>
        </div>

        {/* Control Toggles */}
        <div className="w-full bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 text-right space-y-1.5 text-[11px]">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-cyan-200 font-semibold">⚡ إرسال تلقائي بعد التفريغ:</span>
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
            <span>مؤشر التقاط الصوت الحقيقي (16kHz / RMS)</span>
            <span className={isMuted ? 'text-amber-400 font-bold' : isRecording ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
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
        <div className="w-full flex gap-1.5 pt-1">
          <button
            onClick={onStopAudioPlayback}
            className="flex-1 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-semibold transition"
            title="إيقاف تشغيل الصوت الحالي"
          >
            🔇 إيقاف
          </button>
          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              className="flex-1 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-600/50 text-cyan-200 text-[11px] font-semibold transition flex items-center justify-center gap-1"
              title="تصدير سجل المحادثة كملف JSON أو TXT محلياً"
            >
              <span>💾 تصدير</span>
            </button>
          )}
          <button
            onClick={onNewSessionVersion}
            className="flex-1 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-200 text-[11px] font-semibold transition flex items-center justify-center gap-1"
            title="بدء جلسة جديدة بنسخة متتالية v+1"
          >
            <span>➕ جديدة</span>
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
