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
    // If current week: use live currentStage
    // If past week: check if recorded in Firestore, else 0
    let stage = 0;
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
    <div className="w-full flex flex-col gap-2 pb-20 sm:pb-24">
      {/* 1. Top Bar: Teacher Calendar Editor Button & Active Week Date Info */}
      <div className="flex items-center justify-between px-1 pt-1 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black text-slate-800">
            Haftalık Kutular (35 Hafta)
          </span>
          {activeWeekData && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              {activeWeekIndex}. Hafta Aktif ({activeWeekData.label})
            </span>
          )}
          {isTeacher && classrooms.length === 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <School className="w-3 h-3 text-indigo-500" />
              <span>{classrooms[0].name} ({students.length} Öğrenci)</span>
            </span>
          )}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600 flex items-center gap-0.5">
            <ChevronDown className="w-3 h-3 text-slate-500 animate-bounce" />
            <span>1 - 35. Hafta</span>
          </span>
        </div>

        {/* Teacher Edit Calendar Dates & Holidays Button */}
        {isTeacher && (
          <button
            type="button"
            onClick={() => setIsCalendarModalOpen(true)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-2xs flex items-center gap-1 cursor-pointer flex-shrink-0"
            title="Hafta tarihlerini ve tatilleri düzenleyin"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tarihleri Düzenle</span>
          </button>
        )}
      </div>

      {/* Birden çok sınıf varsa sınıf seçici sekmeleri, tek sınıf varsa net bilgi rozeti */}
      {isTeacher && classrooms.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar px-1">
          <button
            type="button"
            onClick={() => setSelectedClassId('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedClassId === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tüm Sınıflar ({students.length})
          </button>
          {classrooms.map((c) => {
            const count = students.filter(
              (s) =>
                s.classId === c.id ||
                (s.className && s.className.trim().toLowerCase() === c.name.trim().toLowerCase())
            ).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassId(c.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedClassId === c.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {isTeacher && classrooms.length === 1 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-xs font-bold w-fit">
          <School className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          <span>{classrooms[0].name} ({activeStudentsForModal.length} Kayıtlı Öğrenci)</span>
        </div>
      )}

      {/* 2. The 35 Boxes Grid (5 Columns x 7 Rows) - Starting right at the top */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
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
                  className={`relative rounded-2xl p-1 flex flex-col items-center justify-between cursor-pointer transition-all min-h-[76px] sm:min-h-[84px] border bg-gradient-to-b from-purple-50/90 to-purple-100/60 border-purple-200/90 shadow-2xs ${
                    item.isCurrent
                      ? 'ring-2 ring-purple-500 ring-offset-1 scale-[1.03] z-10'
                      : isSelected
                      ? 'ring-2 ring-purple-800 scale-[1.02]'
                      : 'hover:border-purple-300 hover:shadow-xs active:scale-95'
                  }`}
                  title={`${item.weekNum}. Hafta (${item.holidayName || 'Tatil'}) - ${item.dateLabel}`}
                >
                  {/* Top: Week Number */}
                  <div className="text-center w-full">
                    <span className="text-[10px] sm:text-[11px] font-black text-purple-900 leading-none block">
                      {item.weekNum}.H
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-purple-600/90 leading-none mt-0.5 block truncate">
                      {item.dateLabel}
                    </span>
                  </div>

                  {/* Center: Vacation / Holiday Icon */}
                  <div className="relative flex-1 w-full flex flex-col items-center justify-center my-0.5">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-200/70 text-purple-700 flex items-center justify-center shadow-inner">
                      <Palmtree className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                    </div>
                  </div>

                  {/* Bottom: Holiday Name Tag */}
                  <span className="text-[7.5px] sm:text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none bg-purple-600 text-white shadow-2xs max-w-full truncate">
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
                  className={`relative rounded-2xl p-1 flex flex-col items-center justify-between cursor-pointer transition-all min-h-[76px] sm:min-h-[84px] border ${
                    isSelected
                      ? 'ring-2 ring-slate-700 bg-slate-100 border-slate-300 scale-[1.03] shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 active:scale-95'
                  }`}
                  title={`${item.weekNum}. Hafta (Gelecek Kutu) - ${item.dateLabel}`}
                >
                  {/* Top: Week Number & Date */}
                  <div className="text-center w-full">
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-400 leading-none block">
                      {item.weekNum}.H
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-400/80 leading-none mt-0.5 block truncate">
                      {item.dateLabel}
                    </span>
                  </div>

                  {/* Center: kutu.png enlarged to full size with locked state */}
                  <div className="relative flex-1 w-full flex items-center justify-center my-0.5">
                    <img
                      src="/kutu.png"
                      alt="Kilitli Kutu"
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain opacity-35 filter grayscale"
                      referrerPolicy="no-referrer"
                    />
                    <Lock className="w-2.5 h-2.5 text-slate-400 absolute bottom-0 right-1 drop-shadow-xs" />
                  </div>

                  {/* Bottom: Status */}
                  <span className="text-[8px] font-bold text-slate-400 leading-none">
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
                className={`relative rounded-2xl p-1 flex flex-col items-center justify-between cursor-pointer transition-all group min-h-[76px] sm:min-h-[84px] border ${
                  item.isCurrent
                    ? 'ring-2 ring-sky-500 ring-offset-1 bg-sky-50/80 border-sky-300 scale-[1.04] shadow-md z-10'
                    : isSelected
                    ? 'ring-2 ring-slate-900 bg-slate-50 border-slate-400 scale-[1.03] shadow-sm'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-2xs active:scale-95'
                }`}
                title={`${item.weekNum}. Hafta - ${item.dateLabel}`}
              >
                {/* Active current week indicator dot */}
                {item.isCurrent && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white animate-pulse" />
                )}

                {/* Top: Week Number & Date */}
                <div className="text-center w-full">
                  <span className="text-[10px] sm:text-[11px] font-black text-slate-800 leading-none block">
                    {item.weekNum}.H
                  </span>
                  <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-500 leading-none mt-0.5 block truncate">
                    {item.dateLabel}
                  </span>
                </div>

                {/* Center: kutu.png enlarged to fill box nicely with vibrant color glow */}
                <div className="relative flex-1 w-full flex items-center justify-center my-0.5">
                  <img
                    src="/kutu.png"
                    alt={item.badgeInfo.name}
                    className={`w-8 h-8 sm:w-10 sm:h-10 object-contain transition-transform group-hover:scale-110 filter ${glowClass}`}
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Bottom: Color and duration pill */}
                <span
                  className={`text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none shadow-2xs ${pillClass}`}
                >
                  {item.minutes} dk
                </span>
              </button>
            );
          })}
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
          isActiveWeek={selectedWeekNum === activeWeekIndex}
          activeWeekNumber={activeWeekIndex}
          classNameTitle={activeClassNameTitle}
        />
      )}

      {/* Parent Week Detail Modal */}
      {!isTeacher && selectedWeekNum !== null && (() => {
        const item = weeksList.find((w) => w.weekNum === selectedWeekNum);
        if (!item) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 mx-auto flex items-center justify-center font-black text-base">
                {item.weekNum}
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">{item.weekNum}. Hafta Detayı</h4>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{item.dateLabel}</p>
              </div>

              {item.isHoliday ? (
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900">
                  <div className="font-black text-sm flex items-center justify-center gap-1">
                    <Palmtree className="w-4 h-4 text-purple-600" />
                    <span>{item.holidayName || 'Tatil Haftası'}</span>
                  </div>
                  <p className="text-xs text-purple-700 mt-1">Okullar tatil olduğu için ekran süresi kaydı serbesttir.</p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">Rozet Seviyesi:</span>
                    <span className={`font-black px-2 py-0.5 rounded-md ${item.badgeInfo.pillClass}`}>
                      {item.badgeInfo.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">Ekran Süresi:</span>
                    <span className="font-black text-slate-900">{item.minutes} dk ({item.stage}. Kademe)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
                    {item.badgeInfo.description}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedWeekNum(null)}
                className="btn-3d-cyan w-full py-2 rounded-xl text-xs font-black cursor-pointer"
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
