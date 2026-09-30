import React from 'react';
import { ShieldCheck, Flame, AlertTriangle, Sparkles, Award } from 'lucide-react';
import { TransparentMascotVideo } from './TransparentMascotVideo';

interface ParentHeroBannerProps {
  currentStage: number; // 0 to 14
  studentName?: string;
}

export const ParentHeroBanner: React.FC<ParentHeroBannerProps> = ({
  currentStage,
  studentName,
}) => {
  const totalMinutes = currentStage * 30;
  // 1-4: Yeşil, 5-8: Sarı, 9-13: Turuncu, 14: Kırmızı
  const isYellow = currentStage >= 5 && currentStage <= 8;
  const isOrange = currentStage >= 9 && currentStage <= 13;
  const isRed = currentStage >= 14;
  const isSafeGreen = currentStage <= 4;

  const remainingStages = Math.max(0, 14 - currentStage);
  const remainingMinutes = remainingStages * 30;
  const progressPercent = Math.min(100, Math.round((currentStage / 14) * 100));

  // Dynamic status-colored gradient background
  let gradientClass = 'bg-gradient-to-r from-teal-700 via-emerald-600 to-green-600';
  if (isRed) {
    gradientClass = 'bg-gradient-to-r from-rose-800 via-red-600 to-red-900';
  } else if (isOrange) {
    gradientClass = 'bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800';
  } else if (isYellow) {
    gradientClass = 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700';
  }

  const hours = Math.floor(totalMinutes / 60);

  return (
    <div
      className="relative rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 text-slate-900 overflow-hidden flex items-stretch justify-between gap-2.5 sm:gap-3.5 select-none h-[136px] sm:h-[148px]"
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
        className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.25), transparent)',
        }}
      />

      {/* Left Content */}
      <div className="relative z-10 flex-1 min-w-0 pr-1 flex flex-col justify-between py-0.5">
        {/* Üst Boşluk: İleride kazanılan rozetler buraya eklenecek */}
        <div className="flex items-center min-h-[18px]" />

        {/* Rozet Etiketi: Haftalık Yıldız Rozeti: Altın (Saat/Kademe bilgisinin hemen üstünde) */}
        <div className="flex items-center mt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-amber-950 border border-amber-300 shadow-2xs select-none">
            <span className="w-4 h-4 rounded-full bg-amber-500/30 flex items-center justify-center text-[10px] font-black text-amber-900 leading-none">
              ★
            </span>
            <span className="text-[10px] sm:text-[11px] font-black tracking-tight leading-none text-amber-950">
              Haftalık Yıldız Rozeti: Altın
            </span>
          </div>
        </div>

        {/* Center: Saat ve Kademe Bilgisi */}
        <div className="mt-2 text-center">
          <span className="text-xs sm:text-sm font-black text-white drop-shadow-2xs">
            {hours > 0 ? `${hours}. Saat` : `${totalMinutes} dk`}{' '}
            <span className="font-semibold text-white/80 text-[11px] sm:text-xs">
              ({currentStage}. Kademe)
            </span>
          </span>
        </div>

        {/* Progress Bar (Full Gradient: Yeşil -> Sarı -> Turuncu -> Kırmızı) */}
        <div className="mt-1">
          <div className="w-full h-2 bg-white/40 rounded-full p-0.5 border border-white/60 shadow-inner overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-400 via-amber-300 via-orange-400 to-rose-500"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Bottom: Günlük Ekran Süresi: X dk & Beyaz/Turkuaz Çizgi */}
        <div className="mt-1.5 flex flex-col items-start">
          <span className="text-[11px] sm:text-xs font-black text-white/95 tracking-tight drop-shadow-2xs">
            Günlük Ekran Süresi: {totalMinutes} dk
          </span>
          <div className="w-10 h-0.5 bg-white/70 rounded-full mt-0.5" />
        </div>
      </div>

      {/* Right Side: Sevimli Salıncaktaki Renkli Kuşlar Video Maskotu (kss.mp4) */}
      <div className="relative z-10 flex-shrink-0 self-stretch overflow-hidden flex flex-col items-center justify-start select-none pl-1 -mt-3 sm:-mt-3.5 min-w-[120px] sm:min-w-[145px] max-w-[165px]">
        {/* Maskot Video: Salıncaktaki Renkli Kuşlar - arka planı silinmiş ve alt boşluğu kırpılmıştır */}
        <div className="relative z-10 flex-1 min-h-0 w-full flex items-start justify-center pointer-events-none select-none">
          <TransparentMascotVideo
            src="/kss.mp4"
            chromaKeyType="blue"
            cropTop={0}
            cropBottom={0.36}
            className="w-auto h-full max-h-none max-w-full drop-shadow-[0_6px_14px_rgba(124,58,237,0.18)] transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
};