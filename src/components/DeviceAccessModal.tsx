/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface DeviceAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceAccessModal: React.FC<DeviceAccessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'windows' | 'troubleshoot'>('ios');
  const [copied, setCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Fallback to production Cloud Run URL if window is unavailable or localhost
  const targetUrl = typeof window !== 'undefined' && window.location.origin.includes('run.app')
    ? window.location.origin
    : 'https://ais-pre-3stxwlwuxygxqrqi4q3pj2-182557898655.europe-west1.run.app';

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(targetUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: Error) => console.warn('QR generation error:', err));
    }
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = targetUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Failed to copy URL:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-lg shrink-0">
              📱
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                الوصول والتثبيت على iPhone و Android و Windows
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                دليل تشغيل Gemini Studio & MONAD Kernel كتطبيق كامل (PWA) على جميع أجهزتك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold transition"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Quick URL & QR Hero Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-cyan-950/20 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            {/* Direct Link box */}
            <div className="w-full sm:flex-1 space-y-2">
              <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <span>🌐 رابط التطبيق المباشر (HTTPS مُعتمد):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={targetUrl}
                  className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-700 text-xs font-mono text-cyan-200 select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-lg ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                🔒 يدعم اتصال HTTPS المشفر بالكامل لتشغيل الميكروفون والصوت التفاعلي Live 3.8 بدون قيود.
              </p>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex flex-col items-center p-2.5 rounded-2xl bg-white border-2 border-indigo-500/40 shadow-xl shrink-0">
                <img
                  src={qrDataUrl}
                  alt="QR Code for Mobile Access"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg"
                />
                <span className="text-[10px] text-slate-800 font-bold mt-1 text-center font-sans">
                  امسح بكاميرا الهاتف 📷
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/80 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ios')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'ios'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>🍏</span>
            <span>iPhone / iPad (iOS Safari)</span>
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'android'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>🤖</span>
            <span>Android (Google Chrome)</span>
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'windows'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>💻</span>
            <span>Windows PC / Mac Laptop</span>
          </button>
          <button
            onClick={() => setActiveTab('troubleshoot')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'troubleshoot'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>🛠️</span>
            <span>إعدادات الميكروفون والصوت</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {activeTab === 'ios' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-blue-300">
                <span className="text-lg">🍏</span>
                <span>طريقة التثبيت والتشغيل على iPhone و iPad (متصفح Safari):</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                    <span>افتح الرابط في Safari</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    امسح رمز الاستجابة السريعة (QR) بكاميرا الآيفون، أو افتح متصفح <strong>Safari</strong> وألصق الرابط.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
                    <span>زر المشاركة (Share)</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    اضغط على زر المشاركة أسفل الشاشة (أيقونة المربع التي ينبثق منها سهم للأعلى <strong>⎋ / Share</strong>).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
                    <span>إضافة إلى الشاشة الرئيسية</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    مرر للأسفل في القائمة واضغط على <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen ➕)</strong>، ثم اضغط <strong>"إضافة" (Add)</strong> بالأعلى.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">4</span>
                    <span>صلاحية الميكروفون والصوت</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    عند تشغيل الصوت الحي (Live Voice) أو التفريغ الصوتي، اختر <strong>"سماح" (Allow)</strong> لاستخدام الميكروفون. تأكد من إيقاف وضع الصامت (Silent Switch) لسماع ردود جيمناي.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-2.5 text-blue-200 text-xs">
                <span className="text-base shrink-0">💡</span>
                <span>
                  <strong>ميزة مهمة للآيفون:</strong> بعد الإضافة للشاشة الرئيسية، سيفتح التطبيق بدون أشرطة سفاري وبملء الشاشة وكأنه تطبيق أصلي مثبت من App Store!
                </span>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <span className="text-lg">🤖</span>
                <span>طريقة التثبيت والتشغيل على هواتف Android (Samsung, Pixel, Xiaomi, إلخ):</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
                    <span>افتح الرابط في Google Chrome</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    امسح الـ QR أو افتح متصفح كروم وألصق الرابط المباشر.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
                    <span>تثبيت التطبيق (Install App)</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    اضغط على أيقونة القائمة (⋮) أعلى اليمين، ثم اختر <strong>"تثبيت التطبيق" (Install App)</strong> أو "إضافة إلى الشاشة الرئيسية".
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
                    <span>رمز التطبيق الفوري</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    سيظهر رمز Gemini Studio في قائمة التطبيقات وشاشة هاتفك الرئيسية، ويدعم العمل في نافذة منفصلة.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">4</span>
                    <span>إذن الميكروفون</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    عند بدء الجلسة الصوتية الحية عبر WebSocket، اختر <strong>"أثناء استخدام التطبيق" (While using the app)</strong> لمنح الوصول للميكروفون.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-200 text-xs">
                <span className="text-base shrink-0">✨</span>
                <span>
                  <strong>المزامنة السحابية:</strong> يتم حفظ جلساتك في Firestore تلقائياً (أو يمكنك التحكم بذلك في تبويب الإعدادات لتوفير استهلاك بيانات الجوال).
                </span>
              </div>
            </div>
          )}

          {activeTab === 'windows' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-cyan-300">
                <span className="text-lg">💻</span>
                <span>طريقة التشغيل على اللابتوب وكمبيوتر Windows / Mac:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">1</span>
                    <span>المتصفحات المدعومة</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    يعمل بكفاءة فائقة على Google Chrome و Microsoft Edge و Brave و Firefox.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">2</span>
                    <span>التثبيت كتطبيق سطح مكتب (PWA)</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    في شريط العنوان (URL bar)، اضغط على أيقونة التثبيت <strong>(شاشة مع سهم ⊕)</strong> أو اختر القائمة ثم <strong>تطبيقات &gt; تثبيت هذا الموقع كتطبيق</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">3</span>
                    <span>اختيار سماعات وميكروفونات USB</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    على اللابتوب، يمكنك استخدام لوحة <strong>"التحكم بالصوت والعتاد"</strong> لتحديد ميكروفون الاستوديو أو السماعات الخارجية بشكل مستقل.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">4</span>
                    <span>تثبيت في شريط مهام Windows</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    اضغط بزر الفأرة الأيمن على أيقونة التطبيق في شريط المهام واختر <strong>"Pin to taskbar" (تثبيت في شريط المهام)</strong> للوصول بضغطة واحدة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'troubleshoot' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <span className="text-lg">🛠️</span>
                <span>حل المشاكل الشائعة وضبط الأذونات:</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-200">1. الميكروفون لا يستجيب أو يظهر خطأ:</span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    - على الآيفون: ادخل إلى <strong>الإعدادات &gt; Safari &gt; الميكروفون</strong>، وتأكد من أنه مضبوط على "سماح" (Allow).
                    <br />
                    - على الأندرويد: اضغط على أيقونة القفل 🔒 بجانب عنوان الموقع في كروم &gt; الأذونات &gt; فعّل الميكروفون.
                    <br />
                    - على ويندوز: تأكد من تفعيل "Allow desktop apps to access your microphone" في إعدادات خصوصية Windows.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-200">2. الصوت لا يصدر على الآيفون:</span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    تأكد من إيقاف زر الصامت الجانبي (Ringer Switch) أو رفع صوت الوسائط (Media Volume)، واضغط على أي زر في الصفحة لتنشيط محرك Web Audio.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-200">3. تسجيل دخول Google Drive ومصادقة Google:</span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    عند الضغط على "تسجيل دخول Google"، اسمح للنوافذ المنبثقة (Popups) إذا طلب المتصفح ذلك لإكمال المصادقة وربط ملفات Drive بسلاسة.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            جاهز للعمل على مدار الساعة • اتصال مباشر بسيرفر Gemini 3.8 Live &amp; 3.5 Transcribe
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
};
