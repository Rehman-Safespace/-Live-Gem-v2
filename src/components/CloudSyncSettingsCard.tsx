/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, WifiOff, ShieldCheck } from 'lucide-react';

interface CloudSyncSettingsCardProps {
  autoCloudSync: boolean;
  onToggleAutoCloudSync: (enabled: boolean) => void;
  onManualSync: () => Promise<void> | void;
  isLoggedIn: boolean;
  turnsCount: number;
}

export const CloudSyncSettingsCard: React.FC<CloudSyncSettingsCardProps> = ({
  autoCloudSync,
  onToggleAutoCloudSync,
  onManualSync,
  isLoggedIn,
  turnsCount,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const handleManualSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onManualSync();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2500);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="rounded-2xl p-3.5 md:p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title and Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner transition-colors ${
              autoCloudSync
                ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300'
                : 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
            }`}
          >
            {autoCloudSync ? (
              <Cloud className="w-5 h-5 text-cyan-400" />
            ) : (
              <CloudOff className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs md:text-sm font-extrabold text-slate-100">
                المزامنة السحابية التلقائية (Firestore Cloud Sync)
              </h4>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono transition ${
                  autoCloudSync
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-950/90 text-amber-300 border border-amber-500/40'
                }`}
              >
                {autoCloudSync ? '🟢 مفعّلة (تحديث تلقائي مستمر)' : '🟡 متوقفة (وضع توفير البيانات)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {autoCloudSync
                ? 'تتم مزامنة كل دور تلقائياً وحفظه بقاعدة بيانات Firestore السحابية فور انتهاء الرد.'
                : 'تم إيقاف المزامنة التلقائية لتوفير استهلاك الباندويث وباقة الإنترنت. تُحفظ الجلسة محلياً أثناء الحوار.'}
            </p>
          </div>
        </div>

        {/* Toggle Switch and Manual Sync Button */}
        <div className="flex items-center gap-3 shrink-0">
          {!autoCloudSync && isLoggedIn && turnsCount > 0 && (
            <button
              onClick={handleManualSyncClick}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-200 text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              title="مزامنة التغييرات الحالية مع Firestore الآن"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
              ) : justSynced ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-cyan-300" />
              )}
              <span>{isSyncing ? 'جاري المزامنة...' : justSynced ? 'تم الحفظ!' : 'مزامنة يدوية الآن'}</span>
            </button>
          )}

          {/* User Toggle Switch */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300 hidden sm:inline">
              {autoCloudSync ? 'تلقائي' : 'يدوي'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCloudSync}
                onChange={(e) => onToggleAutoCloudSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 border border-slate-700"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Helpful Bandwidth & Local Cache Footer */}
      <div className="flex items-center justify-between text-[10px] md:text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {autoCloudSync ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300/90">سجل الجلسة مؤمن سحابياً في Firestore</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300/90">وضع توفير البيانات نشط — لا يتم استهلاك بيانات الشبكة للمزامنة التلقائية</span>
            </>
          )}
        </div>
        <span className="font-mono text-slate-500">
          عدد أدوار الجلسة: {turnsCount} دور
        </span>
      </div>
    </div>
  );
};
