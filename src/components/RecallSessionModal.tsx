/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SavedSession } from '../lib/firestoreStore';

interface RecallSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SavedSession[];
  onResumeSession: (session: SavedSession) => void;
  onInjectMemory: (session: SavedSession) => void;
  onDeleteSession: (sessionId: string) => void;
  injectedSessionIds: Set<string>;
}

export const RecallSessionModal: React.FC<RecallSessionModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onResumeSession,
  onInjectMemory,
  onDeleteSession,
  injectedSessionIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filtered = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.turns?.some(t => t.userInput.toLowerCase().includes(q) || t.modelOutput.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
      <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-3xl w-full p-4 md:p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📂</span>
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-purple-300">
                استدعاء جلسة سابقة من مخزن Firestore السحابي
              </h3>
              <p className="text-[11px] text-slate-400">
                افتح أي جلسة سابقة لاستكمالها في الشات بنسخة لاحقة (v+1)، أو احقنها كذاكرة حية في اللايف
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold"
          >
            ✖ إغلاق
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 ابحث في المحادثات بالعنوان أو المحتوى..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100"
        />

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px]">
          {filtered.length === 0 ? (
            <div className="text-slate-400 p-8 text-center text-xs">
              لا توجد جلسات محفوظة مطابقة. احفظ الجلسة الحالية أولاً لتظهر هنا.
            </div>
          ) : (
            filtered.map((sess) => {
              const isInjected = injectedSessionIds.has(sess.sessionId);
              const lastSnippet = sess.turns && sess.turns.length > 0
                ? (sess.turns[sess.turns.length - 1].modelOutput || sess.turns[sess.turns.length - 1].userInput).slice(0, 140)
                : '';

              return (
                <div
                  key={sess.sessionId}
                  className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-purple-500/40 flex flex-col gap-2 transition"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-emerald-300">{sess.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
                        {sess.versionTag}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                        {sess.turnCount || sess.turns?.length || 0} أدوار
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      🕒 {sess.updatedAt ? new Date(sess.updatedAt).toLocaleDateString() : ''} | {sess.llmModel}
                    </span>
                  </div>

                  {lastSnippet && (
                    <div className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {lastSnippet}...
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => {
                        onResumeSession(sess);
                        onClose();
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
                    >
                      📂 فتح واستكمال في الشات (بترميز جديد v+1)
                    </button>
                    <button
                      onClick={() => onInjectMemory(sess)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition shadow ${
                        isInjected
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400 text-purple-200'
                      }`}
                    >
                      {isInjected ? '✓ مدمجة في الذاكرة الحية' : '🧠 حقن كذاكرة حية في الجلسة'}
                    </button>
                    <button
                      onClick={() => onDeleteSession(sess.sessionId)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-rose-300 text-xs font-bold"
                      title="حذف الجلسة"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
