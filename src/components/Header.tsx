/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onOpenRecallModal: () => void;
  onEndSession: () => void;
  onOpenExportModal?: () => void;
  onOpenDriveModal: () => void;
  onOpenQuotaModal: () => void;
  onTogglePersonaDrawer: () => void;
  onOpenDeviceAccessModal?: () => void;
  speakerState: 'idle' | 'speaking' | 'synthesizing' | 'listening';
  speakerLabel: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onOpenRecallModal,
  onEndSession,
  onOpenExportModal,
  onOpenDriveModal,
  onOpenQuotaModal,
  onTogglePersonaDrawer,
  onOpenDeviceAccessModal,
  speakerState,
  speakerLabel,
}) => {
  return (
    <header className="rounded-2xl p-3 md:p-3.5 bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-2xl shadow-lg shrink-0">
          🧠
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm md:text-base font-extrabold bg-gradient-to-r from-blue-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              Gemini Studio & MONAD Sovereign Kernel v6.2
            </h1>
            <span className="text-[10px] md:text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              🏛️ MONAD Strict Lock + Google Drive + Live 3.8 + TTS + Transcribe
            </span>
          </div>
          <p className="text-[10px] md:text-[11px] text-slate-400 mt-0.5">
            iOS iPhone • Android • Laptop Windows/Mac • Fallback Models • Thinking Level HIGH
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Speaker activity badge */}
        <div
          className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 font-bold shadow transition ${
            speakerState === 'speaking'
              ? 'bg-emerald-950/90 border border-emerald-400 text-emerald-200'
              : speakerState === 'synthesizing'
              ? 'bg-purple-950/90 border border-purple-400 text-purple-200'
              : speakerState === 'listening'
              ? 'bg-cyan-950/90 border border-cyan-400 text-cyan-200'
              : 'bg-slate-950 border border-slate-700 text-slate-300'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              speakerState === 'speaking'
                ? 'bg-emerald-400 animate-ping'
                : speakerState === 'synthesizing'
                ? 'bg-purple-400 animate-pulse'
                : speakerState === 'listening'
                ? 'bg-cyan-400 animate-ping'
                : 'bg-emerald-500'
            }`}
          />
          <span className="truncate max-w-[140px] md:max-w-[200px]">{speakerLabel}</span>
        </div>

        {/* Action buttons */}
        <button
          onClick={onOpenRecallModal}
          className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/50 text-purple-200 text-xs font-bold transition flex items-center gap-1 shadow"
          title="استدعاء جلسة سابقة من الذاكرة أو Google Drive"
        >
          <span>📂 الجلسات</span>
        </button>

        <button
          onClick={onEndSession}
          className="px-2.5 py-1.5 rounded-xl bg-rose-600/35 hover:bg-rose-600/60 border border-rose-400/50 text-rose-100 text-xs font-bold transition flex items-center gap-1 shadow"
          title="إنهاء الجلسة وحفظها في Firestore"
        >
          <span>🛑 إنهاء</span>
        </button>

        {onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/50 text-emerald-200 text-xs font-bold transition flex items-center gap-1 shadow"
            title="تصدير سجل المحادثة كملف JSON أو نصي TXT أو Markdown محلياً"
          >
            <span>💾 تصدير محلي</span>
          </button>
        )}

        <button
          onClick={onOpenDriveModal}
          className="px-2.5 py-1.5 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/45 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition flex items-center gap-1 shadow"
          title="مستكشف Google Drive وربط الملفات"
        >
          <span>⚡ Drive</span>
        </button>

        <button
          onClick={onOpenQuotaModal}
          className="px-2.5 py-1.5 rounded-xl bg-amber-600/25 hover:bg-amber-600/45 border border-amber-500/40 text-amber-200 text-xs font-bold transition flex items-center gap-1 shadow"
          title="فحص كوتا السيرفر المباشر"
        >
          <span>❓ الكوتا</span>
        </button>

        <button
          onClick={onTogglePersonaDrawer}
          className="px-2.5 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/45 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition flex items-center gap-1 shadow"
          title="تخصيص البيرسونا ونواة MONAD v6.2 والسجل الثابت"
        >
          <span>🧬 البيرسونا</span>
        </button>

        {onOpenDeviceAccessModal && (
          <button
            onClick={onOpenDeviceAccessModal}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 border border-blue-400/50 text-blue-200 text-xs font-bold transition flex items-center gap-1 shadow"
            title="الوصول والتثبيت على iPhone و Android و Windows (PWA)"
          >
            <span>📱 الأجهزة والتثبيت</span>
          </button>
        )}

        {/* Google Sign-in / User Profile */}
        {user ? (
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-xl border border-emerald-500/40">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-6 h-6 rounded-full border border-emerald-400"
              />
            )}
            <span className="text-xs text-emerald-300 font-bold truncate max-w-[100px]">
              {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
            </span>
            <button
              onClick={onLogout}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-1"
              title="تسجيل الخروج"
            >
              خروج
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{isLoggingIn ? 'جاري الدخول...' : 'تسجيل دخول Google'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
