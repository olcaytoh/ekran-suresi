import React from 'react';
import { STAGES_CONFIG } from '../lib/stagesData';
import { Plus, Undo2, RotateCcw, Check, Sparkles, Flame, ShieldCheck } from 'lucide-react';

interface ParentStagesCompactProps {
  currentStage: number; // 0 to 14
  onUpdateStage: (newStage: number) => Promise<void>;
  isUpdating: boolean;
  isTeacher?: boolean;
  classAverageMinutes?: number;
}

export const ParentStagesCompact: React.FC<ParentStagesCompactProps> = ({
  currentStage,
  onUpdateStage,
  isUpdating,
  isTeacher = false,
  classAverageMinutes = 0,
}) => {
  const teacherAvgStage = Math.min(14, Math.max(0, Math.round((classAverageMinutes || 0) / 30)));
  const effectiveStage = isTeacher ? teacherAvgStage : currentStage;

  const handleTriggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
  };

  const handleStageClick = async (stageNum: number) => {
    if (isTeacher || isUpdating) return;
    handleTriggerHaptic();
    if (stageNum === currentStage) {
      await onUpdateStage(currentStage - 1);
    } else {
      await onUpdateStage(stageNum);
    }
  };

  const handleAddThirtyMin = async () => {
    if (isTeacher || currentStage >= 14 || isUpdating) return;
    handleTriggerHaptic();
    await onUpdateStage(currentStage + 1);
  };

  const handleDecrement = async () => {
    if (isTeacher || currentStage <= 0 || isUpdating) return;
    handleTriggerHaptic();
    await onUpdateStage(currentStage - 1);
  };

  const handleReset = async () => {
    if (isTeacher || currentStage === 0 || isUpdating) return;
    if (window.confirm('Bu haftaki ekran süresi kaydını sıfırlamak istediğinize emin misiniz?')) {
      handleTriggerHaptic();
      await onUpdateStage(0);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between gap-2">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm sm:text-base font-black text-slate-900">
            {isTeacher ? 'Sınıf Ortalaması Kademeleri' : '14 Kademeli Dokunmatik Tuşlar'}
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            ({isTeacher ? `${classAverageMinutes} dk • ${teacherAvgStage}. Kademe` : `${currentStage}. Kademe`})
          </span>
        </div>

        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            isTeacher
              ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
              : 'text-sky-600 bg-sky-50 border-sky-200'
          }`}
        >
          {isTeacher ? 'Sınıf Ortalaması' : 'Dokunarak Seç'}
        </span>
      </div>

      {/* 4x4 Grid of Frameless Mascot Stages (1-4: y.png, 5-8: s.png, 9-13: t.png, 14: k.png) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 flex-1">
        {STAGES_CONFIG.map((cfg) => {
          const isFilled = effectiveStage >= cfg.stageNumber;
          const isCurrent = effectiveStage === cfg.stageNumber;

          // 1 - 4: y.png, 5 - 8: s.png, 9 - 13: t.png, 14: k.png
          const mascotImg =
            cfg.stageNumber >= 14
              ? '/k.png'
              : cfg.stageNumber >= 9
              ? '/t.png'
              : cfg.stageNumber >= 5
              ? '/s.png'
              : '/y.png';

          // Text colors based on stage category
          let titleColor = 'text-emerald-900';
          let subColor = 'text-emerald-800';

          if (cfg.category === 'moderate') {
            titleColor = 'text-amber-900';
            subColor = 'text-amber-800';
          } else if (cfg.category === 'warning') {
            titleColor = 'text-orange-900';
            subColor = 'text-orange-800';
          } else if (cfg.category === 'critical') {
            titleColor = 'text-rose-900';
            subColor = 'text-rose-800';
          }

          return (
            <button
              key={cfg.stageNumber}
              type="button"
              id={`stage-btn-${cfg.stageNumber}`}
              onClick={() => handleStageClick(cfg.stageNumber)}
              disabled={isTeacher || isUpdating}
              className={`group relative flex flex-col items-center justify-between p-1 sm:p-2 rounded-2xl transition-all duration-150 select-none min-h-[95px] sm:min-h-[110px] ${
                isTeacher ? 'cursor-default' : 'cursor-pointer active:scale-95 focus:outline-hidden'
              } ${isCurrent ? 'scale-[1.03]' : ''}`}
              style={{
                background: isCurrent ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: isCurrent
                  ? '1.5px solid rgba(56, 189, 248, 0.8)'
                  : '1px solid rgba(255, 255, 255, 0.32)',
                boxShadow: isCurrent
                  ? '0 6px 18px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
                  : '0 4px 14px rgba(0, 0, 0, 0.10), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
              }}
              title={`${cfg.stageNumber}. Kademe (${cfg.durationMinutes} dk)`}
            >
              {/* Frameless Dragon Mascot (y.png / s.png / t.png / k.png) with automatic height */}
              <div className="relative w-full flex-1 min-h-[54px] sm:min-h-[66px] flex items-center justify-center pointer-events-none">
                <img
                  src={mascotImg}
                  alt={`${cfg.stageNumber}. Kademe Maskotu`}
                  className={`h-full w-auto max-h-16 sm:max-h-20 md:max-h-24 object-contain transition-all duration-200 ${
                    isFilled
                      ? isCurrent
                        ? 'scale-110 drop-shadow-[0_8px_18px_rgba(0,0,0,0.25)] filter-none'
                        : 'scale-105 drop-shadow-[0_6px_12px_rgba(0,0,0,0.18)] filter-none'
                      : 'opacity-25 grayscale brightness-90'
                  }`}
                  draggable={false}
                  referrerPolicy="no-referrer"
                />

                {/* Subtle current indicator dot */}
                {isCurrent && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500 border border-white" />
                  </span>
                )}
              </div>

              {/* Frameless Text Labels */}
              <div
                className="w-full text-center mt-0.5 pointer-events-none rounded-lg py-0.5 px-1"
                style={{
                  background: isFilled ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.30)',
                }}
              >
                <div
                  className={`text-[11px] sm:text-xs font-black leading-tight transition-colors ${
                    isFilled ? titleColor : 'text-slate-500'
                  }`}
                >
                  {cfg.stageNumber}. Kademe
                </div>
                <div
                  className={`text-[9.5px] sm:text-[10px] font-bold mt-0.5 transition-colors ${
                    isFilled ? subColor : 'text-slate-400'
                  }`}
                >
                  {cfg.stageNumber * 30} dk
                </div>
              </div>
            </button>
          );
        })}

        {/* 4x4 Grid Slot 15 & 16: Summary Status Tile */}
        <div className="col-span-2 flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-br from-sky-50/80 to-indigo-50/60 border border-sky-100 text-center select-none pointer-events-none">
          <span className="text-[10px] font-bold text-sky-700">
            {isTeacher ? 'Sınıf Ortalaması' : 'Toplam Süre'}
          </span>
          <span className="text-xs sm:text-sm font-black text-sky-950 mt-0.5">
            {effectiveStage} / 14 Kademe
          </span>
          <span className="text-[10px] font-bold text-sky-600">
            {isTeacher
              ? `${classAverageMinutes} dk (${Math.floor(classAverageMinutes / 60)} sa ${classAverageMinutes % 60} dk)`
              : `${currentStage * 30} dk (${Math.floor((currentStage * 30) / 60)} sa ${(currentStage * 30) % 60} dk)`}
          </span>
        </div>
      </div>

      {/* Action Bar at bottom: Hidden for Teacher per user instruction */}
      {!isTeacher ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            id="btn-quick-add-compact"
            onClick={handleAddThirtyMin}
            disabled={currentStage >= 14 || isUpdating}
            className="btn-3d-palette-primary flex-1 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+30 Dakika Ekle</span>
          </button>

          {currentStage > 0 && (
            <button
              type="button"
              id="btn-quick-undo-compact"
              onClick={handleDecrement}
              disabled={isUpdating}
              className="btn-3d-palette-ice px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Geri Al</span>
            </button>
          )}

          {currentStage > 0 && (
            <button
              type="button"
              id="btn-quick-reset-compact"
              onClick={handleReset}
              disabled={isUpdating}
              className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="py-2 px-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900 font-bold">
          <span>Sınıf ortalaması {classAverageMinutes} dk seviyesine göre kademeler renklendirilmiştir.</span>
          <span className="text-[11px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
            {teacherAvgStage}. Kademe
          </span>
        </div>
      )}
    </div>
  );
};