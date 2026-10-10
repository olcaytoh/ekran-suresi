import React from 'react';
import { STAGES_CONFIG } from '../lib/stagesData';
import { Plus, Undo2, RotateCcw, Star } from 'lucide-react';

interface ParentStagesCompactProps {
  currentStage: number; // 0 to 14
  onUpdateStage: (newStage: number) => Promise<void>;
  stageDates?: Record<number, string>; // stageNumber (1..14) -> "09.10.26"
  unusedDays?: number; // 0 to 7
  onUpdateUnusedDays?: (newUnusedDays: number) => Promise<void>;
  isUpdating: boolean;
  isTeacher?: boolean;
  classAverageMinutes?: number;
  studentName?: string;
  userId?: string;
  students?: Array<{
    uid: string;
    studentName?: string;
    displayName?: string;
    currentWeekStage?: number;
    currentWeekMinutes?: number;
    currentWeekStageDates?: Record<number, string>;
    currentWeekUnusedDays?: number;
  }>;
}

export const ParentStagesCompact: React.FC<ParentStagesCompactProps> = ({
  currentStage,
  onUpdateStage,
  stageDates = {},
  unusedDays = 0,
  onUpdateUnusedDays,
  isUpdating,
  isTeacher = false,
  classAverageMinutes = 0,
  studentName,
  userId,
  students = [],
}) => {
  const [selectedStudentUid, setSelectedStudentUid] = React.useState<string>('avg');

  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `unused_day_clicked_${userId || studentName || 'default'}`;

  const [lastClickedDate, setLastClickedDate] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) || '';
    }
    return '';
  });

  const selectedStudent = React.useMemo(() => {
    if (!isTeacher || selectedStudentUid === 'avg') return null;
    return students.find((s) => s.uid === selectedStudentUid) || null;
  }, [isTeacher, selectedStudentUid, students]);

  const teacherAvgStage = Math.min(14, Math.max(0, Math.round((classAverageMinutes || 0) / 30)));
  const effectiveStage = isTeacher
    ? selectedStudent
      ? selectedStudent.currentWeekStage || 0
      : teacherAvgStage
    : currentStage;

  // Compute effective stageDates for teacher (either selected student's dates or latest date across students for each stage)
  const effectiveStageDates = React.useMemo<Record<number, string>>(() => {
    if (!isTeacher) return stageDates || {};
    if (selectedStudent) {
      return selectedStudent.currentWeekStageDates || {};
    }
    const aggregated: Record<number, string> = {};
    for (let stg = 1; stg <= 14; stg++) {
      for (const s of students) {
        const d = s.currentWeekStageDates?.[stg];
        if (d) {
          aggregated[stg] = d;
          break;
        }
      }
    }
    return aggregated;
  }, [isTeacher, selectedStudent, students, stageDates]);

  const clampedUnusedDays = Math.min(
    7,
    Math.max(
      0,
      (isTeacher && selectedStudent ? selectedStudent.currentWeekUnusedDays : unusedDays) || 0
    )
  );

  const isAlreadyClickedToday = clampedUnusedDays > 0 && lastClickedDate === todayKey;

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

  const handleAddUnusedDay = async () => {
    if (
      isTeacher ||
      clampedUnusedDays >= 7 ||
      isUpdating ||
      !onUpdateUnusedDays ||
      isAlreadyClickedToday
    ) {
      return;
    }
    handleTriggerHaptic();
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, todayKey);
    }
    setLastClickedDate(todayKey);
    await onUpdateUnusedDays(clampedUnusedDays + 1);
  };

  const handleDecrement = async () => {
    if (isTeacher || currentStage <= 0 || isUpdating) return;
    handleTriggerHaptic();
    await onUpdateStage(currentStage - 1);
  };

  const handleReset = async () => {
    if (isTeacher || (currentStage === 0 && clampedUnusedDays === 0) || isUpdating) return;
    handleTriggerHaptic();
    if (currentStage > 0) {
      await onUpdateStage(0);
    }
    if (clampedUnusedDays > 0 && onUpdateUnusedDays) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
      setLastClickedDate('');
      await onUpdateUnusedDays(0);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between gap-1.5">
      {/* Top Header: Centered and full width matching the 4 stars grid below */}
      <div className="flex flex-col gap-1.5 w-full">
        <div className="w-full text-center text-sm sm:text-base font-black text-slate-900 px-3 py-1 rounded-2xl border border-white/70 bg-white/40 backdrop-blur-md shadow-2xs">
          {isTeacher
            ? selectedStudent
              ? `${selectedStudent.studentName || selectedStudent.displayName} Kademeleri`
              : 'Sınıf Ortalaması Kademeleri'
            : 'Kademeler'}
        </div>

        {isTeacher && students.length > 0 && (
          <select
            value={selectedStudentUid}
            onChange={(e) => setSelectedStudentUid(e.target.value)}
            aria-label="Öğrenci Kademe ve Tarihlerini Seç"
            className="w-full px-3 py-1 rounded-2xl text-xs font-black text-slate-900 border border-white/80 bg-white/65 backdrop-blur-md shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-center truncate"
          >
            <option value="avg">Sınıf Ortalaması ({students.length} Öğrenci)</option>
            {students.map((st, idx) => {
              const name = st.studentName || st.displayName || `Öğrenci #${idx + 1}`;
              const stg = st.currentWeekStage || 0;
              return (
                <option key={st.uid} value={st.uid}>
                  {name} ({stg}. Kademe)
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* 4x4 Grid of Frameless Mascot Stages (1-4: y.png, 5-8: s.png, 9-13: t.png, 14: k.png) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 flex-1">
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
              className={`group relative flex flex-col items-center justify-between p-1 sm:p-1.5 rounded-2xl transition-all duration-150 select-none min-h-[82px] sm:min-h-[96px] ${
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
              <div className="relative w-full flex-1 min-h-[44px] sm:min-h-[54px] flex items-center justify-center pointer-events-none">
                <img
                  src={mascotImg}
                  alt={`${cfg.stageNumber}. Kademe Maskotu`}
                  className={`h-full w-auto max-h-14 sm:max-h-16 md:max-h-20 object-contain transition-all duration-200 ${
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
                {isFilled && (
                  <div
                    className={`text-[10px] sm:text-[11px] font-black leading-none transition-colors ${titleColor}`}
                  >
                    {effectiveStageDates[cfg.stageNumber] ||
                      (() => {
                        const d = new Date();
                        return `${String(d.getDate()).padStart(2, '0')}.${String(
                          d.getMonth() + 1
                        ).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
                      })()}
                  </div>
                )}
                <div
                  className={`text-[9px] sm:text-[9.5px] font-bold leading-none transition-colors ${
                    isFilled ? 'mt-0.5' : ''
                  } ${isFilled ? subColor : 'text-slate-400'}`}
                >
                  30 dk
                </div>
              </div>
            </button>
          );
        })}

        {/* 4x4 Grid Slot 15 & 16: Summary Status Tile */}
        <div className="col-span-2 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl bg-gradient-to-br from-purple-50/85 to-fuchsia-50/70 border border-purple-200/80 text-center select-none overflow-hidden">
          {(!isTeacher || selectedStudent) && clampedUnusedDays > 0 && (
            <div
              onClick={() => {
                if (!isTeacher && !isUpdating && onUpdateUnusedDays && clampedUnusedDays > 0) {
                  handleTriggerHaptic();
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(storageKey);
                  }
                  setLastClickedDate('');
                  onUpdateUnusedDays(clampedUnusedDays - 1);
                }
              }}
              title="Ekran kullanılmayan gün yıldızları"
              className={`flex items-center justify-center gap-0.5 sm:gap-1 flex-nowrap whitespace-nowrap w-full max-w-full overflow-hidden mb-0.5 ${
                isTeacher ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              {Array.from({ length: clampedUnusedDays }).map((_, idx) => (
                <Star
                  key={idx}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-500 shrink-0 drop-shadow-[0_1px_2px_rgba(245,158,11,0.45)]"
                />
              ))}
            </div>
          )}
          <span className="text-[10px] font-black text-purple-800 leading-tight">
            {isTeacher && !selectedStudent ? 'Sınıf Ortalaması' : 'Toplam Süre'}
          </span>
          <span className="text-xs sm:text-sm font-black text-purple-950 mt-0.5 leading-tight">
            {effectiveStage} / 14 Kademe
          </span>
          <span className="text-[10px] font-bold text-purple-700 leading-tight">
            {isTeacher && !selectedStudent
              ? `${classAverageMinutes} dk (${Math.floor(classAverageMinutes / 60)} sa ${classAverageMinutes % 60} dk)`
              : `${effectiveStage * 30} dk (${Math.floor((effectiveStage * 30) / 60)} sa ${(effectiveStage * 30) % 60} dk)`}
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
            className="relative overflow-hidden flex-1 py-2.5 sm:py-3 px-2 rounded-[22px] active:scale-95 disabled:opacity-50 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-all select-none"
            style={{
              background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 48%, #4c1d95 100%)',
              border: '2px solid rgba(255, 255, 255, 0.80)',
              boxShadow:
                '0 8px 20px rgba(124, 58, 237, 0.50), 0 4px 10px rgba(0, 0, 0, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0, 0, 0, 0.35)',
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-1 top-0.5 h-[48%] rounded-t-[18px]"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.20) 45%, rgba(255,255,255,0) 100%)',
            }}
            />
            <Plus
              className="relative z-10 w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] shrink-0"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))' }}
            />
            <span
              className="relative z-10 tracking-tight"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))' }}
            >
              +30 dk Ekle
            </span>
          </button>

          <button
            type="button"
            id="btn-quick-unused-compact"
            onClick={handleAddUnusedDay}
            disabled={clampedUnusedDays >= 7 || isUpdating || isAlreadyClickedToday}
            className="relative overflow-hidden flex-1 py-2.5 sm:py-3 px-2 rounded-[22px] active:scale-95 disabled:opacity-50 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-all select-none"
            style={{
              background: 'linear-gradient(180deg, #e879f9 0%, #c026d3 48%, #701a75 100%)',
              border: '2px solid rgba(255, 255, 255, 0.80)',
              boxShadow:
                '0 8px 20px rgba(192, 38, 211, 0.50), 0 4px 10px rgba(0, 0, 0, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0, 0, 0, 0.35)',
            }}
            title={
              clampedUnusedDays >= 7
                ? 'Haftalık maksimum 7 yıldız eklendi'
                : isAlreadyClickedToday
                ? 'Bugün için ekran kullanılmadı yıldızı zaten eklendi (Günde 1 kez tıklanabilir)'
                : 'Bugün ekran kullanılmadı (+1 Yıldız)'
            }
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-1 top-0.5 h-[48%] rounded-t-[18px]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.20) 45%, rgba(255,255,255,0) 100%)',
              }}
            />
            <Star
              className="relative z-10 w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-300 text-amber-200 shrink-0"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))' }}
            />
            <span
              className="relative z-10 tracking-tight"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))' }}
            >
              Kullanmadı
            </span>
          </button>

          {currentStage > 0 && (
            <button
              type="button"
              id="btn-quick-undo-compact"
              onClick={handleDecrement}
              disabled={isUpdating}
              className="btn-3d-palette-ice px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Geri Al</span>
            </button>
          )}

          {(currentStage > 0 || clampedUnusedDays > 0) && (
            <button
              type="button"
              id="btn-quick-reset-compact"
              onClick={handleReset}
              disabled={isUpdating}
              className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
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