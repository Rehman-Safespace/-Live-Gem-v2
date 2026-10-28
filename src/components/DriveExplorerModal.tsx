/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  ArrowRight,
  RefreshCw,
  X,
  Search,
  Plus,
  Trash2,
  Eye,
  HardDrive,
  Check,
  AlertCircle,
  FilePlus,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  fetchDriveFiles,
  fetchDriveFileText,
  createDriveFile,
  deleteDriveFile,
  DriveItem,
} from '../lib/drive';

interface DriveExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onBindItem: (item: DriveItem) => void;
  boundItemIds: Set<string>;
  onExportCurrentToDrive?: () => Promise<void>;
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
  const [successMessage, setSuccessMessage] = useState('');

  // File Preview state
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Create File in Drive state
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Destructive Delete Confirmation state
  const [itemToDelete, setItemToDelete] = useState<DriveItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadFolder = async (folderId: string, search: string = '') => {
    if (!accessToken) {
      setErrorMessage('يرجى تسجيل الدخول بحساب Google أولاً عبر زر تسجيل الدخول.');
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

  const handlePreviewFile = async (item: DriveItem) => {
    if (!accessToken) return;
    setPreviewItem(item);
    setIsPreviewLoading(true);
    setPreviewContent('');
    try {
      const text = await fetchDriveFileText(accessToken, item.id, item.mimeType);
      setPreviewContent(text);
    } catch (err: any) {
      setPreviewContent(`تعذر قراءة محتوى الملف: ${err.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCreateFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFileName.trim()) return;

    setIsSubmittingCreate(true);
    try {
      const created = await createDriveFile(
        accessToken,
        newFileName.trim().endsWith('.txt') ? newFileName.trim() : `${newFileName.trim()}.txt`,
        newFileContent,
        'text/plain',
        currentFolderId
      );
      setIsCreatingFile(false);
      setNewFileName('');
      setNewFileContent('');
      setSuccessMessage(`✅ تم إنشاء الملف "${created.name}" في Google Drive بنجاح!`);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadFolder(currentFolderId, searchQuery);
    } catch (err: any) {
      setErrorMessage(`فشل إنشاء الملف: ${err.message}`);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!accessToken || !itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(accessToken, itemToDelete.id);
      setSuccessMessage(`🗑️ تم حذف "${itemToDelete.name}" من Google Drive بنجاح.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setItemToDelete(null);
      loadFolder(currentFolderId, searchQuery);
    } catch (err: any) {
      setErrorMessage(`فشل حذف الملف: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-4xl w-full p-4 md:p-5 space-y-3.5 shadow-2xl max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm md:text-base font-extrabold text-cyan-300">
                مستكشف Google Drive المتقدم وحافظة الملفات
              </h3>
            </div>
            <p className="text-[11px] text-cyan-200/80 mt-0.5">
              تصفح ملفات ومجلدات حسابك في Google Drive، عاين محتواها، واربطها مباشرة بذاكرة وسياق الذكاء الاصطناعي
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingFile(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ملف جديد في Drive</span>
            </button>
            <button
              onClick={() => loadFolder(currentFolderId, searchQuery)}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1.5 px-3 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={handleNavigateUp}
            disabled={folderHistory.length <= 1}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3" />
            <span>للأعلى</span>
          </button>
          <span className="text-slate-600">|</span>
          {folderHistory.map((h, idx) => (
            <React.Fragment key={h.id}>
              <button
                onClick={() => {
                  setCurrentFolderId(h.id);
                  setFolderHistory(folderHistory.slice(0, idx + 1));
                }}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  idx === folderHistory.length - 1
                    ? 'text-cyan-300 bg-cyan-950/80 border border-cyan-500/30'
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
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="ابحث بالاسم في Google Drive (مثال: تقرير، مشروع، notes، code)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-9 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  loadFolder(currentFolderId, '');
                }}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow cursor-pointer"
          >
            بحث
          </button>
        </form>

        {/* Alerts & Messages */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[240px]">
          {isLoading ? (
            <div className="text-cyan-300 p-8 text-center text-xs font-bold flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>جاري تحميل ملفات ومجلدات Google Drive...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-slate-400 p-8 text-center text-xs flex flex-col items-center justify-center gap-2">
              <HardDrive className="w-8 h-8 text-slate-600" />
              <span>لا توجد ملفات أو مجلدات في هذا المسار.</span>
            </div>
          ) : (
            items.map((item) => {
              const isBound = boundItemIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                    item.isFolder
                      ? 'bg-slate-950/90 hover:bg-slate-850 border-slate-800 cursor-pointer'
                      : isBound
                      ? 'bg-cyan-950/60 border-cyan-500/50'
                      : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800/80'
                  }`}
                  onClick={() => {
                    if (item.isFolder) handleOpenFolder(item);
                  }}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1">
                    <div className="p-1.5 rounded-lg bg-slate-900 text-cyan-400">
                      {item.isFolder ? <Folder className="w-4 h-4 text-amber-400" /> : <FileText className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-bold text-slate-100 truncate">{item.name}</span>
                        {item.slot && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 font-mono font-bold">
                            {item.slot}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : ''}
                        {!item.isFolder && item.sizeMb ? ` • ${item.sizeMb} MB` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!item.isFolder && (
                      <button
                        onClick={() => handlePreviewFile(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                        title="معاينة محتوى الملف"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>معاينة</span>
                      </button>
                    )}

                    <button
                      onClick={() => onBindItem(item)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition shadow flex items-center gap-1 cursor-pointer ${
                        isBound
                          ? 'bg-emerald-600 text-white'
                          : 'bg-cyan-600/30 hover:bg-cyan-600/60 border border-cyan-400 text-cyan-200'
                      }`}
                    >
                      {isBound ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{isBound ? 'مرتبط بالسياق' : 'ربط بالسياق'}</span>
                    </button>

                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 transition cursor-pointer"
                      title="حذف من Google Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: File Preview */}
        {previewItem && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-cyan-500/60 rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs md:text-sm font-bold text-cyan-200 truncate">{previewItem.name}</h4>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[55vh]">
                {isPreviewLoading ? (
                  <div className="p-8 text-center text-cyan-400">جاري قراءة محتوى الملف من Google Drive...</div>
                ) : (
                  previewContent || 'الملف فارغ أو لا يحتوي على نص قابل للقراءة.'
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                <span className="text-[11px] text-slate-400">
                  {previewItem.sizeMb ? `${previewItem.sizeMb} MB` : ''} • {previewItem.mimeType}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onBindItem(previewItem);
                      setPreviewItem(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                  >
                    ربط هذا الملف بالسياق
                  </button>
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create File in Google Drive */}
        {isCreatingFile && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/60 rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FilePlus className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-bold text-emerald-200">إنشاء ملف نصي جديد في Google Drive</h4>
                </div>
                <button
                  onClick={() => setIsCreatingFile(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateFileSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">اسم الملف:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ملاحظات_المشروع.txt"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">محتوى الملف:</label>
                  <textarea
                    rows={6}
                    placeholder="اكتب المحتوى أو الصق النص هنا..."
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFile(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow"
                  >
                    {isSubmittingCreate ? 'جاري الرفع لـ Drive...' : 'حفظ في Drive'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Mandatory Confirmation for Destructive Delete */}
        {itemToDelete && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-500/70 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h4 className="text-sm md:text-base font-extrabold text-rose-200">
                  تأكيد حذف الملف من Google Drive
                </h4>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-rose-950/30 p-3 rounded-xl border border-rose-900/40">
                هل أنت متأكد من رغبتك في حذف{' '}
                <strong className="text-white">"{itemToDelete.name}"</strong> من حسابك في Google Drive نهائياً؟
                <br />
                <span className="text-rose-400 font-semibold block mt-1">
                  ⚠️ هذا الإجراء لا يمكن التراجع عنه.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setItemToDelete(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow flex items-center gap-1.5"
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، حذف نهائياً'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
