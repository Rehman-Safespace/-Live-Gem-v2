/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QuotaTelemetryState, QUOTA_TIERS } from '../lib/quotaManager';
import { formatTokensNumber } from '../utils/monadLogic';

interface QuotaTelemetryBarProps {
  telemetry: QuotaTelemetryState;
  quotaTier: string;
  onChangeQuotaTier: (tier: string) => void;
  onOpenInspector: () => void;
  currentContextTokens: number;
  thinkingBudget: number;
}

export const QuotaTelemetryBar: React.FC<QuotaTelemetryBarProps> = ({
  telemetry,
  quotaTier,
  onChangeQuotaTier,
  onOpenInspector,
  currentContextTokens,
  thinkingBudget,
}) => {
  const currentTierConfig = QUOTA_TIERS[quotaTier] || QUOTA_TIERS.paid_tier_1;
  const ctxLimit = telemetry.serverVerifiedInputLimit || currentTierConfig.ctxLimit;
  const ctxUsed = telemetry.tokenSource !== 'heuristic_local' && telemetry.lastPromptTokens > 0
    ? telemetry.lastPromptTokens
    : currentContextTokens;

  const ctxPct = Math.min(100, (ctxUsed / ctxLimit) * 100);
  const ctxRemaining = Math.max(0, ctxLimit - ctxUsed);

  const thinkUsed = telemetry.lastThinkingTokens;
  const thinkPct = thinkingBudget > 0 ? Math.min(100, (thinkUsed / thinkingBudget) * 100) : 0;
  const thinkRemaining = Math.max(0, thinkingBudget - thinkUsed);

  const now = Date.now();
  const minuteReqCount = telemetry.minuteRequestsLog.filter(ts => now - ts < 60000).length;
  const minuteTokensCount = telemetry.minuteTokensLog
    .filter(item => now - item.ts < 60000)
    .reduce((sum, item) => sum + item.tokens, 0);

  const rpmRemaining = Math.max(0, currentTierConfig.rpmLimit - minuteReqCount);
  const tpmRemaining = Math.max(0, currentTierConfig.tpmLimit - minuteTokensCount);
  const rpdRemaining = Math.max(0, currentTierConfig.rpdLimit - telemetry.dailyRequestsUsed);

  return (
    <div className="rounded-2xl p-3 bg-slate-900/90 backdrop-blur-md grid grid-cols-1 md:grid-cols-12 gap-3 items-center border border-indigo-500/35 shadow-lg text-xs">
      {/* 1. Context Window Tokens */}
      <div className="md:col-span-4 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-[11px] gap-1 flex-wrap">
          <span className="font-bold text-cyan-300">🧮 نافذة السياق (Context):</span>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
              telemetry.tokenSource === 'server_usage_metadata'
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                : telemetry.tokenSource === 'server_count_tokens'
                ? 'bg-purple-950/90 text-purple-200 border border-purple-500/50'
                : 'bg-amber-950/90 text-amber-300 border border-amber-500/40'
            }`}
          >
            {telemetry.tokenSource === 'server_usage_metadata'
              ? '✅ رسمي من السيرفر (usageMetadata)'
              : telemetry.tokenSource === 'server_count_tokens'
              ? '✅ رسمي من السيرفر (:countTokens)'
              : '⏳ تقديري محلي (قبل الإرسال)'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-cyan-200 font-bold">
            {ctxUsed.toLocaleString()} / {ctxLimit.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">
            السقف: {formatTokensNumber(ctxLimit)}
          </span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${Math.max(0.5, ctxPct)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>المتبقي: {ctxRemaining.toLocaleString()} ({(100 - ctxPct).toFixed(1)}%)</span>
          <span>آخر دور: {telemetry.lastTotalTokens.toLocaleString()} توكن</span>
        </div>
      </div>

      {/* 2. Thinking Budget Tokens */}
      <div className="md:col-span-3 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-purple-300">💭 توكنز التفكير (Thinking):</span>
          <span className="font-mono text-purple-200 font-bold">
            {thinkUsed.toLocaleString()} / {thinkingBudget.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${thinkPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>المتبقي للدور: {thinkRemaining.toLocaleString()} توكن</span>
          <span>إجمالي التفكير: {telemetry.sessionThinkingTokens.toLocaleString()}</span>
        </div>
        <div className="text-[10px] text-purple-300/80 font-mono truncate">
          أقصى مخرج للنموذج: {telemetry.serverVerifiedOutputLimit.toLocaleString()} توكن
        </div>
      </div>

      {/* 3. Rate Limits & Quota Tier */}
      <div className="md:col-span-5 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-[11px] gap-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-emerald-300">📊 الكوتا المتبقية:</span>
            <button
              onClick={onOpenInspector}
              className="px-2 py-0.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/45 border border-amber-400/70 text-amber-200 text-[10px] font-extrabold transition shadow"
            >
              ❓ ازاي عرف الكوتا؟ (فحص المصدر)
            </button>
          </div>
          <select
            value={quotaTier}
            onChange={(e) => onChangeQuotaTier(e.target.value)}
            className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/40 text-[10px] text-emerald-200 font-bold cursor-pointer"
          >
            <option value="paid_tier_1">💎 Paid Tier 1 (1,000 RPM | 4M TPM)</option>
            <option value="paid_tier_2">🚀 Paid Tier 2 (2,000 RPM | 10M TPM)</option>
            <option value="free_tier">🆓 Free Tier (15 RPM | 1M TPM)</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-[10px] font-mono text-center">
          <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
            <div className="text-slate-400">طلبات/د (RPM)</div>
            <div className="text-emerald-300 font-bold">
              {rpmRemaining} / {currentTierConfig.rpmLimit}
            </div>
          </div>
          <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
            <div className="text-slate-400">توكنز/د (TPM)</div>
            <div className="text-cyan-300 font-bold">
              {formatTokensNumber(tpmRemaining)} / {formatTokensNumber(currentTierConfig.tpmLimit)}
            </div>
          </div>
          <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
            <div className="text-slate-400">اليومي (RPD)</div>
            <div className="text-amber-300 font-bold">
              {rpdRemaining} / {currentTierConfig.rpdLimit}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
