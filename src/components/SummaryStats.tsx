import React from 'react';
import { getStageCategory } from '../lib/stagesData';
import { formatMinutes } from '../lib/weekUtils';
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Heart,
  Zap,
} from 'lucide-react';

interface SummaryStatsProps {
  currentStage: number; // 0 to 14
  studentName?: string;
  className?: string;
  onAddThirtyMin?: () => void;
  canAdd?: boolean;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  currentStage,
  studentName,
  className,
  onAddThirtyMin,
  canAdd = true,
}) => {
  const totalMinutes = currentStage * 30;
  const timeFormatted = formatMinutes(totalMinutes);
  const categoryInfo = getStageCategory(currentStage);
  const remainingStages = Math.max(0, 14 - currentStage);
  const remainingMinutes = remainingStages * 30;

  // 1-4: Yeşil (y.png), 5-8: Sarı (s.png), 9-13: Turuncu (t.png), 14: Kırmızı (k.png)
  const isGreen = currentStage <= 4;
  const isYellow = currentStage >= 5 && currentStage <= 8;
  const isOrange = currentStage >= 9 && currentStage <= 13;
  const isRed = currentStage >= 14;

  // Mascot image: yesil.png by default, k.png when red
  const currentImage = isRed ? '/k.png' : '/yesil.png';

  return (
    <div className="space-y-5">
      {/* 1. Gamified Profile Card (Directly inspired by Eugene's 3D profile in the screenshot) */}
      <div className="relative bg-gradient-to-b from-sky-100/70 via-white to-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden pt-6 pb-6 px-4 sm:px-6">
        {/* Subtle decorative background gradient circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-gradient-to-b from-sky-200/50 via-indigo-100/30 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Top Badges & Center Circular Avatar */}
        <div className="relative flex items-center justify-between max-w-lg mx-auto mb-3">
          {/* Left Pill: Screen Time Gem Badge */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl py-1.5 px-3 border border-slate-200 shadow-[0_3px_0_#cbd5e1,0_6px_12px_rgba(0,0,0,0.04)]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-rose-400 to-rose-600 text-white flex items-center justify-center shadow-xs text-sm">
              💎
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Kullanılan
              </div>
              <div className="text-sm sm:text-base font-black text-slate-800 leading-tight">
                {totalMinutes} <span className="text-[11px] font-bold text-slate-500">dk</span>
              </div>
            </div>
          </div>

          {/* Center: Circular 3D Avatar (with y.png, s.png, t.png, k.png) */}
          <div className="relative mx-2 -my-2 flex-shrink-0">
            {/* Outer Neon Glow Ring */}
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 transition-all duration-500 ${
                isRed
                  ? 'bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 shadow-[0_8px_24px_rgba(225,29,72,0.4)]'
                  : isOrange
                  ? 'bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 shadow-[0_8px_24px_rgba(249,115,22,0.35)]'
                  : isYellow
                  ? 'bg-gradient-to-tr from-yellow-400 via-amber-400 to-lime-400 shadow-[0_8px_24px_rgba(234,179,8,0.35)]'
                  : 'bg-gradient-to-tr from-emerald-400 via-cyan-400 to-teal-500 shadow-[0_8px_24px_rgba(16,185,129,0.35)]'
              }`}
            >
              {/* White Bevel Layer */}
              <div className="w-full h-full rounded-full p-1 bg-white shadow-inner flex items-center justify-center overflow-hidden">
                <img
                  src={currentImage}
                  alt={categoryInfo.label}
                  className="w-full h-full object-cover rounded-full transition-transform duration-300 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Level Badge at bottom of circle */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
              <span
                className={`px-3 py-0.5 rounded-full text-[11px] font-black tracking-wider shadow-md border border-white/60 flex items-center gap-1 ${
                  isRed
                    ? 'bg-red-600 text-white'
                    : isOrange
                    ? 'bg-orange-500 text-white'
                    : isYellow
                    ? 'bg-yellow-500 text-slate-950'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <span>{currentStage}. Kademe</span>
              </span>
            </div>
          </div>

          {/* Right Pill: Safe Remaining Coins Badge */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl py-1.5 px-3 border border-slate-200 shadow-[0_3px_0_#cbd5e1,0_6px_12px_rgba(0,0,0,0.04)]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-xs text-sm">
              🪙
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Kalan Sınır
              </div>
              <div className="text-sm sm:text-base font-black text-slate-800 leading-tight">
                {remainingMinutes} <span className="text-[11px] font-bold text-slate-500">dk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Student Name & Title */}
        <div className="text-center mt-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {studentName || 'Öğrenci Ekranı'}
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {className ? `${className} • ` : ''}Haftalık 12 Kademe Takibi
          </p>
        </div>

        {/* The 3D "Statistics" Pill Button (Directly matching the screenshot's Statistics button) */}
        <div className="flex justify-center mt-3">
          <div
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-xs sm:text-sm tracking-wide cursor-default ${
              isRed
                ? 'btn-3d-rose'
                : isOrange
                ? 'btn-3d-amber'
                : 'btn-3d-cyan'
            }`}
          >
            <BarChart3 className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isRed
                ? 'Kritik Seviye: 300+ Dakika (Kırmızı)'
                : isOrange
                ? 'Uyarı: Yüksek Kullanım (Turuncu)'
                : 'Durum: Güvenli ve Dengeli (Yeşil)'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Three 3D Circular Medallions (Matching Crown / Skull Shield / Diamond in screenshot) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm">
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Haftalık Seviye İlerlemesi
          </span>
          <h3 className="text-base font-black text-slate-900">
            Kademe ve Eşik Rozetleri
          </h3>
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-6 py-2">
          {/* Left Circular Medallion: 1. Kademe (Crown / Green Safe Start) */}
          <div className="flex flex-col items-center opacity-85 hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-purple-400 via-indigo-500 to-purple-600 p-1 shadow-[0_6px_0_#6b21a8,0_10px_20px_rgba(107,33,168,0.3)] border-t border-white/50 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-purple-500/80 border border-white/30 flex items-center justify-center text-2xl sm:text-3xl">
                👑
              </div>
            </div>
            <div className="text-center mt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Başlangıç</div>
              <div className="text-xs font-black text-slate-800">1. Kademe</div>
              <div className="text-[10px] font-semibold text-emerald-600">30 dk (Yeşil)</div>
            </div>
          </div>

          {/* Center Medallion: Active Current Stage (Large Center Badge like the Skull Shield in screenshot) */}
          <div className="flex flex-col items-center transform scale-110 sm:scale-125 mx-2 sm:mx-4">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1.5 transition-all ${
                isRed
                  ? 'sunburst-rose'
                  : isOrange
                  ? 'sunburst-amber'
                  : 'sunburst-emerald'
              } border-t-2 border-white/60 flex items-center justify-center`}
            >
              {/* Inner 3D Shield Disc */}
              <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-xs border-2 border-white/60 flex flex-col items-center justify-center text-white shadow-inner">
                {isRed ? (
                  <Flame className="w-8 h-8 text-white drop-shadow-md animate-bounce" />
                ) : isOrange ? (
                  <AlertTriangle className="w-8 h-8 text-white drop-shadow-md" />
                ) : (
                  <ShieldCheck className="w-8 h-8 text-white drop-shadow-md" />
                )}
                <span className="text-xs font-black tracking-tight drop-shadow-xs">
                  {currentStage}/14
                </span>
              </div>
            </div>

            <div className="text-center mt-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Mevcut Seviye</div>
              <div className="text-xs font-black text-slate-900">{timeFormatted.longStr}</div>
              <div
                className={`text-[10px] font-black ${
                  isRed ? 'text-rose-600' : isOrange ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {categoryInfo.label}
              </div>
            </div>
          </div>

          {/* Right Circular Medallion: 14. Kademe (Diamond / Red Critical Limit) */}
          <div className="flex flex-col items-center opacity-85 hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-rose-400 via-red-500 to-rose-600 p-1 shadow-[0_6px_0_#9f1239,0_10px_20px_rgba(225,29,72,0.3)] border-t border-white/50 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-rose-500/80 border border-white/30 flex items-center justify-center text-2xl sm:text-3xl">
                💎
              </div>
            </div>
            <div className="text-center mt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Kritik Sınır</div>
              <div className="text-xs font-black text-slate-800">14. Kademe</div>
              <div className="text-[10px] font-semibold text-rose-600">420 dk (Kırmızı)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
