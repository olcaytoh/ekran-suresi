/**
 * Date and Week utility functions for Weekly Screen Time Tracker
 */

export function getCurrentWeekInfo(date: Date = new Date()): {
  weekId: string;
  year: number;
  weekNumber: number;
  weekLabel: string;
  startDateStr: string;
  endDateStr: string;
} {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  const weekId = `${year}-W${String(weekNumber).padStart(2, '0')}`;

  // Find Monday of this week
  const curr = new Date(date);
  const day = curr.getDay();
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diffToMonday));
  const sunday = new Date(curr.setDate(diffToMonday + 6));

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const startDateStr = `${monday.getDate()} ${monthNames[monday.getMonth()]}`;
  const endDateStr = `${sunday.getDate()} ${monthNames[sunday.getMonth()]} ${year}`;
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
