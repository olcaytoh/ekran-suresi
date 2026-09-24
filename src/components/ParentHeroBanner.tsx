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

  return (
    <div
      className="relative bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 text-slate-900 shadow-sm border border-slate-200/80 overflow-hidden flex items-stretch justify-between gap-2 sm:gap-3 select-none"
    >
      {/* Left Content: Clean Status Pill, Greeting, Progress Bar & Counters */}
      <div className="relative z-10 flex-1 min-w-0 pr-1 flex flex-col justify-between py-0.5">
        {/* Top Status Tag & Weekly Star Badge (Altın Yıldız Rozeti) */}
        <div className="flex flex-col items-start gap-1">
          {/* Rozet Kazandıkça Üstte Yan Yana Dizilen Rozetler */}
          {isSafeGreen && (
            <div className="flex items-center gap-1 pl-0.5 animate-in fade-in zoom-in-95 duration-300 mb-0.5">
              <img
                src="/gold_medal.png"
                alt="Haftalık Yıldız Rozeti"
                className="w-9 h-11 sm:w-11 sm:h-13 object-contain drop-shadow-[0_3px_8px_rgba(245,158,11,0.25)] transition-transform duration-200 hover:scale-105 select-none"
                draggable={false}
              />
            </div>
          )}

          {/* Sarı Çerçeve / Hap: Kalkan ikonu 'Haftalık' kelimesinin hemen solunda, kalkan yüksekliğinde */}
          <div className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-amber-950 border border-amber-200/90 shadow-xs select-none">
            {/* Kalkan İkonu (Duruma göre dinamik renkli, sarı çerçevenin içinde) */}
            <span
              className="inline-flex items-center justify-center p-0.5 sm:p-1 rounded-full bg-white/50 shadow-2xs border border-white/60"
              title={
                isRed
                  ? 'Kırmızı Sınır'
                  : isOrange
                  ? 'Dikkat Sınırı'
                  : isYellow
                  ? 'Dengeli Süre'
                  : 'Güvenli Alan'
              }
            >
              <ShieldCheck
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5] ${
                  isRed
                    ? 'text-red-600'
                    : isOrange
                    ? 'text-amber-700'
                    : isYellow
                    ? 'text-yellow-700'
                    : 'text-emerald-700'
                }`}
              />
            </span>

            {/* Metin */}
            <span className="text-[10px] sm:text-[11px] font-black tracking-tight leading-none text-amber-950">
              Haftalık Yıldız Rozeti
            </span>
          </div>
        </div>

        {/* Harmonious Progress Bar */}
        <div className="mt-1 sm:mt-1.5">
          <div className="w-full h-2 sm:h-2.5 bg-slate-100 rounded-full p-0.5 border border-slate-200/60 shadow-inner overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-xs ${
                isRed
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500'
                  : isOrange
                  ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500'
                  : isYellow
                  ? 'bg-gradient-to-r from-emerald-300 via-lime-400 to-yellow-400'
                  : 'bg-gradient-to-r from-teal-400 to-emerald-500'
              }`}
              style={{ width: `${Math.max(6, progressPercent)}%` }}
            />
          </div>

          {/* Sadeleştirilmiş Bilgi */}
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-extrabold text-slate-900 mt-1">
            <div className="flex flex-col items-start">
              <span>
                {totalMinutes} dk <span className="font-semibold text-slate-500">({currentStage}. Kademe)</span>
              </span>
              <div className="w-8 h-0.5 bg-teal-500 rounded-full mt-0.5" />
            </div>
            <span>
              {remainingMinutes > 0 ? `${remainingMinutes} dk kaldı` : 'Maksimum Kademe'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: Kedinin Kafasının Üstünde Açık Gri Çerçeve İçinde Karşılama Mesajı & Kedi Maskotu */}
      <div className="relative z-10 flex-shrink-0 self-stretch -mb-1 pt-0.5 flex flex-col items-center justify-end select-none">
        {/* Kedinin Kafasının Üstündeki Açık Gri Çerçeveli Mesaj */}
        <div className="mb-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200/80 shadow-2xs backdrop-blur-md">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap text-slate-800">
            Merhaba, {studentName || 'Ali Yılmaz'}!
          </span>
        </div>

        <div className="pointer-events-none flex items-end justify-center">
          <TransparentMascotVideo
            src="/mascot.mp4"
            className="h-full w-auto max-h-[78px] sm:max-h-[90px] md:max-h-[100px] max-w-[110px] sm:max-w-[130px] md:max-w-[145px] drop-shadow-[0_6px_14px_rgba(0,0,0,0.12)] transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
};
