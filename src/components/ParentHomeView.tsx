import React from 'react';
import { HelpCircle } from 'lucide-react';

interface ParentHomeViewProps {
  currentStage: number; // 0 to 14
  onUpdateStage: (newStage: number) => Promise<void>;
  isUpdating: boolean;
  onNavigateToStages?: () => void;
  onOpenParentGuide?: () => void;
}

export const ParentHomeView: React.FC<ParentHomeViewProps> = ({
  currentStage,
  onUpdateStage,
  isUpdating,
  onNavigateToStages,
  onOpenParentGuide,
}) => {
  const handleTriggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
  };

  const handleAddThirtyMin = async () => {
    if (currentStage >= 14 || isUpdating) return;
    handleTriggerHaptic();
    await onUpdateStage(currentStage + 1);
  };

  return (
    <div className="flex flex-col items-center justify-between gap-1 w-full flex-1 min-h-0">
      {/* 4 Buton Görseli ve Üzerindeki Başlıklar (Güvenli Alan, Dengeli Süre, Dikkat Sınırı, Kırmızı Sınır) */}
      <div className="w-full flex-1 min-h-0 flex items-center justify-center py-0 px-0">
        <div className="relative w-full max-w-[335px] sm:max-w-[380px] md:max-w-[420px] aspect-square max-h-[46vh] sm:max-h-[50vh] select-none">
          {/* Arka plan 4But PNG */}
          <img
            src="/4but.png"
            alt="Ekran Kademeleri"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md rounded-2xl"
            referrerPolicy="no-referrer"
          />

          {/* 4 Buton Alanları ve Üzerindeki Yazılar & Süre Bilgileri */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pt-[2.8%] pb-[3.5%] pl-[4%] pr-[2.7%] gap-x-[2.6%] gap-y-[3.5%]">
            {/* Buton 1: Güvenli Alan (Sol Üst: 1 - 4. Kademe, Yeşil / y.png) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              className="relative w-full h-full rounded-2xl sm:rounded-3xl flex flex-col items-center justify-start pt-[2.5%] sm:pt-[3%] pl-[7.5%] pr-[2%] cursor-pointer transition-transform duration-150 active:scale-[0.96] hover:bg-slate-900/5 focus:outline-hidden"
              title="Güvenli Alan: 1 - 4. Kademe (0-2 Saat)"
            >
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Güvenli Alan
              </span>

              {/* Süre Bilgisi (Sadece Saat, Beyaz Alana Tam Ortalanmış Rozet) */}
              <div className="mt-1 sm:mt-1.5 flex flex-col items-center pointer-events-none">
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-black bg-white/95 text-emerald-950 shadow-sm border border-emerald-100/80 tracking-tight text-center">
                  0-2 Saat
                </span>
              </div>

              {currentStage <= 4 ? (
                <span className="mt-1 sm:mt-1.5 px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[9.5px] md:text-[10.5px] font-black bg-emerald-600 text-white shadow-xs text-center">
                  ● Aktif (1-4)
                </span>
              ) : (
                <div className="w-12 h-0.5 sm:h-1 bg-slate-200/80 rounded-full mt-1.5 sm:mt-2 overflow-hidden flex">
                  <div className="w-full h-full bg-teal-500 rounded-full" />
                </div>
              )}
            </button>

            {/* Buton 2: Dengeli Süre (Sağ Üst: 5 - 8. Kademe, Sarı / s.png) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              className="relative w-full h-full rounded-2xl sm:rounded-3xl flex flex-col items-center justify-start pt-[2.5%] sm:pt-[3%] pl-[7.5%] pr-[2%] cursor-pointer transition-transform duration-150 active:scale-[0.96] hover:bg-slate-900/5 focus:outline-hidden"
              title="Dengeli Süre: 5 - 8. Kademe (2-4 Saat)"
            >
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Dengeli Süre
              </span>

              {/* Süre Bilgisi (Sadece Saat, Beyaz Alana Tam Ortalanmış Rozet) */}
              <div className="mt-1 sm:mt-1.5 flex flex-col items-center pointer-events-none">
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-black bg-white/95 text-amber-950 shadow-sm border border-amber-100/80 tracking-tight text-center">
                  2-4 Saat
                </span>
              </div>

              {currentStage >= 5 && currentStage <= 8 ? (
                <span className="mt-1 sm:mt-1.5 px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[9.5px] md:text-[10.5px] font-black bg-yellow-500 text-slate-950 shadow-xs text-center">
                  ● Aktif (5-8)
                </span>
              ) : (
                <div className="w-12 h-0.5 sm:h-1 bg-slate-200/80 rounded-full mt-1.5 sm:mt-2 overflow-hidden flex">
                  <div className="w-1/2 h-full bg-teal-500 rounded-full" />
                </div>
              )}
            </button>

            {/* Buton 3: Dikkat Sınırı (Sol Alt: 9 - 13. Kademe, Turuncu / t.png) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              className="relative w-full h-full rounded-2xl sm:rounded-3xl flex flex-col items-center justify-start pt-[2.5%] sm:pt-[3%] pl-[7.5%] pr-[2%] cursor-pointer transition-transform duration-150 active:scale-[0.96] hover:bg-slate-900/5 focus:outline-hidden"
              title="Dikkat Sınırı: 9 - 13. Kademe (4-6 Saat)"
            >
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Dikkat Sınırı
              </span>

              {/* Süre Bilgisi (Sadece Saat, Beyaz Alana Tam Ortalanmış Rozet) */}
              <div className="mt-1 sm:mt-1.5 flex flex-col items-center pointer-events-none">
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-black bg-white/95 text-orange-950 shadow-sm border border-orange-100/80 tracking-tight text-center">
                  4-6 Saat
                </span>
              </div>

              {currentStage >= 9 && currentStage <= 13 ? (
                <span className="mt-1 sm:mt-1.5 px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[9.5px] md:text-[10.5px] font-black bg-orange-600 text-white shadow-xs text-center">
                  ● Aktif (9-13)
                </span>
              ) : (
                <div className="w-12 h-0.5 sm:h-1 bg-slate-200/80 rounded-full mt-1.5 sm:mt-2 overflow-hidden flex">
                  <div className="w-1/3 h-full bg-teal-500 rounded-full" />
                </div>
              )}
            </button>

            {/* Buton 4: Kırmızı Sınır (Sağ Alt: 14. Kademe, Kırmızı / k.png) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              className="relative w-full h-full rounded-2xl sm:rounded-3xl flex flex-col items-center justify-start pt-[2.5%] sm:pt-[3%] pl-[7.5%] pr-[2%] cursor-pointer transition-transform duration-150 active:scale-[0.96] hover:bg-slate-900/5 focus:outline-hidden"
              title="Kırmızı Sınır: 14. Kademe (7+ Saat)"
            >
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Kırmızı Sınır
              </span>

              {/* Süre Bilgisi (Sadece Saat, Beyaz Alana Tam Ortalanmış Rozet) */}
              <div className="mt-1 sm:mt-1.5 flex flex-col items-center pointer-events-none">
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-black bg-white/95 text-rose-950 shadow-sm border border-rose-100/80 tracking-tight text-center">
                  7+ Saat
                </span>
              </div>

              {currentStage >= 14 ? (
                <span className="mt-1 sm:mt-1.5 px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[9.5px] md:text-[10.5px] font-black bg-red-600 text-white shadow-xs animate-pulse text-center">
                  ● Aktif (14)
                </span>
              ) : (
                <div className="w-12 h-0.5 sm:h-1 bg-slate-200/80 rounded-full mt-1.5 sm:mt-2 overflow-hidden flex">
                  <div className="w-1/4 h-full bg-teal-500 rounded-full" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 30 dk Ekle Butonu (30.png) - %40 küçültülmüş & Rehber Butonu */}
      <div className="w-full flex items-center justify-center gap-2 pt-0.5 pb-1 flex-shrink-0">
        <button
          type="button"
          id="btn-add-thirty-min-main"
          onClick={handleAddThirtyMin}
          disabled={currentStage >= 14 || isUpdating}
          className="group relative flex items-center justify-center w-full max-w-[130px] sm:max-w-[155px] transition-transform duration-150 active:scale-95 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-hidden select-none"
          title={currentStage >= 14 ? 'Maksimum sınıra ulaşıldı (14/14)' : '+30 Dakika Ekle'}
        >
          <img
            src="/30.png"
            alt="30 dk Ekle"
            className="w-full h-auto max-h-[28px] sm:max-h-[33px] object-contain drop-shadow-md pointer-events-none transition-all group-hover:brightness-105"
            draggable={false}
            referrerPolicy="no-referrer"
          />
        </button>

        {onOpenParentGuide && (
          <button
            type="button"
            id="btn-parent-guide-inline"
            onClick={onOpenParentGuide}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-white/90 hover:bg-white text-emerald-800 border border-emerald-200/90 shadow-xs transition-all cursor-pointer active:scale-95"
            title="Uygulama Bilgi Rehberi (Nasıl ve Ne Amaçla Kullanılır?)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Rehber</span>
          </button>
        )}
      </div>
    </div>
  );
};
