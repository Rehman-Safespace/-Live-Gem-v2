/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VOICE_PROFILES_CATALOG, VOCAL_STATES_CATALOG } from '../lib/voiceCatalog';

interface VoiceBioCardProps {
  voiceName: string;
  voiceState: string;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  selectedInputId: string;
  selectedOutputId: string;
  onChangeInputDevice: (id: string) => void;
  onChangeOutputDevice: (id: string) => void;
  onRefreshDevices: () => void;
  onPlayTestTone: () => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  speakerState: string;
}

export const VoiceBioCard: React.FC<VoiceBioCardProps> = ({
  voiceName,
  voiceState,
  audioInputDevices,
  audioOutputDevices,
  selectedInputId,
  selectedOutputId,
  onChangeInputDevice,
  onChangeOutputDevice,
  onRefreshDevices,
  onPlayTestTone,
  volume,
  onChangeVolume,
  speakerState,
}) => {
  const profile = VOICE_PROFILES_CATALOG[voiceName] || VOICE_PROFILES_CATALOG.Sadaltager;
  const tone = VOCAL_STATES_CATALOG[voiceState] || VOCAL_STATES_CATALOG.raayeq_ameeq;

  return (
    <div className="rounded-2xl p-3 bg-slate-900/90 backdrop-blur-md grid grid-cols-1 lg:grid-cols-12 gap-3 items-center border border-cyan-500/30 shadow-lg text-xs">
      {/* 1. Voice & Tone Bio */}
      <div className="lg:col-span-7 bg-slate-950/90 p-2.5 rounded-xl border border-emerald-500/30 flex flex-col gap-1">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-emerald-300">🎙️ بطاقة الصوت والتون النشط:</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/40 font-bold">
              {profile.gender}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/40 font-bold">
              {profile.timbre}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold">
              {tone.speedTag}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-bold">
              {tone.toneTag}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold ${
              speakerState === 'speaking'
                ? 'text-emerald-400 animate-pulse'
                : speakerState === 'synthesizing'
                ? 'text-purple-300'
                : 'text-slate-400'
            }`}
          >
            {speakerState === 'speaking' ? '🔊 يتحدث الآن' : speakerState === 'synthesizing' ? '⏳ جاري التوليد' : 'جاهز للنطق 🟢'}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
          <b>{profile.id}:</b> {profile.description} | <span className="text-cyan-300 font-semibold">{tone.directive}</span>
        </p>
      </div>

      {/* 2. Hardware Audio Routing */}
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
        {/* Mic Select */}
        <div className="sm:col-span-5 flex items-center gap-1">
          <span className="text-[10px] font-bold text-cyan-300 shrink-0">🎤 المايك:</span>
          <select
            value={selectedInputId}
            onChange={(e) => onChangeInputDevice(e.target.value)}
            className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-slate-200 truncate cursor-pointer"
          >
            <option value="">🎤 المايك الافتراضي</option>
            {audioInputDevices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `ميكروفون ${i + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Output Select */}
        <div className="sm:col-span-5 flex items-center gap-1">
          <span className="text-[10px] font-bold text-emerald-300 shrink-0">🔈 المخرج:</span>
          <select
            value={selectedOutputId}
            onChange={(e) => onChangeOutputDevice(e.target.value)}
            className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-slate-200 truncate cursor-pointer"
          >
            <option value="">🔈 كارت الصوت الافتراضي</option>
            {audioOutputDevices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `كارت صوت ${i + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons & Volume */}
        <div className="sm:col-span-2 flex items-center justify-end gap-1">
          <button
            onClick={onRefreshDevices}
            title="تحديث قائمة الأجهزة"
            className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition"
          >
            🔄
          </button>
          <button
            onClick={onPlayTestTone}
            title="تشغيل نغمة اختبار المخرج"
            className="px-2 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition"
          >
            🔔
          </button>
        </div>

        {/* Volume Slider row */}
        <div className="sm:col-span-12 flex items-center gap-2 pt-1">
          <span className="text-[10px] text-slate-400 font-bold shrink-0">مستوى الصوت:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(e) => onChangeVolume(parseInt(e.target.value, 10) / 100)}
            className="flex-1 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="font-mono text-[10px] text-emerald-300 w-8 text-left">
            {Math.round(volume * 100)}%
          </span>
          <span className="text-[9px] text-slate-500 hidden sm:inline font-mono">
            (كتم المايك: Alt+M)
          </span>
        </div>
      </div>
    </div>
  );
};
