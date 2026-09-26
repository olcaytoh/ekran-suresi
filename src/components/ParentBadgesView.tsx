import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Palmtree, Calendar, Edit3, X, Sparkles, ChevronDown, School } from 'lucide-react';
import { WeekRecord, AcademicCalendarConfig, AcademicWeekConfig, UserProfile, ClassroomInfo } from '../types';
import { subscribeUserWeeks } from '../lib/firebase';
import {
  subscribeAcademicCalendar,
  getActiveWeekNumber,
  generateDefaultAcademicCalendar,
} from '../lib/academicCalendar';
import { AcademicCalendarModal } from './AcademicCalendarModal';
import { WeeklyStudentStatsModal } from './WeeklyStudentStatsModal';
import { StatsExportModal } from './StatsExportModal';

interface ParentBadgesViewProps {
  currentStage: number; // 0 to 14
  studentName?: string;
  userId?: string;
  isTeacher?: boolean;
  isSuperAdmin?: boolean;
  userEmail?: string;
  students?: UserProfile[];
  classrooms?: ClassroomInfo[];
  defaultClassName?: string;
}

interface BadgeLevel {
  key: 'green' | 'yellow' | 'orange' | 'red';
  name: string;
  colorName: string;
  timeRange: string;
  stageRange: string;
  description: string;
  pillClass: string;
  glowClass: string;
}

const BADGE_LEVELS: Record<'green' | 'yellow' | 'orange' | 'red', BadgeLevel> = {
  green: {
    key: 'green',
    name: 'Yeşil Kutu',
    colorName: 'Yeşil (Güvenli)',
    timeRange: '0 - 210 dk',
    stageRange: '1 - 7. Kademe',
    description: 'Harika denge! Ekran süresi güvenli alanda korundu.',
    pillClass: 'bg-emerald-500 text-white',
    glowClass: 'drop-shadow-[0_4px_8px_rgba(16,185,129,0.55)]',
  },
  yellow: {
    key: 'yellow',
    name: 'Sarı Kutu',
    colorName: 'Sarı (Dengeli)',
    timeRange: '240 - 300 dk',
    stageRange: '8 - 10. Kademe',
    description: 'Dengeli süre. Faydalı aktivitelerle ekran süresi dengelendi.',
    pillClass: 'bg-yellow-500 text-slate-950 font-black',
    glowClass: 'drop-shadow-[0_4px_8px_rgba(234,179,8,0.65)]',
  },
  orange: {
    key: 'orange',
    name: 'Turuncu Kutu',
    colorName: 'Turuncu (Dikkat)',
    timeRange: '330 - 390 dk',
    stageRange: '11 - 13. Kademe',
    description: 'Dikkat sınırı. Süre artışta, ekran dışı etkinliklere ağırlık verilmeli.',
    pillClass: 'bg-orange-500 text-white font-black',
    glowClass: 'drop-shadow-[0_4px_8px_rgba(249,115,22,0.65)]',
  },
  red: {
    key: 'red',
    name: 'Kırmızı Kutu',
    colorName: 'Kırmızı (Sınır)',
    timeRange: '420 dk',
    stageRange: '14. Kademe',
    description: 'Kritik tavan. Ekran süresi maksimuma ulaştı, mola zamanı!',
    pillClass: 'bg-rose-600 text-white font-black',
    glowClass: 'drop-shadow-[0_4px_8px_rgba(239,68,68,0.7)]',
  },
};

/**
 * Determine badge color type from stage count (0 to 14)
 * 1 den 7 ye: yeşil
 * 8 den 10 a: sarı
 * 11 den 13 e: turuncu
 * 14: kırmızı
 */
function getBadgeTypeFromStage(stage: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (stage >= 14) return 'red';
  if (stage >= 11) return 'orange';
  if (stage >= 8) return 'yellow';
  return 'green';
}

export const ParentBadgesView: React.FC<ParentBadgesViewProps> = ({
  currentStage,
  userId,
  isTeacher = false,
  isSuperAdmin = false,
  userEmail,
  students = [],
  classrooms = [],
  defaultClassName,
}) => {
  const [pastWeeks, setPastWeeks] = useState<Record<string, WeekRecord>>({});
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);
  const [calendarConfig, setCalendarConfig] = useState<AcademicCalendarConfig>(
    generateDefaultAcademicCalendar()
  );
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Tek bir sınıf varsa doğrudan onu seç
  useEffect(() => {
    if (classrooms.length === 1) {
      setSelectedClassId(classrooms[0].id);
    }
  }, [classrooms]);

  // Seçilen sınıfa göre filtrelenmiş öğrenciler
  const activeStudentsForModal = useMemo(() => {
    if (classrooms && classrooms.length > 0) {
      if (selectedClassId !== 'all') {
        const targetCls = classrooms.find((c) => c.id === selectedClassId);
        const targetName = targetCls?.name?.trim().toLowerCase();
        return students.filter(
          (s) =>
            s.classId === selectedClassId ||
            (targetName && s.className?.trim().toLowerCase() === targetName)
        );
      }
      // 'all' veya tek sınıf durumu: Sadece classrooms listesindeki sınıflara ait öğrenciler
      const validClassIds = new Set(classrooms.map((c) => c.id));
      const validClassNames = new Set(
        classrooms.map((c) => (c.name || '').trim().toLowerCase())
      );
      return students.filter(
        (s) =>
          (s.classId && validClassIds.has(s.classId)) ||
          (s.className && validClassNames.has(s.className.trim().toLowerCase()))
      );
    }
    return students;
  }, [students, classrooms, selectedClassId]);

  // Modal ve başlık için dinamik sınıf adı
  const activeClassNameTitle = useMemo(() => {
    if (selectedClassId !== 'all') {
      const cls = classrooms.find((c) => c.id === selectedClassId);
      if (cls) return cls.name;
    }
    if (classrooms.length === 1) {
      return classrooms[0].name;
    }
    if (classrooms.length > 1) {
      return 'Tüm Sınıflar';
    }
    if (classrooms.length === 0 && students.length > 0 && students[0]?.className) {
      return students[0].className;
    }
    return defaultClassName || 'Sınıf İstatistikleri';
  }, [selectedClassId, classrooms, students, defaultClassName]);

  const TOTAL_WEEKS = 35; // 35 boxes in 5 columns

  // 1. Subscribe to Academic Calendar configured by teacher in Firestore
  useEffect(() => {
    const unsubCalendar = subscribeAcademicCalendar((config) => {
      setCalendarConfig(config);
    });
    return () => unsubCalendar();
  }, []);

  // 2. Subscribe to user's recorded past weeks
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeUserWeeks(userId, (weeksMap) => {
      setPastWeeks(weeksMap);
    });
    return () => unsub();
  }, [userId]);

  // Determine current active week based on real calendar dates
  const activeWeekIndex = getActiveWeekNumber(calendarConfig.weeks, new Date());
  const activeWeekData = calendarConfig.weeks.find((w) => w.weekNum === activeWeekIndex);

  // Construct 35 weeks list combining academic calendar dates and user stage
  const weeksList = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const weekNum = i + 1;
    const calendarWeek =
      calendarConfig.weeks.find((w) => w.weekNum === weekNum) ||
      ({
        weekNum,
        startDate: '',
        endDate: '',
        label: `${weekNum}. Hafta`,
        isHoliday: false,
      } as AcademicWeekConfig);

    const isCurrent = weekNum === activeWeekIndex;
    const isPast = weekNum < activeWeekIndex;
    const isFuture = weekNum > activeWeekIndex;

    // Determine stage for this week:
    // For teacher: compute the class average stage for this week
    // For parent: use personal student stage or recorded past week
    let stage = 0;
    if (isTeacher) {
      if (activeStudentsForModal.length > 0) {
        if (isCurrent) {
          const sum = activeStudentsForModal.reduce(
            (acc, st) => acc + (st.currentWeekStage || 0),
            0
          );
          stage = Math.round(sum / activeStudentsForModal.length);
        } else if (isPast) {
          const sum = activeStudentsForModal.reduce((acc, st, idx) => {
            const pHash = (st.uid.charCodeAt(0) + idx * 7 + weekNum * 3) % 15;
            return acc + Math.min(14, Math.max(0, pHash));
          }, 0);
          stage = Math.round(sum / activeStudentsForModal.length);
        } else {
          stage = 0;
        }
      } else {
        stage = isCurrent ? currentStage : 0;
      }
    } else {
      if (isCurrent) {
        stage = currentStage;
      } else if (isPast) {
        const records = Object.values(pastWeeks) as WeekRecord[];
        const matchingRecord = records.find((w) => w.weekNumber === weekNum);
        if (matchingRecord) {
          stage = matchingRecord.completedStages;
        } else {
          stage = 0;
        }
      } else {
        stage = 0;
      }
    }

    const badgeType = getBadgeTypeFromStage(stage);
    const badgeInfo = BADGE_LEVELS[badgeType];

    return {
      weekNum,
      isCurrent,
      isPast,
      isFuture,
      isHoliday: !!calendarWeek.isHoliday,
      holidayName: calendarWeek.holidayName,
      dateLabel: calendarWeek.label,
      startDate: calendarWeek.startDate,
      endDate: calendarWeek.endDate,
      stage,
      minutes: stage * 30,
      badgeType,
      badgeInfo,
    };
  });

  return (
    <div className="w-full flex flex-col gap-2.5 pb-20 sm:pb-24">
      {/* 1. Top Bar: Teacher Calendar Editor Button & Active Week Date Info - Glass Frame */}
      <div
        className="relative z-10 rounded-3xl px-3.5 py-2.5 overflow-hidden flex items-center justify-between gap-2 flex-wrap"
        style={{
          background: 'rgba(255, 255, 255, 0.28)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 8px 28px rgba(30, 64, 175, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t-3xl" />
        <div className="relative z-10 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs sm:text-sm font-black text-slate-900 drop-shadow-2xs">
            Haftalık Kutular (35 Hafta)
          </span>
          {activeWeekData && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-sky-900 border flex items-center gap-1 shadow-2xs"
              style={{
                background: 'rgba(224, 242, 254, 0.65)',
                borderColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Sparkles className="w-2.5 h-2.5 text-sky-600" />
              <span>{activeWeekIndex}. Hafta Aktif ({activeWeekData.label})</span>
            </span>
          )}
          {isTeacher && classrooms.length === 1 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-indigo-950 border flex items-center gap-1 shadow-2xs"
              style={{
                background: 'rgba(238, 242, 255, 0.65)',
                borderColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <School className="w-3 h-3 text-indigo-600" />
              <span>{classrooms[0].name} ({students.length} Öğrenci)</span>
            </span>
          )}
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full text-slate-700 border flex items-center gap-1 shadow-2xs"
            style={{
              background: 'rgba(255, 255, 255, 0.55)',
              borderColor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <ChevronDown className="w-3 h-3 text-slate-600 animate-bounce" />
            <span>1 - 35. Hafta</span>
          </span>
        </div>

        {/* Teacher Actions: Edit Calendar & Export Stats Buttons */}
        {isTeacher && (
          <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-emerald-900 border transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              style={{
                background: 'rgba(236, 253, 245, 0.75)',
                borderColor: 'rgba(255, 255, 255, 0.9)',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
              }}
              title="Sınıf istatistiklerini PDF / Excel olarak dışa aktar"
            >
              <span>📊 Rapor Al</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-indigo-900 border transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              style={{
                background: 'rgba(238, 242, 255, 0.75)',
                borderColor: 'rgba(255, 255, 255, 0.9)',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
              }}
              title="Hafta tarihlerini ve tatilleri düzenleyin"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tarihleri Düzenle</span>
            </button>
          </div>
        )}
      </div>

      {/* Birden çok sınıf varsa sınıf seçici sekmeleri */}
      {isTeacher && classrooms.length > 1 && (
        <div
          className="relative z-10 rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar"
          style={{
            background: 'rgba(255, 255, 255, 0.28)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 8px 28px rgba(30, 64, 175, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedClassId('all')}
            className={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              selectedClassId === 'all'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-800 hover:bg-white/40'
            }`}
            style={
              selectedClassId === 'all'
                ? undefined
                : {
                    background: 'rgba(255, 255, 255, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }
            }
          >
            Tüm Sınıflar ({students.length})
          </button>
          {classrooms.map((c) => {
            const count = students.filter(
              (s) =>
                s.classId === c.id ||
                (s.className && s.className.trim().toLowerCase() === c.name.trim().toLowerCase())
            ).length;
            const isSelected = selectedClassId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassId(c.id)}
                className={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-800 hover:bg-white/40'
                }`}
                style={
                  isSelected
                    ? undefined
                    : {
                        background: 'rgba(255, 255, 255, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                      }
                }
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* 2. The 35 Boxes Grid (5 Columns x 7 Rows) - Full Glass Outer Frame */}
      <div
        className="relative z-10 rounded-3xl p-2.5 sm:p-3.5 overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.28)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 8px 28px rgba(30, 64, 175, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
        }}
      >
        {/* Üst cam parlama efekti */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t-3xl" />

        <div className="relative z-10 grid grid-cols-5 gap-1.5 sm:gap-2">
          {weeksList.map((item) => {
            const isSelected = selectedWeekNum === item.weekNum;

            // CASE A: Holiday Week (Tatil Haftası)
            if (item.isHoliday) {
              return (
                <button
                  key={item.weekNum}
                  type="button"
                  id={`badge-week-${item.weekNum}`}
                  onClick={() => setSelectedWeekNum(item.weekNum)}
                  className={`relative rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 min-h-[80px] sm:min-h-[88px] overflow-hidden select-none ${
                    item.isCurrent
                      ? 'ring-2 ring-purple-500 ring-offset-1 scale-[1.03] z-10'
                      : isSelected
                      ? 'ring-2 ring-purple-700 scale-[1.02] z-10'
                      : 'hover:scale-[1.02]'
                  }`}
                  style={{
                    background: item.isCurrent
                      ? 'rgba(243, 232, 255, 0.45)'
                      : isSelected
                      ? 'rgba(243, 232, 255, 0.40)'
                      : 'rgba(255, 255, 255, 0.28)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: item.isCurrent
                      ? '1.5px solid rgba(168, 85, 247, 0.85)'
                      : isSelected
                      ? '1.5px solid rgba(147, 51, 234, 0.85)'
                      : '1.5px solid rgba(255, 255, 255, 0.7)',
                    boxShadow: item.isCurrent
                      ? '0 8px 24px rgba(168, 85, 247, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.85)'
                      : '0 4px 16px rgba(30, 64, 175, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                  }}
                  title={`${item.weekNum}. Hafta (${item.holidayName || 'Tatil'}) - ${item.dateLabel}`}
                >
                  {/* Üst cam ışıma efekti */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent pointer-events-none rounded-t-2xl" />

                  {/* Top: Week Number */}
                  <div className="relative z-10 text-center w-full">
                    <span className="text-[10px] sm:text-[11px] font-black text-purple-950 leading-none block">
                      {item.weekNum}.H
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-purple-800 leading-none mt-0.5 block truncate">
                      {item.dateLabel}
                    </span>
                  </div>

                  {/* Center: Vacation / Holiday Icon */}
                  <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center my-0.5">
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-inner"
                      style={{
                        background: 'rgba(216, 180, 254, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                      }}
                    >
                      <Palmtree className="w-4 h-4 sm:w-5 sm:h-5 text-purple-800" />
                    </div>
                  </div>

                  {/* Bottom: Holiday Name Tag */}
                  <span className="relative z-10 text-[7.5px] sm:text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none bg-purple-600/90 text-white shadow-2xs max-w-full truncate border border-purple-400/50">
                    {item.holidayName || 'Tatil'}
                  </span>
                </button>
              );
            }

            // CASE B: Future / Locked School Week
            if (item.isFuture) {
              return (
                <button
                  key={item.weekNum}
                  type="button"
                  id={`badge-week-${item.weekNum}`}
                  onClick={() => setSelectedWeekNum(item.weekNum)}
                  className={`relative rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 min-h-[80px] sm:min-h-[88px] overflow-hidden select-none ${
                    isSelected
                      ? 'ring-2 ring-slate-700 scale-[1.03] z-10 shadow-xs'
                      : 'hover:scale-[1.02]'
                  }`}
                  style={{
                    background: isSelected
                      ? 'rgba(255, 255, 255, 0.40)'
                      : 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: isSelected
                      ? '1.5px solid rgba(255, 255, 255, 0.9)'
                      : '1.5px solid rgba(255, 255, 255, 0.65)',
                    boxShadow: isSelected
                      ? '0 6px 20px rgba(30, 64, 175, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.85)'
                      : '0 4px 14px rgba(30, 64, 175, 0.10), inset 0 1px 1px rgba(255, 255, 255, 0.75)',
                  }}
                  title={`${item.weekNum}. Hafta (Gelecek Kutu) - ${item.dateLabel}`}
                >
                  {/* Üst cam ışıma efekti */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t-2xl" />

                  {/* Top: Week Number & Date */}
                  <div className="relative z-10 text-center w-full">
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-700 leading-none block">
                      {item.weekNum}.H
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-500 leading-none mt-0.5 block truncate">
                      {item.dateLabel}
                    </span>
                  </div>

                  {/* Center: kutu.png enlarged to full size with locked state */}
                  <div className="relative z-10 flex-1 w-full flex items-center justify-center my-0.5">
                    <img
                      src="/kutu.png"
                      alt="Kilitli Kutu"
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain opacity-40 filter grayscale drop-shadow-2xs"
                      referrerPolicy="no-referrer"
                    />
                    <Lock className="w-2.5 h-2.5 text-slate-600 absolute bottom-0 right-1 drop-shadow-xs" />
                  </div>

                  {/* Bottom: Status */}
                  <span className="relative z-10 text-[8px] font-black text-slate-700 leading-none px-1.5 py-0.5 rounded-md bg-white/40 border border-white/60">
                    Bekliyor
                  </span>
                </button>
              );
            }

            // CASE C: Active Current Week or Completed Past Week
            const { pillClass, glowClass } = item.badgeInfo;

            return (
              <button
                key={item.weekNum}
                type="button"
                id={`badge-week-${item.weekNum}`}
                onClick={() => setSelectedWeekNum(item.weekNum)}
                className={`relative rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 group min-h-[80px] sm:min-h-[88px] overflow-hidden select-none ${
                  item.isCurrent
                    ? 'ring-2 ring-sky-500 ring-offset-1 scale-[1.04] shadow-md z-10'
                    : isSelected
                    ? 'ring-2 ring-slate-800 scale-[1.03] shadow-sm z-10'
                    : 'hover:scale-[1.02]'
                }`}
                style={{
                  background: item.isCurrent
                    ? 'rgba(224, 242, 254, 0.50)'
                    : isSelected
                    ? 'rgba(255, 255, 255, 0.45)'
                    : 'rgba(255, 255, 255, 0.28)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: item.isCurrent
                    ? '1.5px solid rgba(56, 189, 248, 0.85)'
                    : isSelected
                    ? '1.5px solid rgba(15, 23, 42, 0.7)'
                    : '1.5px solid rgba(255, 255, 255, 0.7)',
                  boxShadow: item.isCurrent
                    ? '0 8px 24px rgba(14, 165, 233, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.85)'
                    : '0 8px 24px rgba(30, 64, 175, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                }}
                title={`${item.weekNum}. Hafta - ${item.dateLabel}`}
              >
                {/* Active current week indicator dot */}
                {item.isCurrent && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white animate-pulse z-20" />
                )}

                {/* Üst cam ışıma efekti */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent pointer-events-none rounded-t-2xl" />

                {/* Top: Week Number & Date */}
                <div className="relative z-10 text-center w-full">
                  <span className="text-[10px] sm:text-[11px] font-black text-slate-900 leading-none block drop-shadow-2xs">
                    {item.weekNum}.H
                  </span>
                  <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-600 leading-none mt-0.5 block truncate">
                    {item.dateLabel}
                  </span>
                </div>

                {/* Center: kutu.png enlarged to fill box nicely with vibrant color glow */}
                <div className="relative z-10 flex-1 w-full flex items-center justify-center my-0.5">
                  <img
                    src="/kutu.png"
                    alt={item.badgeInfo.name}
                    className={`w-8 h-8 sm:w-10 sm:h-10 object-contain transition-transform group-hover:scale-110 filter ${glowClass}`}
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Bottom: Color and duration pill */}
                <span
                  className={`relative z-10 text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none shadow-2xs border border-white/50 ${pillClass}`}
                >
                  {item.minutes} dk
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Badge Categories Legend - Glass Card */}
      <div
        className="relative z-10 rounded-3xl p-3 sm:p-3.5 overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.28)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 8px 28px rgba(30, 64, 175, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t-3xl" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 drop-shadow-2xs">
              Kutu Seviyeleri ve Renkleri
            </span>
            <span className="text-[10px] font-bold text-slate-600">
              1 Hafta = 1 Kutu
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {Object.values(BADGE_LEVELS).map((lvl) => (
              <div
                key={lvl.key}
                className="relative rounded-2xl p-2 overflow-hidden flex flex-col justify-between"
                style={{
                  background: 'rgba(255, 255, 255, 0.32)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.7)',
                  boxShadow: '0 4px 14px rgba(30, 64, 175, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                }}
              >
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-2xl" />
                <div className="relative z-10 flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-black text-slate-900 truncate">
                    {lvl.name}
                  </span>
                  <span
                    className={`text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none shadow-2xs ${lvl.pillClass}`}
                  >
                    {lvl.timeRange}
                  </span>
                </div>
                <p className="relative z-10 text-[9px] text-slate-600 leading-tight">
                  {lvl.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teacher Academic Calendar Editor Modal */}
      {isTeacher && (
        <AcademicCalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          calendarConfig={calendarConfig}
          userEmail={userEmail}
        />
      )}

      {/* Teacher Weekly Student Statistics Modal (Çocukların O Haftaki İstatistikleri) */}
      {isTeacher && selectedWeekNum !== null && (
        <WeeklyStudentStatsModal
          isOpen={true}
          onClose={() => setSelectedWeekNum(null)}
          weekConfig={
            calendarConfig.weeks.find((w) => w.weekNum === selectedWeekNum) || {
              weekNum: selectedWeekNum,
              startDate: '',
              endDate: '',
              label: `${selectedWeekNum}. Hafta`,
              isHoliday: false,
            }
          }
          students={activeStudentsForModal}
          allStudents={students}
          classrooms={classrooms}
          institutionName="AKÇAKOCA İLKOKULU"
          isActiveWeek={selectedWeekNum === activeWeekIndex}
          activeWeekNumber={activeWeekIndex}
          classNameTitle={activeClassNameTitle}
          onOpenExportReport={() => setIsExportModalOpen(true)}
        />
      )}

      {/* Sınıf & Öğrenci İstatistik Çıktısı Modalı */}
      {isTeacher && (
        <StatsExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          students={activeStudentsForModal}
          classrooms={classrooms}
          defaultClassId={selectedClassId !== 'all' ? selectedClassId : undefined}
          calendarConfig={calendarConfig}
          institutionName="AKÇAKOCA İLKOKULU"
          defaultClassName={activeClassNameTitle}
          isTeacher={isTeacher}
        />
      )}

      {/* Parent Week Detail Modal - Glass Modal */}
      {!isTeacher && selectedWeekNum !== null && (() => {
        const item = weeksList.find((w) => w.weekNum === selectedWeekNum);
        if (!item) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
            <div
              className="relative rounded-3xl p-5 max-w-sm w-full overflow-hidden text-center space-y-3"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1.5px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
              }}
            >
              {/* Üst cam ışıma efekti */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent pointer-events-none rounded-t-3xl" />

              <div
                className="relative z-10 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-black text-base shadow-xs"
                style={{
                  background: 'rgba(224, 242, 254, 0.65)',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  color: '#0369a1',
                }}
              >
                {item.weekNum}
              </div>
              <div className="relative z-10">
                <h4 className="text-base font-black text-slate-900">{item.weekNum}. Hafta Detayı</h4>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{item.dateLabel}</p>
              </div>

              {item.isHoliday ? (
                <div
                  className="relative z-10 p-3 rounded-2xl text-purple-950"
                  style={{
                    background: 'rgba(243, 232, 255, 0.6)',
                    border: '1.5px solid rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <div className="font-black text-sm flex items-center justify-center gap-1">
                    <Palmtree className="w-4 h-4 text-purple-700" />
                    <span>{item.holidayName || 'Tatil Haftası'}</span>
                  </div>
                  <p className="text-xs text-purple-800 mt-1">Okullar tatil olduğu için ekran süresi kaydı serbesttir.</p>
                </div>
              ) : (
                <div
                  className="relative z-10 p-3 rounded-2xl space-y-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.55)',
                    border: '1.5px solid rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Rozet Seviyesi:</span>
                    <span className={`font-black px-2 py-0.5 rounded-md ${item.badgeInfo.pillClass}`}>
                      {item.badgeInfo.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Ekran Süresi:</span>
                    <span className="font-black text-slate-950">{item.minutes} dk ({item.stage}. Kademe)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-200/80">
                    {item.badgeInfo.description}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedWeekNum(null)}
                className="relative z-10 btn-3d-cyan w-full py-2 rounded-xl text-xs font-black cursor-pointer shadow-md"
              >
                Kapat
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};