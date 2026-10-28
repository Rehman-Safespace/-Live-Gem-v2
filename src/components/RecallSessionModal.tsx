/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, X, Tag, ArrowUpDown, Trash2, FolderOpen, Brain, Download, Sparkles } from 'lucide-react';
import { SavedSession } from '../lib/firestoreStore';

interface RecallSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SavedSession[];
  onResumeSession: (session: SavedSession) => void;
  onInjectMemory: (session: SavedSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onExportSession?: (session: SavedSession) => void;
  injectedSessionIds: Set<string>;
}

export const RecallSessionModal: React.FC<RecallSessionModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onResumeSession,
  onInjectMemory,
  onDeleteSession,
  onExportSession,
  injectedSessionIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersionTag, setSelectedVersionTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'turns' | 'title'>('updated');

  // Extract distinct version tags to provide quick-filter badges
  const distinctVersionTags = useMemo(() => {
    const tags = new Set<string>();
    sessions.forEach(s => {
      if (s.versionTag) tags.add(s.versionTag.trim());
    });
    return Array.from(tags).sort();
  }, [sessions]);

  // Filter and sort sessions
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return sessions
      .filter((sess) => {
        // Tag badge filter
        if (selectedVersionTag !== 'all' && sess.versionTag !== selectedVersionTag) {
          return false;
        }

        // If no query string, keep all that passed the tag filter
        if (!q) return true;

        // 1. Match title
        const titleMatch = sess.title?.toLowerCase().includes(q);

        // 2. Match version tag (e.g. "v001", "v002", "v")
        const versionTagMatch = sess.versionTag?.toLowerCase().includes(q);

        // 3. Match title slug
        const slugMatch = sess.titleSlug?.toLowerCase().includes(q);

        // 4. Match model
        const modelMatch = sess.llmModel?.toLowerCase().includes(q);

        // 5. Match within turns content
        const turnsMatch = sess.turns?.some(
          (t) =>
            t.userInput?.toLowerCase().includes(q) ||
            t.modelOutput?.toLowerCase().includes(q)
        );

        return Boolean(titleMatch || versionTagMatch || slugMatch || modelMatch || turnsMatch);
      })
      .sort((a, b) => {
        if (sortBy === 'turns') {
          const aCount = a.turnCount ?? a.turns?.length ?? 0;
          const bCount = b.turnCount ?? b.turns?.length ?? 0;
          return bCount - aCount;
        }
        if (sortBy === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [sessions, searchQuery, selectedVersionTag, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
      <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-3xl w-full p-4 md:p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📂</span>
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-purple-300">
                استدعاء جلسة سابقة من أرشيف Firestore
              </h3>
              <p className="text-[11px] text-slate-400">
                افتح أي جلسة سابقة لاستكمالها في الشات بنسخة لاحقة (v+1)، أو احقنها كذاكرة حية في اللايف
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>إغلاق</span>
          </button>
        </div>

        {/* Search Bar & Filters Section */}
        <div className="space-y-2.5">
          <div className="relative flex items-center">
            <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center">
              <Search className="w-4 h-4 text-purple-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث بالعنوان أو رمز النسخة (مثل v001) أو محتوى الحوار..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-9 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs md:text-sm text-slate-100 placeholder:text-slate-500 transition outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 text-slate-400 hover:text-slate-200 p-1 rounded-md transition"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick controls: Version tag pills & Sort select */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            {/* Version Tag Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-purple-400" />
                <span>النسخة:</span>
              </span>
              <button
                onClick={() => setSelectedVersionTag('all')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                  selectedVersionTag === 'all'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                الكل ({sessions.length})
              </button>
              {distinctVersionTags.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedVersionTag(tag)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                    selectedVersionTag === tag
                      ? 'bg-purple-600 text-white font-bold border border-purple-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Counter & Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                {filtered.length} من {sessions.length}
              </span>
              <div className="flex items-center gap-1 text-[11px] bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-slate-300">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-200 outline-none text-[11px] cursor-pointer"
                >
                  <option value="updated" className="bg-slate-900">الأحدث تاريخاً</option>
                  <option value="turns" className="bg-slate-900">الأكثر أدواراً</option>
                  <option value="title" className="bg-slate-900">أبجدياً بالاسم</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[260px]">
          {filtered.length === 0 ? (
            <div className="text-slate-400 p-8 text-center text-xs flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">🔍</span>
              {searchQuery || selectedVersionTag !== 'all' ? (
                <>
                  <p className="text-slate-300 font-medium">
                    لا توجد جلسات تطابق البحث {searchQuery ? `"${searchQuery}"` : ''} {selectedVersionTag !== 'all' ? `مع رمز النسخة [${selectedVersionTag}]` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    جرب البحث بعنوان آخر، أو برمز النسخة مثل v001، أو مسح الفلاتر.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedVersionTag('all');
                    }}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-bold transition"
                  >
                    مسح كافة الفلاتر والبحث
                  </button>
                </>
              ) : (
                <p>لا توجد جلسات محفوظة في السحابة حتى الآن. احفظ الجلسة الحالية أولاً لتظهر هنا.</p>
              )}
            </div>
          ) : (
            filtered.map((sess) => {
              const isInjected = injectedSessionIds.has(sess.sessionId);
              const lastSnippet =
                sess.turns && sess.turns.length > 0
                  ? (
                      sess.turns[sess.turns.length - 1].modelOutput ||
                      sess.turns[sess.turns.length - 1].userInput
                    ).slice(0, 140)
                  : '';

              const isTitleMatched =
                Boolean(searchQuery.trim()) &&
                sess.title?.toLowerCase().includes(searchQuery.trim().toLowerCase());
              const isTagMatched =
                Boolean(searchQuery.trim()) &&
                sess.versionTag?.toLowerCase().includes(searchQuery.trim().toLowerCase());

              return (
                <div
                  key={sess.sessionId}
                  className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-purple-500/40 flex flex-col gap-2.5 transition shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs md:text-sm font-extrabold ${
                          isTitleMatched ? 'text-amber-300 underline decoration-amber-500/60' : 'text-emerald-300'
                        }`}
                      >
                        {sess.title}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          isTagMatched
                            ? 'bg-amber-950 text-amber-300 border border-amber-500 font-bold'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {sess.versionTag || 'v001'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                        {sess.turnCount || sess.turns?.length || 0} أدوار
                      </span>
                      {sess.boundDriveFiles && sess.boundDriveFiles.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-600/30 font-mono">
                          📁 {sess.boundDriveFiles.length} ملفات مقترنة
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      🕒 {sess.updatedAt ? new Date(sess.updatedAt).toLocaleDateString() : ''} | {sess.llmModel}
                    </span>
                  </div>

                  {lastSnippet && (
                    <div className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-800/40 font-sans">
                      {lastSnippet}...
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => {
                        onResumeSession(sess);
                        onClose();
                      }}
                      className="flex-1 min-w-[200px] py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>استكمال في الشات (بنسخة {sess.versionTag ? `v+1` : 'جديدة'})</span>
                    </button>
                    <button
                      onClick={() => onInjectMemory(sess)}
                      className={`flex-1 min-w-[180px] py-1.5 px-3 rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5 cursor-pointer ${
                        isInjected
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400 text-purple-200'
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>{isInjected ? '✓ مدمجة في الذاكرة الحية' : 'حقن كذاكرة حية في الجلسة'}</span>
                    </button>
                    {onExportSession && (
                      <button
                        onClick={() => onExportSession(sess)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                        title="تصدير هذه الجلسة محلياً بصيغة JSON أو TXT"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تصدير</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteSession(sess.sessionId)}
                      className="p-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600/80 text-rose-300 text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      title="حذف الجلسة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
