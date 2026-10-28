/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VOICE_PROFILES_CATALOG, VOCAL_STATES_CATALOG } from '../lib/voiceCatalog';
import { PersonaDef } from '../lib/monadLedger';

interface ControlRibbonProps {
  personas: Record<string, PersonaDef>;
  activePersonaId: string;
  onChangePersona: (id: string) => void;
  onOpenNewPersonaForm: () => void;
  engineMode: string;
  onChangeEngineMode: (mode: string) => void;
  preferredModel: string;
  onChangePreferredModel: (model: string) => void;
  thinkingLevel: string;
  onChangeThinkingLevel: (level: string) => void;
  voiceName: string;
  onChangeVoiceName: (voice: string) => void;
  voiceState: string;
  onChangeVoiceState: (state: string) => void;
  onTestVoiceTone: () => void;
  isTestingVoice: boolean;
}

export const ControlRibbon: React.FC<ControlRibbonProps> = ({
  personas,
  activePersonaId,
  onChangePersona,
  onOpenNewPersonaForm,
  engineMode,
  onChangeEngineMode,
  preferredModel,
  onChangePreferredModel,
  thinkingLevel,
  onChangeThinkingLevel,
  voiceName,
  onChangeVoiceName,
  voiceState,
  onChangeVoiceState,
  onTestVoiceTone,
  isTestingVoice,
}) => {
  const activeTone = VOCAL_STATES_CATALOG[voiceState] || VOCAL_STATES_CATALOG.raayeq_ameeq;

  return (
    <div className="rounded-2xl p-3 md:p-3.5 bg-slate-900/90 backdrop-blur-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 shadow-lg border border-slate-800">
      {/* 1. Active Persona */}
      <div className="space-y-1">
        <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
          <span>🎭 البيرسونا النشطة:</span>
          <button
            onClick={onOpenNewPersonaForm}
            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/40 font-bold transition"
          >
            ➕ جديد
          </button>
        </div>
        <select
          value={activePersonaId}
          onChange={(e) => onChangePersona(e.target.value)}
          className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-amber-100 font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
        >
          <optgroup label="🏛️ البيرسونات المعتمدة (MONAD v6.2)">
            {Object.values(personas)
              .filter(p => p.builtin)
              .map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </optgroup>
          {Object.values(personas).some(p => !p.builtin) && (
            <optgroup label="✨ بيرسونات مخصصة">
              {Object.values(personas)
                .filter(p => !p.builtin)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* 2. Engine Mode */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-cyan-300 flex items-center justify-between">
          <span>🚀 نمط التشغيل والمحرك:</span>
          <span className="text-[9px] text-emerald-400">🔄 لايف</span>
        </label>
        <select
          value={engineMode}
          onChange={(e) => onChangeEngineMode(e.target.value)}
          className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-cyan-500/50 text-[11px] text-cyan-100 font-bold cursor-pointer"
        >
          <option value="gemini_app_3_8_thinking">📱 تطبيق جيمناي (تفكير + ديكتيشن + نطق)</option>
          <option value="websocket_live">⚡ Live API Real-Time (gemini-3.8-live)</option>
          <option value="deep_thinking_live">🧠 تفكير عميق (gemini-4-argon)</option>
          <option value="websocket_translate">🌐 ترجمة لايف فورية</option>
        </select>
      </div>

      {/* 3. Thinking Model */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-purple-300 flex items-center justify-between">
          <span>🔬 نموذج التفكير (LLM):</span>
          <span className="text-[10px] text-purple-300 font-mono">
            {preferredModel === 'gemini-4-argon' ? 'Argon 4' : 'Flash'}
          </span>
        </label>
        <select
          value={preferredModel}
          onChange={(e) => onChangePreferredModel(e.target.value)}
          className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-purple-500/50 text-[11px] text-purple-200 font-mono font-bold cursor-pointer"
        >
          <option value="gemini-4-argon">🌌 gemini-4-argon (Complex Tasks)</option>
          <option value="gemini-3.8-flash">🚀 gemini-3.8-flash (General Tasks)</option>
          <option value="gemini-3.1-flash-lite">⚡ gemini-3.1-flash-lite (Fast Tasks)</option>
        </select>
      </div>

      {/* 4. Thinking Level */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-indigo-300 flex items-center justify-between">
          <span>💭 مستوى التفكير (Thinking):</span>
          <span className="text-[10px] text-indigo-200 font-bold">{thinkingLevel}</span>
        </label>
        <select
          value={thinkingLevel}
          onChange={(e) => onChangeThinkingLevel(e.target.value)}
          className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/40 text-[11px] text-indigo-100 font-bold cursor-pointer"
        >
          <option value="HIGH">🔬 HIGH (Reasoning Depth)</option>
          <option value="MEDIUM">⚖️ MEDIUM (Balanced)</option>
          <option value="LOW">⚡ LOW (Fast Reasoning)</option>
          <option value="MINIMAL">🚫 MINIMAL / NONE</option>
        </select>
      </div>

      {/* 5. Voice Selector */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-emerald-300 flex items-center justify-between">
          <span>🎙️ الصوت (10 أصوات):</span>
          <span className="text-[10px] text-emerald-400 font-bold">
            {VOICE_PROFILES_CATALOG[voiceName]?.gender || ''}
          </span>
        </label>
        <select
          value={voiceName}
          onChange={(e) => onChangeVoiceName(e.target.value)}
          className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-emerald-500/50 text-[11px] text-emerald-100 font-bold cursor-pointer"
        >
          {Object.values(VOICE_PROFILES_CATALOG).map(v => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* 6. Vocal State / Tone Selector & Test */}
      <div className="space-y-1">
        <div className="text-xs font-bold text-cyan-300 flex items-center justify-between">
          <span>🗣️ التون وحالة الصوت:</span>
          <span className="text-[10px] text-cyan-400 font-semibold">{activeTone.short}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <select
            value={voiceState}
            onChange={(e) => onChangeVoiceState(e.target.value)}
            className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/50 text-[11px] text-cyan-100 font-bold cursor-pointer"
          >
            {Object.values(VOCAL_STATES_CATALOG).map(s => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={onTestVoiceTone}
            disabled={isTestingVoice}
            className="w-full py-1 px-2 rounded-xl bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 hover:from-emerald-600/60 hover:to-cyan-600/60 border border-emerald-400/50 text-emerald-100 text-[10px] font-extrabold transition flex items-center justify-center gap-1 shadow"
          >
            <span>{isTestingVoice ? '⏳ جاري الاختبار...' : '🔊 تجربة الصوت والتون (Live)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
