/**
 * Date and Week utility functions for Weekly Screen Time Tracker
 */

export const WEEKLY_RESET_HOUR = 9; // Her Pazartesi sabah 09:00'da hafta sıfırlanır ve yeni hafta başlar

/**
 * Verilen tarihi haftalık sıfırlama saatine (Pazartesi 09:00) göre kaydırır.
 * Böylece Pazartesi sabah 08:59 hala bir önceki haftaya ait sayılır,
 * Pazartesi sabah 09:00 olduğu anda otomatik olarak yeni haftaya geçilir.
 */
export function getResetAdjustedDate(date: Date = new Date()): Date {
  return new Date(date.getTime() - WEEKLY_RESET_HOUR * 60 * 60 * 1000);
}

export function getCurrentWeekInfo(date: Date = new Date()): {
  weekId: string;
  year: number;
  weekNumber: number;
  weekLabel: string;
  startDateStr: string;
  endDateStr: string;
} {
  // Pazartesi sabah 09:00'da yeni haftaya geçilmesi için tarihi 9 saat geriye kaydırarak hesapla
  const shifted = getResetAdjustedDate(date);

  const d = new Date(Date.UTC(shifted.getFullYear(), shifted.getMonth(), shifted.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  const weekId = `${year}-W${String(weekNumber).padStart(2, '0')}`;

  // Find Monday of this active week
  const curr = new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
  const day = curr.getDay();
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.getFullYear(), curr.getMonth(), diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const startDateStr = `${monday.getDate()} ${monthNames[monday.getMonth()]}`;
  const endDateStr = `${sunday.getDate()} ${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
  const weekLabel = `${weekNumber}. Hafta (${startDateStr} - ${endDateStr})`;

  return {
    weekId,
    year,
    weekNumber,
    weekLabel,
    startDateStr,
    endDateStr,
  };
}

export function formatMinutes(minutes: number): {
  shortStr: string;
  longStr: string;
  hours: number;
  remainingMinutes: number;
} {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  let longStr = '';
  if (hours > 0 && remainingMinutes > 0) {
    longStr = `${hours} saat ${remainingMinutes} dakika`;
  } else if (hours > 0) {
    longStr = `${hours} saat`;
  } else {
    longStr = `${minutes} dakika`;
  }

  const shortStr = `${minutes} dk`;

  return {
    shortStr,
    longStr,
    hours,
    remainingMinutes,
  };
}

export function formatTimeAgo(timestamp?: number | any): string {
  if (!timestamp) return 'Henüz dokunulmadı';
  const time = typeof timestamp === 'number' ? timestamp : (timestamp.seconds ? timestamp.seconds * 1000 : Date.now());
  const diffMs = Date.now() - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dakika önce`;
  if (diffHour < 24) return `${diffHour} saat önce`;
  if (diffDay === 1) return 'Dün';
  return `${diffDay} gün önce`;
}
