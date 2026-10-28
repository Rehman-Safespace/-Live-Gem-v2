/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PersonaDef } from '../lib/monadLedger';

interface PersonaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Record<string, PersonaDef>;
  activePersona: PersonaDef;
  onSelectPersona: (id: string) => void;
  onSavePersona: (persona: PersonaDef) => void;
  onDeleteCustomPersona: (id: string) => void;
  onResetToMonadDefault: () => void;
  strictMonad: boolean;
  onToggleStrictMonad: (enabled: boolean) => void;
  onSaveToCloud: () => void;
}

export const PersonaDrawer: React.FC<PersonaDrawerProps> = ({
  isOpen,
  onClose,
  personas,
  activePersona,
  onSelectPersona,
  onSavePersona,
  onDeleteCustomPersona,
  onResetToMonadDefault,
  strictMonad,
  onToggleStrictMonad,
  onSaveToCloud,
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'ledger' | 'rules'>('system');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDomain, setNewDomain] = useState('');

  // Editable fields based on active persona
  const [userName, setUserName] = useState(activePersona.userName);
  const [domain, setDomain] = useState(activePersona.domain);
  const [systemInstruction, setSystemInstruction] = useState(activePersona.system);
  const [memoryBank, setMemoryBank] = useState(activePersona.memory);
  const [conversationRules, setConversationRules] = useState(activePersona.rules);

  // Sync state when activePersona changes
  React.useEffect(() => {
    setUserName(activePersona.userName);
    setDomain(activePersona.domain);
    setSystemInstruction(activePersona.system);
    setMemoryBank(activePersona.memory);
    setConversationRules(activePersona.rules);
  }, [activePersona]);

  if (!isOpen) return null;

  const handleCreateNewPersona = () => {
    if (!newTitle.trim()) return;
    const customId = `custom_${Date.now()}`;
    const created: PersonaDef = {
      id: customId,
      title: `✨ ${newTitle.trim()}`,
      userName: userName.trim() || newTitle.trim(),
      domain: newDomain.trim() || domain.trim(),
      system: systemInstruction,
      memory: memoryBank,
      rules: conversationRules,
      strictMonad,
      builtin: false,
    };
    onSavePersona(created);
    setIsCreatingNew(false);
    setNewTitle('');
    setNewDomain('');
  };

  return (
    <div className="rounded-2xl p-4 md:p-5 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl space-y-4">
      {/* Drawer Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm md:text-base font-extrabold text-indigo-300">
            🧬 استوديو البيرسونا ونواة MONAD Sovereign Kernel v6.2 + السجل الثابت
          </h2>
          <p className="text-[11px] text-slate-400">
            تحكم كامل في هوية النموذج، محركات القياس الـ 14، ومصفوفة السجل الثابت لملفات QURAN_PART_1..10
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/50 text-[11px] text-amber-200 font-extrabold cursor-pointer shadow">
            <input
              type="checkbox"
              checked={strictMonad}
              onChange={(e) => onToggleStrictMonad(e.target.checked)}
              className="rounded text-amber-500"
            />
            <span>🔒 قفل إلزام MONAD v6.2 الصارم</span>
          </label>

          <button
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-xs font-bold transition"
          >
            ➕ إنشاء بيرسونا
          </button>

          <button
            onClick={onResetToMonadDefault}
            className="px-3 py-1.5 rounded-xl bg-rose-900/40 hover:bg-rose-800/60 border border-rose-500/50 text-rose-200 text-xs font-extrabold transition"
          >
            🔄 استرجاع MONAD v6.2
          </button>

          {!activePersona.builtin && (
            <button
              onClick={() => onDeleteCustomPersona(activePersona.id)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-rose-200 text-xs font-bold transition"
            >
              🗑️ حذف
            </button>
          )}

          <button
            onClick={onSaveToCloud}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
          >
            💾 حفظ التعديلات في Firestore
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            ✖ إغلاق
          </button>
        </div>
      </div>

      {/* New Persona Creation Sub-panel */}
      {isCreatingNew && (
        <div className="rounded-xl bg-slate-950 border border-amber-500/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-amber-300">✨ حفظ الحقول الحالية كبيرسونا جديدة</span>
            <button onClick={() => setIsCreatingNew(false)} className="text-slate-400 hover:text-slate-200 text-xs">
              ✖ إلغاء
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="اسم البيرسونا الجديدة..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
            />
            <input
              type="text"
              placeholder="المجال أو التخصص..."
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
            />
          </div>
          <button
            onClick={handleCreateNewPersona}
            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow"
          >
            ✅ تأكيد الحفظ في السحابة
          </button>
        </div>
      )}

      {/* User & Domain Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-300">اسم المستخدم / الهوية المشغلة:</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-emerald-200 font-semibold"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-300">المجال والنطاق التشغيلي:</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-200 font-semibold"
          />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 text-xs font-bold gap-2">
        <button
          onClick={() => setActiveTab('system')}
          className={`py-2 px-3 border-b-2 transition ${
            activeTab === 'system'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🎯 القسم الأول: MONAD_SYSTEM_PROMPT ({systemInstruction.length.toLocaleString()} chars)
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-2 px-3 border-b-2 transition ${
            activeTab === 'ledger'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📚 القسم الثاني: MONAD_IMMUTABLE_LEDGER ({memoryBank.length.toLocaleString()} chars)
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`py-2 px-3 border-b-2 transition ${
            activeTab === 'rules'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📏 القسم الثالث: خريطة الأجزاء الـ 10 ({conversationRules.length.toLocaleString()} chars)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'system' && (
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400">
            البروتوكول السداسي، التفكيك العكسي، محركات القياس الـ 14، واللهجة المصرية الدارجة الكثيفة:
          </div>
          <textarea
            rows={10}
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 font-mono leading-relaxed"
          />
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400">
            السجل العددي، قاموس مانع التشويش (Anti-Spin)، ومصفوفة الشفع والوتر:
          </div>
          <textarea
            rows={10}
            value={memoryBank}
            onChange={(e) => setMemoryBank(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-200 font-mono leading-relaxed"
          />
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400">
            توزيع السور والآيات على ملفات QURAN_PART_1..10 وإلزاميات المخرج النهائي:
          </div>
          <textarea
            rows={10}
            value={conversationRules}
            onChange={(e) => setConversationRules(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-emerald-200 font-mono leading-relaxed"
          />
        </div>
      )}
    </div>
  );
};
