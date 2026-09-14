import React from 'react';
import { ShieldCheck, Flame, AlertTriangle, Sparkles } from 'lucide-react';
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

  return (
    <div
      className={`relative ${gradientClass} rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.1)] border border-white/25 overflow-hidden flex items-stretch justify-between gap-2.5 sm:gap-4`}
    >
      {/* Background Soft Glow Bubbles */}
      <div className="absolute -top-10 -left-10 w-44 h-44 bg-white/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 right-20 w-40 h-40 bg-black/10 rounded-full blur-xl pointer-events-none" />

      {/* Left Content: Clean Status Pill, Greeting, Progress Bar & Counters */}
      <div className="relative z-10 flex-1 min-w-0 pr-1 flex flex-col justify-center">
        {/* Top Status Tag (Clean & Without Redundant Text) */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-xs">
            {isRed ? (
              <>
                <Flame className="w-3 h-3 text-red-200 animate-pulse" />
                <span>Kırmızı Sınır</span>
              </>
            ) : isOrange ? (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-200" />
                <span>Dikkat Sınırı</span>
              </>
            ) : isYellow ? (
              <>
                <Sparkles className="w-3 h-3 text-yellow-100" />
                <span>Dengeli Süre</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-200" />
                <span>Güvenli Alan</span>
              </>
            )}
          </span>
        </div>

        {/* Greeting Headline */}
        <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight drop-shadow-xs truncate">
          Merhaba, {studentName || 'Ekran Takipçisi'}! ⭐
        </h2>

        {/* Harmonious Progress Bar */}
        <div className="mt-1.5 sm:mt-2">
          <div className="w-full h-2.5 sm:h-3 bg-black/25 backdrop-blur-xs rounded-full p-0.5 border border-white/25 shadow-inner overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                isRed
                  ? 'bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                  : isOrange
                  ? 'bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.6)]'
                  : isYellow
                  ? 'bg-gradient-to-r from-emerald-200 via-lime-300 to-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.6)]'
                  : 'bg-gradient-to-r from-teal-200 via-emerald-300 to-green-200 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
              }`}
              style={{ width: `${Math.max(6, progressPercent)}%` }}
            />
          </div>

          {/* Progress Counters under the bar */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-black text-white/95 mt-1 drop-shadow-2xs">
            <span>
              {totalMinutes} dk <span className="font-medium text-white/75">({currentStage}/14 Kademe)</span>
            </span>
            <span>
              {remainingMinutes > 0 ? `${remainingMinutes} dk kalan` : 'Kritik Tavan Doldu'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: Kedi Maskotu (Şeffaf Arka Planlı Video) */}
      <div className="relative z-10 flex-shrink-0 self-stretch -my-3 sm:-my-3.5 flex items-end justify-center pointer-events-none select-none">
        <TransparentMascotVideo
          src="/mascot.mp4"
          className="h-full w-auto max-h-[120px] sm:max-h-[145px] md:max-h-[165px] max-w-[125px] sm:max-w-[155px] md:max-w-[185px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.30)] transition-all duration-300"
        />
      </div>
    </div>
  );
};
