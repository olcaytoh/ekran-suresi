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
        className="relative w-full rounded-[24px] sm:rounded-[28px] px-2.5 sm:px-3.5 pt-1 sm:pt-1.5 pb-2 sm:pb-2.5 select-none flex flex-col items-center flex-1 justify-between min-h-0 overflow-hidden"
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

        {/* 4 Kademeli Speedometer/Gauge Kadran Göstergesi (Üst Bölüm) */}
        <StageGaugeDial
          currentStage={currentStage}
          totalMinutes={totalMinutes}
          onNavigateToStages={onNavigateToStages}
          className="my-auto flex-shrink-0"
        />

        {/* İnce Cam Ayırıcı Çizgi */}
        <div className="relative z-10 w-full flex items-center justify-center my-0 sm:my-0.5 px-3 flex-shrink-0">
          <div className="w-full h-[1px] bg-white/25" />
        </div>

        {/* 4 Renk Bölgesi Butonları: 11.png (kodlanmış), 11a.png, 11b.png, 11c.png (Alt Bölüm) */}
        <div className="relative z-10 w-full mb-0.5 flex-shrink-0 select-none">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-[360px] sm:max-w-[390px] mx-auto select-none">
            {/* 1. Güvenli Alan (11.png ve hemen dışındaki yeşil çizgi) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              aria-label="Güvenli Alan (0-2s)"
              className={`relative flex items-center justify-center rounded-2xl p-0.5 cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 ring-2 ring-emerald-500 ${
                currentStage <= 4
                  ? 'scale-[1.04] drop-shadow-md shadow-md shadow-emerald-500/30'
                  : 'hover:scale-[1.03] opacity-90 hover:opacity-100'
              }`}
            >
              <img
                src="/11.png"
                alt="Güvenli Alan"
                className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                draggable={false}
              />
            </button>

            {/* 2. Dengeli Süre */}
            <button
              type="button"
              onClick={onNavigateToStages}
              aria-label="Dengeli Süre (2-4s)"
              className={`relative flex items-center justify-center rounded-2xl p-0.5 cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 ${
                currentStage >= 5 && currentStage <= 8
                  ? 'scale-[1.04] drop-shadow-md'
                  : 'hover:scale-[1.03] opacity-90 hover:opacity-100'
              }`}
            >
              <img
                src="/11a.png"
                alt="Dengeli Süre"
                className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                draggable={false}
              />
            </button>

            {/* 3. Dikkat Sınırı */}
            <button
              type="button"
              onClick={onNavigateToStages}
              aria-label="Dikkat Sınırı (4-6s)"
              className={`relative flex items-center justify-center rounded-2xl p-0.5 cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 ${
                currentStage >= 9 && currentStage <= 13
                  ? 'scale-[1.04] drop-shadow-md'
                  : 'hover:scale-[1.03] opacity-90 hover:opacity-100'
              }`}
            >
              <img
                src="/11b.png"
                alt="Dikkat Sınırı"
                className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                draggable={false}
              />
            </button>

            {/* 4. Kırmızı Sınır */}
            <button
              type="button"
              onClick={onNavigateToStages}
              aria-label="Kırmızı Sınır (7+s)"
              className={`relative flex items-center justify-center rounded-2xl p-0.5 cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 ${
                currentStage >= 14
                  ? 'scale-[1.04] drop-shadow-md'
                  : 'hover:scale-[1.03] opacity-90 hover:opacity-100'
              }`}
            >
              <img
                src="/11c.png"
                alt="Kırmızı Sınır"
                className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                draggable={false}
              />
            </button>
          </div>
        </div>
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