import React from 'react';
import { HelpCircle, Clock } from 'lucide-react';
import { StageGaugeDial } from './StageGaugeDial';

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
  const totalMinutes = currentStage * 30;

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
    <div className="relative flex flex-col items-center justify-between gap-2.5 w-full flex-1 min-h-0 select-none">
      {/* Durum Dashboard Ana Cam Kartı (Glassmorphism Kart Efekti) */}
      <div
        className="relative w-full rounded-[24px] sm:rounded-[28px] p-3 sm:p-4 pt-3.5 sm:pt-4 pb-3 sm:pb-4 select-none flex flex-col items-center flex-1 justify-between min-h-0 overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.20)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Üstteki hafif parlama efekti */}
        <div
          className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none rounded-t-[24px] sm:rounded-t-[28px]"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.25), transparent)',
          }}
        />

        {/* 4 Detay Kartı (Güvenli Alan, Dengeli Süre, Dikkat Sınırı, Kırmızı Sınır - Kompakt Yükseklik, Sıfır Boşluk, Büyük İkonlar) */}
        <div className="relative z-10 grid grid-cols-4 gap-1.5 sm:gap-2 w-full mt-0.5 flex-shrink-0">
          {/* 1. Güvenli Alan */}
          <button
            type="button"
            onClick={onNavigateToStages}
            className={`rounded-2xl py-1.5 px-0.5 sm:py-2 sm:px-1.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center min-h-[76px] sm:min-h-[86px] transition-all duration-150 active:scale-95 cursor-pointer shadow-none backdrop-blur-md overflow-hidden ${
              currentStage <= 4
                ? 'bg-emerald-200/40 border-2 border-emerald-400 scale-[1.03]'
                : 'bg-emerald-100/25 hover:bg-emerald-100/35 border border-white/50'
            }`}
            title="Güvenli Alan (0-2s)"
          >
            <div className="flex items-center justify-center h-11 sm:h-13 w-full my-0">
              <img
                src="/ta.png"
                alt="Güvenli Alan"
                className="h-11 sm:h-13 w-auto max-w-full object-contain pointer-events-none drop-shadow-none"
                draggable={false}
              />
            </div>
            <div className="flex flex-col items-center w-full leading-none px-0.5">
              <span className="text-[10px] min-[380px]:text-[11px] sm:text-xs font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight">
                Güvenli Alan
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-emerald-900 leading-tight mt-0.5 px-1 py-0.5 rounded bg-white/70 whitespace-nowrap">
                0-2s
              </span>
            </div>
          </button>

          {/* 2. Dengeli Süre */}
          <button
            type="button"
            onClick={onNavigateToStages}
            className={`rounded-2xl py-1.5 px-0.5 sm:py-2 sm:px-1.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center min-h-[76px] sm:min-h-[86px] transition-all duration-150 active:scale-95 cursor-pointer shadow-none backdrop-blur-md overflow-hidden ${
              currentStage >= 5 && currentStage <= 8
                ? 'bg-amber-200/40 border-2 border-amber-400 scale-[1.03]'
                : 'bg-amber-100/25 hover:bg-amber-100/35 border border-white/50'
            }`}
            title="Dengeli Süre (2-4s)"
          >
            <div className="flex items-center justify-center h-11 sm:h-13 w-full my-0">
              <img
                src="/ro.png"
                alt="Dengeli Süre"
                className="h-11 sm:h-13 w-auto max-w-full object-contain pointer-events-none drop-shadow-none"
                draggable={false}
              />
            </div>
            <div className="flex flex-col items-center w-full leading-none px-0.5">
              <span className="text-[10px] min-[380px]:text-[11px] sm:text-xs font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight">
                Dengeli Süre
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-amber-900 leading-tight mt-0.5 px-1 py-0.5 rounded bg-white/70 whitespace-nowrap">
                2-4s
              </span>
            </div>
          </button>

          {/* 3. Dikkat Sınırı */}
          <button
            type="button"
            onClick={onNavigateToStages}
            className={`rounded-2xl py-1.5 px-0.5 sm:py-2 sm:px-1.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center min-h-[76px] sm:min-h-[86px] transition-all duration-150 active:scale-95 cursor-pointer shadow-none backdrop-blur-md overflow-hidden ${
              currentStage >= 9 && currentStage <= 13
                ? 'bg-orange-200/40 border-2 border-orange-400 scale-[1.03]'
                : 'bg-orange-100/25 hover:bg-orange-100/35 border border-white/50'
            }`}
            title="Dikkat Sınırı (4-6s)"
          >
            <div className="flex items-center justify-center h-11 sm:h-13 w-full my-0">
              <img
                src="/sa.png"
                alt="Dikkat Sınırı"
                className="h-11 sm:h-13 w-auto max-w-full object-contain pointer-events-none drop-shadow-none"
                draggable={false}
              />
            </div>
            <div className="flex flex-col items-center w-full leading-none px-0.5">
              <span className="text-[10px] min-[380px]:text-[11px] sm:text-xs font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight">
                Dikkat Sınırı
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-orange-900 leading-tight mt-0.5 px-1 py-0.5 rounded bg-white/70 whitespace-nowrap">
                4-6s
              </span>
            </div>
          </button>

          {/* 4. Kırmızı Sınır */}
          <button
            type="button"
            onClick={onNavigateToStages}
            className={`rounded-2xl py-1.5 px-0.5 sm:py-2 sm:px-1.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center min-h-[76px] sm:min-h-[86px] transition-all duration-150 active:scale-95 cursor-pointer shadow-none backdrop-blur-md overflow-hidden ${
              currentStage >= 14
                ? 'bg-rose-200/40 border-2 border-rose-400 scale-[1.03]'
                : 'bg-rose-100/25 hover:bg-rose-100/35 border border-white/50'
            }`}
            title="Kırmızı Sınır (7+s)"
          >
            <div className="flex items-center justify-center h-11 sm:h-13 w-full my-0">
              <img
                src="/me.png"
                alt="Kırmızı Sınır"
                className="h-11 sm:h-13 w-auto max-w-full object-contain pointer-events-none drop-shadow-none"
                draggable={false}
              />
            </div>
            <div className="flex flex-col items-center w-full leading-none px-0.5">
              <span className="text-[10px] min-[380px]:text-[11px] sm:text-xs font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight">
                Kırmızı Sınır
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-rose-900 leading-tight mt-0.5 px-1 py-0.5 rounded bg-white/70 whitespace-nowrap">
                7+s
              </span>
            </div>
          </button>
        </div>

        {/* İnce Cam Ayırıcı Çizgi */}
        <div className="relative z-10 w-full flex items-center justify-center my-0.5 sm:my-1 px-3 flex-shrink-0">
          <div className="w-full h-[1px] bg-white/25" />
        </div>

        {/* 4 Kademeli Speedometer/Gauge Kadran Göstergesi (4lu.png yerine modern kavisli kadran tasarımı) */}
        <StageGaugeDial
          currentStage={currentStage}
          totalMinutes={totalMinutes}
          onNavigateToStages={onNavigateToStages}
          className="my-auto flex-shrink-0"
        />
      </div>

      {/* Alt Butonlar: Ek Süre (30 dk) & Ebeveyn Rehberi */}
      <div className="w-full flex items-center justify-center gap-2.5 pt-0.5 pb-1 flex-shrink-0">
        {/* 1. Ek Süre (30 dk) Butonu */}
        <button
          type="button"
          id="btn-add-thirty-min-main"
          onClick={handleAddThirtyMin}
          disabled={currentStage >= 14 || isUpdating}
          className="flex-1 py-2 sm:py-2.5 px-3 rounded-full bg-[#7a8ca5] hover:bg-[#6b7d96] active:scale-95 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer focus:outline-hidden select-none"
          title={currentStage >= 14 ? 'Maksimum sınıra ulaşıldı (14/14)' : '+30 Dakika Ekle'}
        >
          <Clock className="w-4 h-4 text-white" />
          <span>Ek Süre (30 dk)</span>
        </button>

        {/* 2. Ebeveyn Rehberi Butonu */}
        {onOpenParentGuide && (
          <button
            type="button"
            id="btn-parent-guide-inline"
            onClick={onOpenParentGuide}
            className="flex-1 py-2 sm:py-2.5 px-3 rounded-full bg-white hover:bg-slate-50 active:scale-95 text-emerald-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-emerald-400 shadow-sm transition-all cursor-pointer focus:outline-hidden select-none"
            title="Uygulama Bilgi Rehberi"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>Ebeveyn Rehberi</span>
          </button>
        )}
      </div>
    </div>
  );
};