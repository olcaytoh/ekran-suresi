import React from 'react';
import { motion } from 'motion/react';
import { STAGES_CONFIG } from '../lib/stagesData';
import {
  Plus,
  RotateCcw,
  Undo2,
  Check,
  AlertOctagon,
  Sparkles,
  Flame,
  ShieldCheck,
  Play,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface StageGridProps {
  currentStage: number; // 0 to 14
  onUpdateStage: (newStage: number) => Promise<void>;
  isUpdating: boolean;
}

export const StageGrid: React.FC<StageGridProps> = ({
  currentStage,
  onUpdateStage,
  isUpdating,
}) => {
  const handleTriggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore if not supported
      }
    }
  };

  const handleAddThirtyMin = async () => {
    if (currentStage >= 14 || isUpdating) return;
    handleTriggerHaptic();
    await onUpdateStage(currentStage + 1);
  };

  const handleDecrement = async () => {
    if (currentStage <= 0 || isUpdating) return;
    handleTriggerHaptic();
    await onUpdateStage(currentStage - 1);
  };

  const handleDirectStageClick = async (stageNum: number) => {
    if (isUpdating) return;
    handleTriggerHaptic();
    if (stageNum === currentStage) {
      await onUpdateStage(currentStage - 1);
    } else {
      await onUpdateStage(stageNum);
    }
  };

  const nextStageNum = currentStage + 1;
  const nextStageConfig = nextStageNum <= 14 ? STAGES_CONFIG[nextStageNum - 1] : null;
  const isRed = currentStage >= 14;
  const isOrange = currentStage >= 9 && currentStage <= 13;
  const isYellow = currentStage >= 5 && currentStage <= 8;
  
  let mascotImg = '/y.png';
  if (isRed) mascotImg = '/k.png';
  else if (isOrange) mascotImg = '/t.png';
  else if (isYellow) mascotImg = '/s.png';

  return (
    <div className="space-y-5">
      {/* 1. Quick Action Card (Matching the "Last played" card with Play 3D button in screenshot) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
            Hızlı Eylem & Süre Ekleme
          </span>
          <div className="flex items-center gap-1 text-sm">
            {isRed ? '🔥🔥🔥' : isOrange ? '⚠️⚠️' : isYellow ? '⚡⚡' : '⭐⭐⭐'}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-sky-50/50 rounded-2xl p-3 sm:p-4 border border-slate-200">
          {/* Left: Thumbnail & Info */}
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-xs border border-slate-200 flex-shrink-0 bg-white p-0.5">
              <img
                src={mascotImg}
                alt="Maskot"
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
              <span
                className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white ${
                  isRed ? 'bg-rose-500 animate-ping' : isOrange ? 'bg-orange-500' : isYellow ? 'bg-yellow-400' : 'bg-emerald-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  {nextStageNum <= 14 ? `${nextStageNum}. Kademe Kaydı` : 'Maksimum Sınır (14/14)'}
                </h4>
                {nextStageNum <= 14 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    +30 dk
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {nextStageNum <= 14
                  ? `Sıradaki süre: ${nextStageNum * 30} dk • Dokunarak işaretleyin`
                  : '420 dakikalık haftalık tavan sınıra ulaşıldı.'}
              </p>
            </div>
          </div>

          {/* Right: 3D Buttons (Like the 3D Play button in screenshot) */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto w-full sm:w-auto">
            {currentStage > 0 && (
              <button
                type="button"
                id="btn-undo-stage"
                onClick={handleDecrement}
                disabled={isUpdating}
                title="Son 30 dakikayı geri al"
                className="btn-3d-white p-3 rounded-2xl cursor-pointer flex items-center justify-center flex-shrink-0"
              >
                <Undo2 className="w-4 h-4 text-slate-600" />
              </button>
            )}

            {nextStageNum <= 14 ? (
              <button
                type="button"
                id="btn-add-30min"
                disabled={isUpdating}
                onClick={handleAddThirtyMin}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm cursor-pointer ${
                  nextStageNum >= 14
                    ? 'btn-3d-rose'
                    : nextStageNum >= 11
                    ? 'btn-3d-orange'
                    : nextStageNum >= 8
                    ? 'btn-3d-yellow'
                    : 'btn-3d-palette-primary'
                }`}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ 30 Dakika Ekle</span>
              </button>
            ) : (
              <div className="px-5 py-3 rounded-2xl bg-rose-100 text-rose-800 text-xs font-black border border-rose-200 shadow-2xs">
                14 Kademe Doldu
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. The 14 Stages Interactive Grid with 3D Push Buttons */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              14 Kademeli 3D İlerleme Butonları
            </h2>
            <p className="text-xs text-slate-500">
              Her butona basıldığında 30 dakika eklenir; yeşilden (1-7), sarıya (8-10), turuncuya (11-13) ve kırmızıya (14) doğru ilerler.
            </p>
          </div>

          {/* Quick Legend */}
          <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              1-7: Yeşil
            </span>
            <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              8-10: Sarı
            </span>
            <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              11-13: Turuncu
            </span>
            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              14: Kırmızı
            </span>
          </div>
        </div>

        {/* 14 Interactive Buttons (4x4 Frameless Grid) */}
        <div className="grid grid-cols-4 gap-2.5 pt-2">
          {STAGES_CONFIG.map((stage) => {
            const isCompleted = stage.stageNumber <= currentStage;
            const isNext = stage.stageNumber === currentStage + 1;

            let titleColor = 'text-emerald-700';
            let subColor = 'text-emerald-600/90';

            if (stage.category === 'critical') {
              titleColor = 'text-rose-700';
              subColor = 'text-rose-600/90';
            } else if (stage.category === 'warning') {
              titleColor = 'text-orange-700';
              subColor = 'text-orange-600/90';
            } else if (stage.category === 'moderate') {
              titleColor = 'text-amber-700';
              subColor = 'text-amber-600/90';
            }

            return (
              <button
                key={stage.stageNumber}
                type="button"
                id={`stage-3d-btn-${stage.stageNumber}`}
                disabled={isUpdating}
                onClick={() => handleDirectStageClick(stage.stageNumber)}
                className={`relative flex flex-col items-center justify-between p-2 rounded-2xl cursor-pointer transition-all duration-150 active:scale-95 hover:bg-slate-100/60 focus:outline-hidden border-0 bg-transparent select-none min-h-[95px] sm:min-h-[110px] ${
                  isNext ? 'bg-sky-50/50 ring-2 ring-sky-400/40' : ''
                }`}
              >
                {/* Frameless Mascot Image with automatic height */}
                <div className="relative w-full flex-1 min-h-[54px] sm:min-h-[66px] flex items-center justify-center pointer-events-none">
                  <img
                    src={
                      stage.stageNumber >= 14
                        ? '/k.png'
                        : stage.stageNumber >= 9
                        ? '/t.png'
                        : stage.stageNumber >= 5
                        ? '/s.png'
                        : '/y.png'
                    }
                    alt={`${stage.stageNumber}. Kademe`}
                    className={`h-full w-auto max-h-16 sm:max-h-20 object-contain transition-all ${
                      isCompleted
                        ? 'drop-shadow-[0_6px_12px_rgba(0,0,0,0.18)] scale-105 filter-none'
                        : 'opacity-25 grayscale brightness-90 hover:opacity-50'
                    }`}
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Footer: Clicked Date & Duration */}
                <div className="text-center mt-1 pointer-events-none">
                  {isCompleted && (
                    <div className={`text-xs font-black leading-tight ${titleColor}`}>
                      {(() => {
                        const d = new Date();
                        return `${String(d.getDate()).padStart(2, '0')}.${String(
                          d.getMonth() + 1
                        ).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
                      })()}
                    </div>
                  )}
                  <div
                    className={`text-[10px] font-bold ${isCompleted ? 'mt-0.5' : ''} ${
                      isCompleted ? subColor : 'text-slate-300'
                    }`}
                  >
                    {stage.durationMinutes} dk
                  </div>
                </div>
              </button>
            );
          })}

          {/* Slot 15 & 16 */}
          <div className="col-span-2 flex flex-col items-center justify-center p-2 rounded-2xl bg-sky-50/80 border border-sky-100 text-center select-none pointer-events-none">
            <span className="text-[10px] font-bold text-sky-700">Kayıtlı Süre</span>
            <span className="text-xs sm:text-sm font-black text-sky-950">
              {currentStage} / 14 Kademe
            </span>
            <span className="text-[10px] font-bold text-sky-600">
              {currentStage * 30} dk
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
