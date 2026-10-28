/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QuotaTelemetryState } from '../lib/quotaManager';

interface QuotaInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: QuotaTelemetryState;
  activeModel: string;
  onRunServerProbe: () => Promise<any>;
  onRunCountTokensProbe: () => Promise<any>;
  customRpm: number;
  customTpm: number;
  customRpd: number;
  onSaveCustomLimits: (rpm: number, tpm: number, rpd: number) => void;
}

export const QuotaInspectorModal: React.FC<QuotaInspectorModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  activeModel,
  onRunServerProbe,
  onRunCountTokensProbe,
  customRpm,
  customTpm,
  customRpd,
  onSaveCustomLimits,
}) => {
  const [probeResultText, setProbeResultText] = useState<string>('');
  const [isLoadingProbe, setIsLoadingProbe] = useState(false);
  const [rpmInput, setRpmInput] = useState(String(customRpm || ''));
  const [tpmInput, setTpmInput] = useState(String(customTpm || ''));
  const [rpdInput, setRpdInput] = useState(String(customRpd || ''));

  if (!isOpen) return null;

  const handleModelProbe = async () => {
    setIsLoadingProbe(true);
    setProbeResultText('⏳ جاري الاتصال بنقطة النهاية GET /v1beta/models/...');
    try {
      const data = await onRunServerProbe();
      setProbeResultText(
        `✅ استجابة السيرفر الرسمية:\n• اسم النموذج: ${data.displayName || data.name}\n• نافذة الإدخال (inputTokenLimit): ${Number(data.inputTokenLimit || 0).toLocaleString()} توكن\n• سقف المخرجات (outputTokenLimit): ${Number(data.outputTokenLimit || 0).toLocaleString()} توكن`
      );
    } catch (err: any) {
      setProbeResultText(`❌ خطأ في الاتصال: ${err.message}`);
    } finally {
      setIsLoadingProbe(false);
    }
  };

  const handleCountTokensProbe = async () => {
    setIsLoadingProbe(true);
    setProbeResultText('⏳ جاري إرسال سياق المحادثة إلى POST /v1beta/models/{model}:countTokens...');
    try {
      const data = await onRunCountTokensProbe();
      setProbeResultText(
        `✅ نتيجة حساب التوكنز الرسمية (:countTokens):\n• إجمالي التوكنز الفعلي للسياق الحالي = ${Number(data.totalTokens || 0).toLocaleString()} توكن بالضبط!`
      );
    } catch (err: any) {
      setProbeResultText(`❌ خطأ في الاستدعاء: ${err.message}`);
    } finally {
      setIsLoadingProbe(false);
    }
  };

  const handleSaveLimits = () => {
    onSaveCustomLimits(
      parseInt(rpmInput, 10) || 0,
      parseInt(tpmInput, 10) || 0,
      parseInt(rpdInput, 10) || 0
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-4xl w-full p-4 md:p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-emerald-300">
                إزاي الاستوديو بيعرف ويحسب الكوتا والتوكنز؟ (شفافية المصدر + فحص السيرفر الحي)
              </h3>
              <p className="text-[11px] text-slate-400">
                تفصيل دقيق لمصدر كل رقم في شريط الكوتا: ما يأتي رسمياً من سيرفر Google وما يُحسب محلياً.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleModelProbe}
              disabled={isLoadingProbe}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-extrabold shadow transition"
            >
              ⚡ 1. افحص سقف النموذج (models.get)
            </button>
            <button
              onClick={handleCountTokensProbe}
              disabled={isLoadingProbe}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow transition"
            >
              🧮 2. احسب توكنز السياق الرسمي (:countTokens)
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold"
            >
              ✖ إغلاق
            </button>
          </div>
        </div>

        {/* Live Server Probe Result Box */}
        {probeResultText && (
          <div className="rounded-xl bg-slate-950 border border-cyan-500/40 p-3.5 text-xs font-mono space-y-1">
            <div className="text-cyan-300 font-bold">🛰️ حالة الفحص المباشر من سيرفر Google Generative Language API:</div>
            <pre className="text-emerald-300 whitespace-pre-wrap">{probeResultText}</pre>
          </div>
        )}

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-cyan-500/30 space-y-1.5">
            <div className="font-extrabold text-cyan-300 flex items-center justify-between">
              <span>1️⃣ نافذة السياق (1,048,576 توكن)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/40">
                رسمي 100%
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              • <b>إزاي عرف الرقم ده؟</b> يستدعي الاستوديو سيرفر جوجل عبر <code>GET /v1beta/models/{activeModel}</code> ويقرأ الحقل الرسمي <code>inputTokenLimit</code> وحقل <code>outputTokenLimit</code>.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-500/30 space-y-1.5">
            <div className="font-extrabold text-purple-300 flex items-center justify-between">
              <span>2️⃣ التوكنز المستهلكة (Prompt & Thoughts)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-500/40">
                usageMetadata
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              • <b>قبل الإرسال:</b> يحسبها تقريبياً (الحروف ÷ 3.2)، وبمجرد رد جيمناي يرسل السيرفر كائن <code>usageMetadata</code> الذي يحمل الأرقام الرسمية الدقيقة (promptTokenCount و thoughtsTokenCount و candidatesTokenCount).
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 space-y-1.5">
            <div className="font-extrabold text-amber-300 flex items-center justify-between">
              <span>3️⃣ كوتا الدقيقة واليوم (RPM / TPM / RPD)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-500/40">
                عداد زمني حي
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              • <b>إزاي بيعرف حدود الدقيقة؟</b> يتيح لك اختيار شريحتك (Paid Tier 1 / Paid Tier 2 / Free Tier) ويطرح منها كل طلب وتوكن فعلي في نافذة زمنية منزلقة قدرها 60 ثانية.
            </p>
          </div>
        </div>

        {/* Live Numbers Breakdown */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="font-bold text-indigo-300">🧮 تفصيل أرقام جلستك الحالية:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">آخر Prompt رسمي (السيرفر)</div>
              <div className="text-emerald-300 font-bold">{telemetry.lastPromptTokens.toLocaleString()} tok</div>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">آخر تفكير رسمي (Thoughts)</div>
              <div className="text-purple-300 font-bold">{telemetry.lastThinkingTokens.toLocaleString()} tok</div>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">آخر إجابة صادرة (Candidates)</div>
              <div className="text-cyan-300 font-bold">{telemetry.lastCandidateTokens.toLocaleString()} tok</div>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">إجمالي طلبات الجلسة</div>
              <div className="text-amber-300 font-bold">{telemetry.dailyRequestsUsed} طلب ({telemetry.sessionTotalTokens.toLocaleString()} tok)</div>
            </div>
          </div>
        </div>

        {/* Custom Override */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-2 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-emerald-300">⚙️ تخصيص يدوي لأرقام الكوتا (اختياري):</span>
            <button
              onClick={handleSaveLimits}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
            >
              💾 حفظ وتطبيق الحدود المخصصة
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">حد الطلبات في الدقيقة (RPM):</label>
              <input
                type="number"
                min="0"
                value={rpmInput}
                onChange={(e) => setRpmInput(e.target.value)}
                placeholder="0 = استخدام الافتراضي"
                className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-emerald-200 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">حد التوكنز في الدقيقة (TPM):</label>
              <input
                type="number"
                min="0"
                value={tpmInput}
                onChange={(e) => setTpmInput(e.target.value)}
                placeholder="0 = استخدام الافتراضي"
                className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-cyan-200 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">حد الطلبات اليومي (RPD):</label>
              <input
                type="number"
                min="0"
                value={rpdInput}
                onChange={(e) => setRpdInput(e.target.value)}
                placeholder="0 = استخدام الافتراضي"
                className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-200 font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
