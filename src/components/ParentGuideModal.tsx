import React from 'react';
import {
  X,
  Sparkles,
  Clock,
  Award,
  Users,
  CheckCircle2,
  HelpCircle,
  Star,
  Calendar,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="parent-guide-modal"
        className="rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 bg-white"
        style={{
          backgroundImage: 'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.50) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow:
            '0 12px 36px rgba(31, 38, 135, 0.18), 0 0 20px rgba(168, 85, 247, 0.18), 0 0 20px rgba(45, 212, 191, 0.16), inset 0 1.5px 1px rgba(255, 255, 255, 0.95), inset 0 -1px 1px rgba(255, 255, 255, 0.25)',
        }}
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
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3.5 text-slate-800 text-xs sm:text-[13px] leading-relaxed">
          {/* Section 1: Ne Amaçla Kullanılır? */}
          <div
            className="rounded-2xl p-3.5 space-y-2 backdrop-blur-md"
            style={{
              background: 'rgba(255, 255, 255, 0.70)',
              border: '1px solid rgba(255, 255, 255, 0.90)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.85)',
            }}
          >
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

          {/* Section 2: Nasıl Kullanılır ve Önemli Özellikler */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                📱
              </span>
              <h3 className="font-black text-slate-900 text-sm">
                Nasıl Kullanılır? (Adım Adım Rehber)
              </h3>
            </div>

            {/* Step 1: +30 dk Ekle ve Kullanmadı Yıldızları */}
            <div
              className="flex gap-2.5 p-3 rounded-2xl items-start backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.70)',
                border: '1px solid rgba(255, 255, 255, 0.90)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.85)',
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">
                  1. "+30 dk Ekle" ile Günlük Süre Girişi
                </h4>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Anasayfa veya <strong>"Kademeler"</strong> sekmesindeki parlak mor <strong>"+30 dk Ekle"</strong> butonuyla çocuğunuzun o günkü ekran süresini ekleyin. Aynı gün içinde 1 saat veya 2 saat gibi daha fazla kullanım olduysa, her 30 dakika için butona tekrar tıklayabilirsiniz.
                </p>
              </div>
            </div>

            {/* Step 2: Kullanmadı Butonu ve Kazanılan Yıldızlar (Özel Vurgu) */}
            <div
              className="flex gap-2.5 p-3 rounded-2xl items-start backdrop-blur-md"
              style={{
                background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.78), rgba(255, 255, 255, 0.85))',
                border: '1px solid rgba(251, 191, 36, 0.75)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.90)',
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-amber-300/60">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-black text-amber-950 text-xs">
                    2. "Kullanmadı" Butonu ve Yıldız Ödülleri ⭐
                  </h4>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                    Yeni
                  </span>
                </div>
                <p className="text-[11px] text-amber-950/90 leading-tight">
                  Öğrencimiz o gün telefon, tablet veya televizyonu <strong>hiç kullanmadıysa</strong>, ekranın altındaki parlak fuşya/mürdüm <strong>"Kullanmadı"</strong> butonuna tıklayın!
                </p>
                <ul className="space-y-1 pt-0.5 text-[10.5px] text-amber-900 font-medium">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-black shrink-0">★</span>
                    <span>
                      <strong>Her ekransız gün = 1 Altın Yıldız:</strong> "Kullanmadı" butonuna her tıkladığınızda kadran üzerindeki ve Kademeler ekranındaki <em>"Toplam Süre"</em> yazısının hemen üstüne <strong>1 altın yıldız</strong> eklenir.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-black shrink-0">★</span>
                    <span>
                      <strong>Haftada En Fazla 7 Yıldız:</strong> Haftalık takip yapıldığı için 7 günün tamamında ekran kullanılmazsa yan yana <strong>7 altın yıldız (7/7)</strong> birikir ve öğrencimizin ekransız gün başarısı öğretmen ekranında da görülür.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3: Kademelerde Tarih ve 30 dk Kaydı */}
            <div
              className="flex gap-2.5 p-3 rounded-2xl items-start backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.70)',
                border: '1px solid rgba(255, 255, 255, 0.90)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.85)',
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Calendar className="w-4 h-4 text-sky-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">
                  3. Kademelerde Tarih ve Süre Detayı
                </h4>
                <p className="text-[11px] text-slate-600 leading-tight">
                  <strong>"Kademeler"</strong> sekmesindeki her kutucukta, o kademenin işaretlendiği <strong>günün tarihi</strong> ve altında <strong>"30 dk"</strong> bilgisi yer alır. Böylece aynı gün içinde birden fazla tıklama (örneğin 1 saat veya 2 saat kullanım) yapıldığında hangi gün ne kadar ekran kullanıldığı kolayca takip edilir.
                </p>
              </div>
            </div>

            {/* Step 4: Kademe Renk Alanları */}
            <div
              className="flex gap-2.5 p-3 rounded-2xl items-start backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.70)',
                border: '1px solid rgba(255, 255, 255, 0.90)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.85)',
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  4. Hedefiniz: Yeşil Güvenli Alan!
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

            {/* Step 5: Veli Adı, Öğrenci Adı ve Sınıfa Bağlanma */}
            <div
              className="flex gap-2.5 p-3 rounded-2xl items-start backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.70)',
                border: '1px solid rgba(255, 255, 255, 0.90)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.85)',
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">
                  5. Öğrenci Adı Girme ve Sınıfa Bağlanma
                </h4>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Üye olurken kendi <strong>Veli Adı Soyadınızı</strong> girersiniz. Ardından alt menüdeki <strong>"Sınıfım"</strong> sekmesine geçerek <strong>Öğrencinizin Adı Soyadını</strong> ve öğretmeninizden aldığınız 6 haneli <strong>Sınıf Kodunu</strong> girip sınıfınıza bağlanabilir, her hafta başarı rozetleri kazanabilirsiniz!
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tip Box */}
          <div
            className="p-3 rounded-2xl flex items-start gap-2 text-[11px] text-amber-950 backdrop-blur-md"
            style={{
              background: 'rgba(254, 243, 199, 0.65)',
              border: '1px solid rgba(251, 191, 36, 0.60)',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)',
            }}
          >
            <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>İpucu:</strong> Bu bilgilendirme rehberine dilediğiniz zaman ekranın sağ üst köşesindeki <strong>"?" (Yardım / Rehber)</strong> butonundan tekrar ulaşabilirsiniz.
            </p>
          </div>
        </div>

        {/* Footer Button */}
        <div
          className="p-3 sm:p-4 border-t flex-shrink-0"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.80)',
            background: 'rgba(255, 255, 255, 0.50)',
          }}
        >
          <button
            type="button"
            id="btn-parent-guide-understood"
            onClick={onClose}
            className="btn-3d-palette-primary w-full py-2.5 px-4 font-black text-xs sm:text-sm rounded-2xl shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Anladım, Haydi Başlayalım! 🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
};
