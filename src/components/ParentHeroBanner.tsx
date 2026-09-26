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
      className="relative rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 text-slate-900 overflow-hidden flex items-stretch justify-between gap-2.5 sm:gap-3.5 select-none min-h-[136px] sm:min-h-[148px]"
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
        {/* Top Status Tag: Haftalık Yıldız Rozeti: Altın */}
        <div className="flex items-center">
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

      {/* Right Side: Merhaba Mesajı ve Sevimli Öğretmen Kedi Video Maskotu */}
      <div className="relative z-10 flex-shrink-0 self-stretch flex flex-col items-center justify-between select-none pl-1 min-w-[105px] sm:min-w-[125px] max-w-[140px]">
        {/* Karşılama Balonu */}
        <div className="px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-full bg-white/75 backdrop-blur-md text-slate-800 border border-white/80 shadow-2xs z-20">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap text-slate-800">
            Merhaba, {studentName || 'Ali Yılmaz'}!
          </span>
        </div>

        {/* Öğretmen Kedi Video Maskotu - Üst ve alt tarafı tam sığdırılmış ve kesilmeden görüntülenir */}
        <div className="relative z-10 flex-1 min-h-0 w-full flex items-end justify-center pointer-events-none select-none pt-1">
          <TransparentMascotVideo
            src="/mascot.mp4"
            cropTop={0.08}
            cropBottom={0.08}
            className="w-auto h-full max-h-[102px] sm:max-h-[116px] drop-shadow-[0_6px_14px_rgba(124,58,237,0.18)] transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
};
