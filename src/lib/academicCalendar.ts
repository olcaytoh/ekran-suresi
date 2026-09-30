import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { AcademicCalendarConfig, AcademicWeekConfig } from '../types';

export const SHORT_MONTHS_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

export const FULL_MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

/**
 * Format a Date to YYYY-MM-DD string using local time
 */
export function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date range into clean Turkish label: e.g. "7 - 13 Eyl" or "29 Eyl - 5 Eki"
 */
export function formatDateRangeLabel(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '';
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  if (!sy || !sm || !sd || !ey || !em || !ed) return `${startDateStr} - ${endDateStr}`;

  const startMonthName = SHORT_MONTHS_TR[sm - 1] || '';
  const endMonthName = SHORT_MONTHS_TR[em - 1] || '';

  if (sm === em) {
    return `${sd} - ${ed} ${endMonthName}`;
  }
  return `${sd} ${startMonthName} - ${ed} ${endMonthName}`;
}

/**
 * Generate a 35-week default academic calendar starting from a given Monday
 * Pre-populates typical MEB school holidays (Ara tatiller & Sömestr)
 */
export function generateDefaultAcademicCalendar(
  startMondayInput: string | number | Date = '2026-09-07'
): AcademicCalendarConfig {
  let startMondayStr = '2026-09-07';
  if (typeof startMondayInput === 'string' && startMondayInput.includes('-')) {
    startMondayStr = startMondayInput;
  } else if (typeof startMondayInput === 'number') {
    startMondayStr = `${startMondayInput}-09-08`;
  } else if (startMondayInput instanceof Date && !isNaN(startMondayInput.getTime())) {
    startMondayStr = toDateInputValue(startMondayInput);
  }

  const parts = startMondayStr.split('-').map(Number);
  const y = parts[0] || 2026;
  const m = parts[1] || 9;
  const d = parts[2] || 7;
  const baseDate = new Date(y, m - 1, d);

  const TOTAL_WEEKS = 35;
  const weeks: AcademicWeekConfig[] = [];

  for (let i = 0; i < TOTAL_WEEKS; i++) {
    const weekNum = i + 1;
    // Each week starts 7 * i days after base Monday
    const weekStart = new Date(baseDate);
    weekStart.setDate(baseDate.getDate() + i * 7);

    // Week ends 6 days after weekStart (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const sStr = toDateInputValue(weekStart);
    const eStr = toDateInputValue(weekEnd);
    const label = formatDateRangeLabel(sStr, eStr);

    // Standard school holiday estimation in 35-week schedule:
    // Week 10: 1. Ara Tatil (mid-November)
    // Week 20: Yarıyıl / Sömestr 1. Hafta (end-January)
    // Week 21: Yarıyıl / Sömestr 2. Hafta (early-February)
    // Week 29: 2. Ara Tatil (mid-April)
    let isHoliday = false;
    let holidayName = '';

    if (weekNum === 10) {
      isHoliday = true;
      holidayName = '1. Ara Tatil';
    } else if (weekNum === 20) {
      isHoliday = true;
      holidayName = 'Yarıyıl Tatili (1. Hafta)';
    } else if (weekNum === 21) {
      isHoliday = true;
      holidayName = 'Yarıyıl Tatili (2. Hafta)';
    } else if (weekNum === 29) {
      isHoliday = true;
      holidayName = '2. Ara Tatil';
    }

    weeks.push({
      weekNum,
      startDate: sStr,
      endDate: eStr,
      label,
      isHoliday,
      holidayName: holidayName || undefined,
    });
  }

  return {
    schoolStartDate: startMondayStr,
    weeks,
  };
}

/**
 * Find which week is currently active according to real calendar dates
 */
export function getActiveWeekNumber(
  weeksOrConfig?: AcademicWeekConfig[] | AcademicCalendarConfig | null,
  targetDate: Date = new Date()
): number {
  if (!weeksOrConfig) return 1;
  const weeks: AcademicWeekConfig[] = Array.isArray(weeksOrConfig)
    ? weeksOrConfig
    : (weeksOrConfig as AcademicCalendarConfig).weeks || [];
  if (!weeks || weeks.length === 0) return 1;

  const todayStr = toDateInputValue(targetDate);

  // Check if today falls in any configured week
  const matchingWeek = weeks.find((w) => todayStr >= w.startDate && todayStr <= w.endDate);
  if (matchingWeek) {
    return matchingWeek.weekNum;
  }

  // If today is earlier than the first week's start date, point to week 1
  if (todayStr < weeks[0].startDate) {
    return 1;
  }

  // If today is later than the last week's end date, point to the last week
  const lastWeek = weeks[weeks.length - 1];
  if (todayStr > lastWeek.endDate) {
    return lastWeek.weekNum;
  }

  // Fallback to closest week
  for (let i = 0; i < weeks.length; i++) {
    if (todayStr <= weeks[i].endDate) {
      return weeks[i].weekNum;
    }
  }

  return 1;
}

/**
 * Subscribe to the shared Academic Calendar in Firestore
 */
export function subscribeAcademicCalendar(
  callback: (config: AcademicCalendarConfig) => void
): () => void {
  const docRef = doc(db, 'app_settings', 'academic_calendar');

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<AcademicCalendarConfig>;
        if (data.weeks && Array.isArray(data.weeks) && data.weeks.length > 0) {
          callback({
            schoolStartDate: data.schoolStartDate || '2026-09-07',
            weeks: data.weeks as AcademicWeekConfig[],
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          });
          return;
        }
      }
      // If not yet saved in Firestore, supply default 35-week schedule
      callback(generateDefaultAcademicCalendar());
    },
    (error) => {
      console.warn('Academic calendar subscription error, using local default:', error);
      callback(generateDefaultAcademicCalendar());
    }
  );

  return unsubscribe;
}

/**
 * Save / update the Academic Calendar in Firestore (Teacher/Admin action)
 */
export async function saveAcademicCalendar(
  config: AcademicCalendarConfig,
  userEmail?: string
): Promise<void> {
  const docRef = doc(db, 'app_settings', 'academic_calendar');
  await setDoc(
    docRef,
    {
      schoolStartDate: config.schoolStartDate,
      weeks: config.weeks,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail || 'Öğretmen',
    },
    { merge: true }
  );
}
