import React from 'react';
import {
  X,
  Sparkles,
  Clock,
  Award,
  Users,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface ParentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
}

export const ParentGuideModal: React.FC<ParentGuideModalProps> = ({
  isOpen,
  onClose,
  studentName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="parent-guide-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="parent-guide-modal"
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header with Visual Banner */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 p-4 sm:p-5 text-white flex-shrink-0">
          <button
            type="button"
            id="btn-close-parent-guide"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/35 text-white/90 transition-all cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner border border-white/30 shrink-0">
              🌿
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 mb-1 border border-white/20">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Veli Bilgilendirme Rehberi
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Hoş Geldiniz{studentName ? `, ${studentName}` : ''}!
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                Ekran Süresi Takip ve Sağlıklı Dijital Denge
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-slate-800 text-xs sm:text-[13px] leading-relaxed">
          {/* Section 1: Ne Amaçla Kullanılır? */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                🎯
              </span>
              <h3 className="font-black text-emerald-950 text-sm">
                Bu Uygulama Ne Amaçla Kullanılır?
              </h3>
            </div>
            <p className="text-slate-700 leading-snug">
              Bu uygulama; çocuklarımızın telefon, tablet, televizyon ve oyun oynama sürelerini takip ederek <strong className="text-emerald-900 font-bold">aşırı ekran kullanımının önüne geçmek</strong> ve okul-aile işbirliğiyle <strong className="text-emerald-900 font-bold">sağlıklı dijital alışkanlıklar</strong> kazandırmak için geliştirilmiştir.
            </p>
            <ul className="grid grid-cols-1 gap-1.5 pt-1 text-[11.5px] text-slate-700">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Göz sağlığı, kaliteli uyku ve ders odaklanmasını destekler.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Ekran süresi yerine kitap okuma, spor ve doğa aktivitelerini teşvik eder.</span>
              </li>
            </ul>
          </div>

          {/* Section 2: Nasıl Kullanılır? */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                📱
              </span>
              <h3 className="font-black text-slate-900 text-sm">
                Nasıl Kullanılır? (3 Kolay Adım)
              </h3>
            </div>

            {/* Step 1 */}
            <div className="flex gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl items-start">
              <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  1. Haftalık Ekran Süresini Takip Edin
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                  Ana ekrandaki yeşil <strong>"+30 dk Ekle"</strong> butonuyla veya <strong>"Aşamalar"</strong> sekmesinden o haftaki ekran süresini girin.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl items-start">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  2. Hedefiniz: Yeşil Güvenli Alan!
                </h4>
                <div className="grid grid-cols-2 gap-1 mt-1 text-[10.5px]">
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-md font-bold">
                    🟢 1-4. Kademe: Güvenli (0-2 sa)
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded-md font-bold">
                    🟡 5-8. Kademe: Dengeli (2.5-4 sa)
                  </span>
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-900 rounded-md font-bold">
                    🟠 9-12. Kademe: Dikkat (4.5-6 sa)
                  </span>
                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 rounded-md font-bold">
                    🔴 13-14. Kademe: Kırmızı Sınır
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl items-start">
              <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  3. Sınıfa Bağlanın ve Rozetleri Toplayın
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                  Öğretmeninizden aldığınız 6 haneli <strong>Sınıf Kodunu</strong> "Sınıfım" sekmesinden girerek sınıfınıza dahil olun. Her hafta başarı rozetlerinizi kazanın!
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tip Box */}
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>İpucu:</strong> Bu bilgilendirme rehberine dilediğiniz zaman üst menüdeki veya "Sınıfım" sekmesindeki <strong>"Nasıl Kullanılır?"</strong> butonundan tekrar ulaşabilirsiniz.
            </p>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            id="btn-parent-guide-understood"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Anladım, Haydi Başlayalım! 🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
};
