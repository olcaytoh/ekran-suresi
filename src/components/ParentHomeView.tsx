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
    <div className="flex flex-col items-center justify-between gap-0.5 sm:gap-1 w-full flex-1 min-h-0">
      {/* 4 Buton Görseli ve Üzerindeki Başlıklar (Güvenli Alan, Dengeli Süre, Dikkat Sınırı, Kırmızı Sınır) */}
      <div className="w-full flex-1 min-h-0 flex items-center justify-center py-0.5 px-0">
        <div className="relative w-full max-w-[370px] sm:max-w-[420px] md:max-w-[460px] aspect-[1024/1051] max-h-[54vh] sm:max-h-[58vh] select-none">
          {/* Arka plan 4But PNG */}
          <img
            src="/4but.png"
            alt="Ekran Kademeleri"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md rounded-2xl"
            referrerPolicy="no-referrer"
          />

          {/* 4 Buton Alanları ve Üzerindeki Yazılar & Süre Bilgileri */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pt-[3.3%] pb-[3.7%] pl-[4%] pr-[2.7%] gap-x-[2.6%] gap-y-[3.9%]">
            {/* Buton 1: Güvenli Alan (Sol Üst: 1 - 4. Kademe, Yeşil / y.png) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              className="relative w-full h-full rounded-2xl sm:rounded-3xl flex flex-col items-center justify-start pt-[6.5%] sm:pt-[7.5%] px-1 sm:px-1.5 cursor-pointer transition-transform duration-150 active:scale-[0.96] hover:bg-slate-900/5 focus:outline-hidden"
              title="Güvenli Alan: 1 - 4. Kademe (0 - 2 Saat / 30 - 120 dk)"
            >
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Güvenli Alan
              </span>

              {/* Süre Bilgisi */}
              <div className="mt-0.5 sm:mt-1 flex flex-col items-center pointer-events-none">
                <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11.5px] md:text-xs font-black bg-white/95 text-emerald-950 shadow-xs border border-white/80">
                  0 - 2 Saat
                </span>
                <span className="text-[8.5px] sm:text-[10px] md:text-[11px] font-bold text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] mt-0.5">
                  (30 - 120 dk)
                </span>
              </div>

              {currentStage <= 4 && (
                <span className="mt-0.5 sm:mt-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                  ● Aktif (1-4)
                </span>
              )}
            </button>

            {/* Buton 2: Dengeli Süre (Sağ Üst: 5 - 8. Kademe, Sarı / s.png) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              className="relative w-full h-full rounded-2xl sm:rounded-3xl flex flex-col items-center justify-start pt-[6.5%] sm:pt-[7.5%] px-1 sm:px-1.5 cursor-pointer transition-transform duration-150 active:scale-[0.96] hover:bg-slate-900/5 focus:outline-hidden"
              title="Dengeli Süre: 5 - 8. Kademe (2.5 - 4 Saat / 150 - 240 dk)"
            >
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Dengeli Süre
              </span>

              {/* Süre Bilgisi */}
              <div className="mt-0.5 sm:mt-1 flex flex-col items-center pointer-events-none">
                <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11.5px] md:text-xs font-black bg-white/95 text-amber-950 shadow-xs border border-white/80">
                  2.5 - 4 Saat
                </span>
                <span className="text-[8.5px] sm:text-[10px] md:text-[11px] font-bold text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] mt-0.5">
                  (150 - 240 dk)
                </span>
              </div>

              {currentStage >= 5 && currentStage <= 8 && (
                <span className="mt-0.5 sm:mt-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black bg-yellow-500 text-slate-950 shadow-xs">
                  ● Aktif (5-8)
                </span>
              )}
            </button>

            {/* Buton 3: Dikkat Sınırı (Sol Alt: 9 - 13. Kademe, Turuncu / t.png) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              className="relative w-full h-full rounded-2xl sm:rounded-3xl flex flex-col items-center justify-start pt-[6.5%] sm:pt-[7.5%] px-1 sm:px-1.5 cursor-pointer transition-transform duration-150 active:scale-[0.96] hover:bg-slate-900/5 focus:outline-hidden"
              title="Dikkat Sınırı: 9 - 13. Kademe (4.5 - 6.5 Saat / 270 - 390 dk)"
            >
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Dikkat Sınırı
              </span>

              {/* Süre Bilgisi */}
              <div className="mt-0.5 sm:mt-1 flex flex-col items-center pointer-events-none">
                <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11.5px] md:text-xs font-black bg-white/95 text-orange-950 shadow-xs border border-white/80">
                  4.5 - 6.5 Saat
                </span>
                <span className="text-[8.5px] sm:text-[10px] md:text-[11px] font-bold text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] mt-0.5">
                  (270 - 390 dk)
                </span>
              </div>

              {currentStage >= 9 && currentStage <= 13 && (
                <span className="mt-0.5 sm:mt-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black bg-orange-600 text-white shadow-xs">
                  ● Aktif (9-13)
                </span>
              )}
            </button>

            {/* Buton 4: Kırmızı Sınır (Sağ Alt: 14. Kademe, Kırmızı / k.png) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              className="relative w-full h-full rounded-2xl sm:rounded-3xl flex flex-col items-center justify-start pt-[6.5%] sm:pt-[7.5%] px-1 sm:px-1.5 cursor-pointer transition-transform duration-150 active:scale-[0.96] hover:bg-slate-900/5 focus:outline-hidden"
              title="Kırmızı Sınır: 14. Kademe (7+ Saat / 420+ dk)"
            >
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                Kırmızı Sınır
              </span>

              {/* Süre Bilgisi */}
              <div className="mt-0.5 sm:mt-1 flex flex-col items-center pointer-events-none">
                <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11.5px] md:text-xs font-black bg-white/95 text-rose-950 shadow-xs border border-white/80">
                  7+ Saat
                </span>
                <span className="text-[8.5px] sm:text-[10px] md:text-[11px] font-bold text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] mt-0.5">
                  (420+ dk)
                </span>
              </div>

              {currentStage >= 14 && (
                <span className="mt-0.5 sm:mt-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black bg-red-600 text-white shadow-xs animate-pulse">
                  ● Aktif (14)
                </span>
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
