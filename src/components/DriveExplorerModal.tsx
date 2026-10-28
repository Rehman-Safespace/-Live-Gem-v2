/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { fetchDriveFiles, DriveItem } from '../lib/drive';

interface DriveExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onBindItem: (item: DriveItem) => void;
  boundItemIds: Set<string>;
}

export const DriveExplorerModal: React.FC<DriveExplorerModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onBindItem,
  boundItemIds,
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'MyDrive (الرئيسي)' },
  ]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadFolder = async (folderId: string, search: string = '') => {
    if (!accessToken) {
      setErrorMessage('يرجى تسجيل الدخول بحساب Google أولاً عبر زر (تسجيل دخول Google) بالأعلى.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetchDriveFiles(accessToken, folderId, search);
      setItems(res.files);
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر تحميل ملفات Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFolder(currentFolderId, searchQuery);
    }
  }, [isOpen, accessToken, currentFolderId]);

  if (!isOpen) return null;

  const handleOpenFolder = (folder: DriveItem) => {
    setCurrentFolderId(folder.id);
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateUp = () => {
    if (folderHistory.length <= 1) return;
    const newHist = [...folderHistory];
    newHist.pop();
    const parent = newHist[newHist.length - 1];
    setFolderHistory(newHist);
    setCurrentFolderId(parent.id);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFolder(currentFolderId, searchQuery);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-4xl w-full p-4 md:p-5 space-y-3.5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="text-sm md:text-base font-extrabold text-cyan-300">
                مستكشف Google Drive لربط ملفات ومجلدات QURAN_PART_1..10 والسجل بالسياق
              </h3>
            </div>
            <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
              تصفح مجلداتك السحابية واربط أي ملف أو مجلد مباشرة بجلسة الذكاء الاصطناعي وبنك الذاكرة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadFolder(currentFolderId, searchQuery)}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-xs font-bold transition"
            >
              🔄 تحديث
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold"
            >
              ✖ إغلاق
            </button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1 px-2.5 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={handleNavigateUp}
            disabled={folderHistory.length <= 1}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold"
          >
            ⬅️ لأعلى
          </button>
          <span className="text-slate-500">|</span>
          {folderHistory.map((h, idx) => (
            <React.Fragment key={h.id}>
              <button
                onClick={() => {
                  setCurrentFolderId(h.id);
                  setFolderHistory(folderHistory.slice(0, idx + 1));
                }}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  idx === folderHistory.length - 1
                    ? 'text-cyan-300 bg-cyan-950/80'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {h.name}
              </button>
              {idx < folderHistory.length - 1 && <span className="text-slate-600">/</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="🔍 ابحث بالاسم في Google Drive (مثال: quran_part, monad, ledger)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow"
          >
            بحث
          </button>
        </form>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[240px]">
          {isLoading ? (
            <div className="text-cyan-300 p-8 text-center text-xs font-bold">
              ⚡ جاري قراءة ملفات Google Drive بسرعة...
            </div>
          ) : items.length === 0 ? (
            <div className="text-slate-400 p-8 text-center text-xs">
              لا توجد ملفات أو مجلدات في هذا المسار.
            </div>
          ) : (
            items.map((item) => {
              const isBound = boundItemIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                    item.isFolder
                      ? 'bg-slate-950/90 hover:bg-slate-800/80 border-slate-800 cursor-pointer'
                      : isBound
                      ? 'bg-cyan-950/60 border-cyan-500/50'
                      : 'bg-slate-950/70 border-slate-800/80'
                  }`}
                  onClick={() => {
                    if (item.isFolder) handleOpenFolder(item);
                  }}
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <span className="text-base">{item.isFolder ? '📁' : '📄'}</span>
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {item.name}
                    </span>
                    {item.slot && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 font-mono font-bold">
                        {item.slot}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!item.isFolder && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.sizeMb || 0} MB
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBindItem(item);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition shadow ${
                        isBound
                          ? 'bg-emerald-600 text-white'
                          : 'bg-cyan-600/30 hover:bg-cyan-600/60 border border-cyan-400 text-cyan-200'
                      }`}
                    >
                      {isBound ? '✓ مرتبط بالسياق' : '📎 ربط بالسياق'}
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
