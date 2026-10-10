import { UserProfile, ClassroomInfo, AcademicCalendarConfig } from '../types';
import { formatMinutes } from './weekUtils';
import { getStageCategory } from './stagesData';
import {
  generateDefaultAcademicCalendar,
  getActiveWeekNumber,
  getStudentStageForAcademicWeek,
} from './academicCalendar';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export type ReportSortOption =
  | 'minutes-asc'  // Düşükten Yükseğe (Az ekran süresi - teşvik edici)
  | 'minutes-desc' // Yüksekten Düşüğe (Çok ekran süresi - risk takibi)
  | 'name-asc'     // Öğrenci Adı (A - Z)
  | 'name-desc';    // Öğrenci Adı (Z - A)

export type ReportWeekRange =
  | 'all_active_past' // 1. Haftadan mevcut aktif haftaya kadar
  | 'last_4_weeks'    // Son 4 hafta
  | 'current_week_only'; // Sadece aktif hafta

export interface StudentWeeklyReportRow {
  index: number;
  uid: string;
  studentName: string;
  parentName: string;
  className: string;
  weeklyMinutes: Record<number, number>; // weekNum -> minutes
  activeWeekMinutes: number;
  activeWeekStage: number;
  averageMinutes: number;
  totalMinutes: number;
  category: 'safe' | 'moderate' | 'warning' | 'critical';
  categoryLabel: string;
}

export interface ReportSummaryStats {
  institutionName: string;
  className: string;
  reportDateStr: string;
  totalStudents: number;
  avgMinutes: number;
  avgHoursStr: string;
  safeCount: number;
  safePercent: number;
  moderateCount: number;
  moderatePercent: number;
  warningCount: number;
  warningPercent: number;
  criticalCount: number;
  criticalPercent: number;
  topModelStudents: { name: string; minutes: number; className?: string }[];
  attentionStudents: { name: string; minutes: number; category: string; className?: string }[];
}

/**
 * Türkçeye özel karakterleri jsPDF standart fontlarında bozulmaması için
 * temiz transliterasyon yapar.
 */
export function sanitizeForPdf(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U');
}

/**
 * Belirtilen öğrenci listesi ve takvime göre haftalık veri matrisini derler
 */
export function buildStudentReportData(
  students: UserProfile[],
  calendarConfig?: AcademicCalendarConfig,
  sortOption: ReportSortOption = 'minutes-asc',
  weekRange: ReportWeekRange = 'all_active_past',
  activeWeekOverride?: number
): {
  weeksToInclude: number[];
  activeWeekNum: number;
  rows: StudentWeeklyReportRow[];
  summary: ReportSummaryStats;
} {
  const calendar = calendarConfig || generateDefaultAcademicCalendar();
  const activeWeekNum = activeWeekOverride || getActiveWeekNumber(calendar.weeks);

  // Filtrelenecek haftaları belirle
  let weeksToInclude: number[] = [];
  if (weekRange === 'current_week_only') {
    weeksToInclude = [activeWeekNum];
  } else if (weekRange === 'last_4_weeks') {
    const start = Math.max(1, activeWeekNum - 3);
    for (let w = start; w <= activeWeekNum; w++) {
      weeksToInclude.push(w);
    }
  } else {
    // 1'den aktif haftaya kadar
    for (let w = 1; w <= Math.min(35, Math.max(1, activeWeekNum)); w++) {
      weeksToInclude.push(w);
    }
  }

  // Yalnızca veli/öğrenci hesaplarını dahil et
  const validStudents = students.filter(
    (u) => u.role !== 'admin' && u.role !== 'teacher' && u.userType !== 'teacher'
  );

  const rows: StudentWeeklyReportRow[] = validStudents.map((st, idx) => {
    const weeklyMinutes: Record<number, number> = {};
    let sumMinutes = 0;
    let countedWeeks = 0;

    weeksToInclude.forEach((wNum) => {
      const weekCfg = calendar.weeks.find((w) => w.weekNum === wNum);
      const isHoliday = !!weekCfg?.isHoliday;

      let stage = 0;
      let minutes = 0;
      let isBeforeRegistration = false;
      if (isHoliday || wNum > activeWeekNum) {
        stage = 0;
        minutes = 0;
      } else {
        const res = getStudentStageForAcademicWeek(st, wNum, activeWeekNum, calendar);
        stage = res.stage;
        minutes = res.minutes;
        isBeforeRegistration = res.isBeforeRegistration;
      }

      weeklyMinutes[wNum] = minutes;
      if (!isHoliday && !isBeforeRegistration) {
        sumMinutes += minutes;
        countedWeeks += 1;
      }
    });

    const activeStage = st.currentWeekStage ?? 0;
    const activeMinutes = st.currentWeekMinutes ?? activeStage * 30;
    const avgMinutes = countedWeeks > 0 ? Math.round(sumMinutes / countedWeeks) : activeMinutes;
    const catInfo = getStageCategory(activeStage);
    const cat: 'safe' | 'moderate' | 'warning' | 'critical' =
      catInfo.category === 'none' ? 'safe' : catInfo.category;

    let categoryLabel = 'Güvenli (Yeşil)';
    if (cat === 'critical') categoryLabel = 'Kritik (Kırmızı)';
    else if (cat === 'warning') categoryLabel = 'Uyarı (Turuncu)';
    else if (cat === 'moderate') categoryLabel = 'Orta (Mavi)';

    return {
      index: 0, // Sıralamadan sonra verilecek
      uid: st.uid,
      studentName: st.studentName || st.displayName || `Öğrenci #${idx + 1}`,
      parentName: st.parentName || (st.displayName !== st.studentName ? st.displayName : 'Veli'),
      className: st.className || 'Belirtilmemiş',
      weeklyMinutes,
      activeWeekMinutes: activeMinutes,
      activeWeekStage: activeStage,
      averageMinutes: avgMinutes,
      totalMinutes: sumMinutes,
      category: cat,
      categoryLabel,
    };
  });

  // Sıralama
  rows.sort((a, b) => {
    if (sortOption === 'minutes-asc') {
      // Düşükten Yükseğe (Az süre geçiren en başta)
      if (a.activeWeekMinutes !== b.activeWeekMinutes) {
        return a.activeWeekMinutes - b.activeWeekMinutes;
      }
      return a.averageMinutes - b.averageMinutes;
    }
    if (sortOption === 'minutes-desc') {
      // Yüksekten Düşüğe
      if (b.activeWeekMinutes !== a.activeWeekMinutes) {
        return b.activeWeekMinutes - a.activeWeekMinutes;
      }
      return b.averageMinutes - a.averageMinutes;
    }
    if (sortOption === 'name-asc') {
      return a.studentName.localeCompare(b.studentName, 'tr');
    }
    if (sortOption === 'name-desc') {
      return b.studentName.localeCompare(a.studentName, 'tr');
    }
    return 0;
  });

  // 1-tabanlı Sıra Numaralarını ata
  rows.forEach((r, i) => {
    r.index = i + 1;
  });

  // Özet istatistikler
  const totalStudents = rows.length;
  const safeCount = rows.filter((r) => r.category === 'safe').length;
  const moderateCount = rows.filter((r) => r.category === 'moderate').length;
  const warningCount = rows.filter((r) => r.category === 'warning').length;
  const criticalCount = rows.filter((r) => r.category === 'critical').length;

  const totalActMinutes = rows.reduce((acc, r) => acc + r.activeWeekMinutes, 0);
  const avgMinutes = totalStudents > 0 ? Math.round(totalActMinutes / totalStudents) : 0;
  const avgFormatted = formatMinutes(avgMinutes);

  const safePercent = totalStudents > 0 ? Math.round((safeCount / totalStudents) * 100) : 0;
  const moderatePercent = totalStudents > 0 ? Math.round((moderateCount / totalStudents) * 100) : 0;
  const warningPercent = totalStudents > 0 ? Math.round((warningCount / totalStudents) * 100) : 0;
  const criticalPercent = totalStudents > 0 ? Math.round((criticalCount / totalStudents) * 100) : 0;

  // En düşük süreye sahip ilk 3 öğrenci (Düşükten yükseğe sıralı listeden)
  const sortedByMin = [...rows].sort((a, b) => a.activeWeekMinutes - b.activeWeekMinutes);
  const topModelStudents = sortedByMin.slice(0, 3).map((r) => ({
    name: r.studentName,
    minutes: r.activeWeekMinutes,
    className: r.className,
  }));

  // Dikkat gerektiren öğrenciler (Uyarı + Kritik)
  const attentionStudents = rows
    .filter((r) => r.category === 'warning' || r.category === 'critical')
    .sort((a, b) => b.activeWeekMinutes - a.activeWeekMinutes)
    .map((r) => ({
      name: r.studentName,
      minutes: r.activeWeekMinutes,
      category: r.categoryLabel,
      className: r.className,
    }));

  const now = new Date();
  const reportDateStr = now.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const summary: ReportSummaryStats = {
    institutionName: students[0]?.institutionName || 'Kurum Raporu',
    className: students[0]?.className || 'Genel Sınıf',
    reportDateStr,
    totalStudents,
    avgMinutes,
    avgHoursStr: avgFormatted.longStr,
    safeCount,
    safePercent,
    moderateCount,
    moderatePercent,
    warningCount,
    warningPercent,
    criticalCount,
    criticalPercent,
    topModelStudents,
    attentionStudents,
  };

  return {
    weeksToInclude,
    activeWeekNum,
    rows,
    summary,
  };
}

/**
 * EXCEL (.XLSX) DOSYASI OLUŞTURMA VE İNDİRME
 */
export function exportStatisticsToExcel({
  students,
  calendarConfig,
  sortOption = 'minutes-asc',
  weekRange = 'all_active_past',
  institutionName = 'Kurum',
  className = 'Sınıf',
}: {
  students: UserProfile[];
  calendarConfig?: AcademicCalendarConfig;
  sortOption?: ReportSortOption;
  weekRange?: ReportWeekRange;
  institutionName?: string;
  className?: string;
}) {
  const { weeksToInclude, activeWeekNum, rows, summary } = buildStudentReportData(
    students,
    calendarConfig,
    sortOption,
    weekRange
  );

  const sortLabel =
    sortOption === 'minutes-asc'
      ? 'Düşükten Yükseğe (Az Süre Önce)'
      : sortOption === 'minutes-desc'
      ? 'Yüksekten Düşüğe (Çok Süre Önce)'
      : sortOption === 'name-asc'
      ? 'Öğrenci Adı (A-Z)'
      : 'Öğrenci Adı (Z-A)';

  // -------------------------------------------------------------
  // SAYFA 1: Haftalık Ekran Süreleri Tablosu
  // -------------------------------------------------------------
  const sheet1Data: any[][] = [];

  // Başlıklar
  sheet1Data.push([`${institutionName} - ${className}`]);
  sheet1Data.push([`HAFTALIK EKRAN SÜRESİ ÖĞRENCİ TAKİP RAPORU`]);
  sheet1Data.push([`Rapor Tarihi: ${summary.reportDateStr} | Sıralama: ${sortLabel} | Aktif Hafta: ${activeWeekNum}. Hafta`]);
  sheet1Data.push([]); // Boşluk

  // Tablo Sütun Başlıkları
  const headers: string[] = ['Sıra', 'Öğrenci Adı', 'Veli Adı', 'Sınıf'];
  weeksToInclude.forEach((w) => {
    headers.push(w === activeWeekNum ? `${w}. Hafta (Aktif)` : `${w}. Hafta`);
  });
  headers.push('Haftalık Ort. (dk)', 'Aktif Hafta (dk)', 'Mevcut Kademe (0-14)', 'Risk Durumu');
  sheet1Data.push(headers);

  // Satırlar
  rows.forEach((r) => {
    const row: any[] = [r.index, r.studentName, r.parentName, r.className];
    weeksToInclude.forEach((w) => {
      row.push(r.weeklyMinutes[w] ?? 0);
    });
    row.push(r.averageMinutes, r.activeWeekMinutes, `${r.activeWeekStage}. Kademe`, r.categoryLabel);
    sheet1Data.push(row);
  });

  // Toplam & Ortalama Alt Satırı
  sheet1Data.push([]);
  const footerRow: any[] = ['GENEL', 'SINIF ORTALAMASI', '-', '-'];
  weeksToInclude.forEach((w) => {
    const totalW = rows.reduce((sum, r) => sum + (r.weeklyMinutes[w] || 0), 0);
    const avgW = rows.length > 0 ? Math.round(totalW / rows.length) : 0;
    footerRow.push(avgW);
  });
  footerRow.push(summary.avgMinutes, summary.avgMinutes, `${Math.round(summary.avgMinutes / 30)}. Kademe`, '-');
  sheet1Data.push(footerRow);

  const wsStudents = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Sütun Genişlikleri Ayarla
  const colWidths = [
    { wch: 6 },  // Sıra
    { wch: 24 }, // Öğrenci Adı
    { wch: 20 }, // Veli Adı
    { wch: 14 }, // Sınıf
  ];
  weeksToInclude.forEach(() => colWidths.push({ wch: 14 }));
  colWidths.push({ wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 });
  wsStudents['!cols'] = colWidths;

  // -------------------------------------------------------------
  // SAYFA 2: Sınıf & Kurum İstatistik Özeti
  // -------------------------------------------------------------
  const sheet2Data: any[][] = [
    [`${institutionName} - İSTATİSTİKSEL ÖZET RAPOR`],
    [`Rapor Tarihi: ${summary.reportDateStr}`],
    [],
    ['METRİK', 'DEĞER', 'AÇIKLAMA'],
    ['Sınıf / Kapsam Adı', className, 'İncelenen sınıf veya kurum geneli'],
    ['Toplam Öğrenci Sayısı', summary.totalStudents, 'Kayıtlı öğrenci sayısı'],
    ['Aktif Hafta', `${activeWeekNum}. Hafta`, 'Mevcut akademik takvim haftası'],
    ['Haftalık Ortalama Ekran Süresi (dk)', summary.avgMinutes, 'Öğrenci başına ortalama dakika'],
    ['Haftalık Ortalama Süre (Saat)', summary.avgHoursStr, 'Saat cinsinden ortalama süre'],
    ['Sıralama Ölçütü', sortLabel, 'Raporlanan sıralama düzeni'],
    [],
    ['RİSK BÖLGELERİ DAĞILIMI', 'ÖĞRENCİ SAYISI', 'ORAN (%)', 'AŞAMA / SÜRE ARALIĞI'],
    ['Yeşil Bölge (Güvenli)', summary.safeCount, `%${summary.safePercent}`, '0 - 7 Kademe (0 - 210 dakika)'],
    ['Mavi Bölge (Orta)', summary.moderateCount, `%${summary.moderatePercent}`, '8 - 10 Kademe (240 - 300 dakika)'],
    ['Turuncu Bölge (Uyarı)', summary.warningCount, `%${summary.warningPercent}`, '11 - 13 Kademe (330 - 390 dakika)'],
    ['Kırmızı Bölge (Kritik)', summary.criticalCount, `%${summary.criticalPercent}`, '14+ Kademe (420+ dakika)'],
    [],
    ['HAFTANIN EN DÜŞÜK EKRAN SÜRELERİ (ROL MODELLER)'],
    ['Sıra', 'Öğrenci Adı', 'Sınıf', 'Ekran Süresi (dk)'],
  ];

  summary.topModelStudents.forEach((st, i) => {
    sheet2Data.push([i + 1, st.name, st.className || className, `${st.minutes} dk`]);
  });

  if (summary.attentionStudents.length > 0) {
    sheet2Data.push([]);
    sheet2Data.push(['DİKKAT GEREKTİREN ÖĞRENCİLER (UYARI & KRİTİK)']);
    sheet2Data.push(['Sıra', 'Öğrenci Adı', 'Sınıf', 'Süre (dk)', 'Risk Durumu']);
    summary.attentionStudents.forEach((st, i) => {
      sheet2Data.push([i + 1, st.name, st.className || className, `${st.minutes} dk`, st.category]);
    });
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(sheet2Data);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 20 }, { wch: 35 }];

  // Kitabı oluştur ve kaydet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Haftalik_Sureler');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Istatistik_Ozeti');

  const cleanFileBase = `${sanitizeForPdf(institutionName)}_${sanitizeForPdf(className)}_Istatistik`
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const fileName = `${cleanFileBase}_${dateSuffix}.xlsx`;

  // ArrayBuffer formatında Excel ikili verisi üretip Blob oluşturma
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  return { blob, fileName, url };
}

/**
 * CİHAZ VE MOBİL TARAYICI TESPİTİ
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouch = (navigator.maxTouchPoints || 0) > 1;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (isTouch && /Macintosh/i.test(ua))
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouch = (navigator.maxTouchPoints || 0) > 1;
  return /iPhone|iPad|iPod/i.test(ua) || (isTouch && /Macintosh/i.test(ua));
}

/**
 * APK (Capacitor / Android WebView) içinde mi çalışıyoruz?
 * WebView'da <a download> ve blob: indirmeleri çalışmaz; dosya yerel olarak yazılıp paylaşım menüsü açılır.
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * APK için: dosyayı cihazın önbelleğine yazar ve sistem paylaşım/kaydet menüsünü açar
 * (Drive, Dosyalar, WhatsApp, e-posta, PDF/Excel görüntüleyici vb.).
 */
export async function saveAndShareNative(blob: Blob, fileName: string): Promise<boolean> {
  try {
    const dataUrl = await blobToDataUrl(blob);
    const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: fileName,
      text: fileName,
      url: written.uri,
      dialogTitle: 'Dosyayı kaydet / paylaş',
    });
    return true;
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    // Kullanıcı paylaşım menüsünü kapattı: hata değil
    if (/cancel/i.test(msg)) return false;
    console.warn('Native save/share error:', err);
    return false;
  }
}

/**
 * Web Share API (Dosya Paylaşımı / Telefona Kaydetme Desteği)
 */
export function canShareFiles(): boolean {
  if (isNativeApp()) return true;
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    const testFile = new File([''], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Telefonda yerel sistem paylaşım/kaydet menüsünü açar (iOS "Dosyalara Kaydet", Android "İndirilenler/Drive" vb.)
 */
export async function shareFileNative(blob: Blob, fileName: string): Promise<boolean> {
  if (isNativeApp()) return saveAndShareNative(blob, fileName);
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  try {
    const mimeType = blob.type || 'application/octet-stream';
    const file = new File([blob], fileName, {
      type: mimeType,
      lastModified: Date.now(),
    });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }
    await navigator.share({
      files: [file],
      title: fileName,
      text: `${fileName} raporu`,
    });
    return true;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      // Kullanıcı paylaşım menüsünü bilerek kapattı, hata değil
      return false;
    }
    console.warn('Native share notice:', err);
    return false;
  }
}

/**
 * Blob verisini base64 Data URL'e çevirir (iOS Safari download özniteliği blob: protokolünde çalışmadığı için data URL şarttır)
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Data URL üzerinden indirme (Özellikle iOS Safari için native indirme diyaloğunu tetikler)
 */
export async function downloadViaDataUrl(blob: Blob, fileName: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const dataUrl = await blobToDataUrl(blob);
    // Safari'nin indirme diyaloğunu zorlamak için octet-stream MIME kullanılır
    const forcedOctet = dataUrl.replace(/^data:[^;]+;/, 'data:application/octet-stream;');
    const a = document.createElement('a');
    a.href = forcedOctet;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        if (document.body.contains(a)) document.body.removeChild(a);
      } catch {
        // ignore
      }
    }, 4000);
    return true;
  } catch (err) {
    console.warn('downloadViaDataUrl notice:', err);
    return false;
  }
}

/**
 * PDF veya dökümanı mobilde yeni sekmede açar (iOS Safari ve Android Chrome'un yerleşik PDF okuyucusunu açar)
 */
export function openBlobInNewTab(blob: Blob): Window | null {
  // APK: WebView'da blob: adresi açılmaz, dosya yazılıp sistem menüsünden açılır
  if (isNativeApp()) {
    const name = blob.type === 'application/pdf' ? 'istatistik-raporu.pdf' : 'istatistik-raporu';
    saveAndShareNative(blob, name).catch(() => {});
    return null;
  }
  try {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (document.body.contains(a)) document.body.removeChild(a);
        } catch {
          // ignore
        }
      }, 3000);
    }
    return win;
  } catch (err) {
    console.warn('openBlobInNewTab error:', err);
    return null;
  }
}

/**
 * Masaüstü ve Mobil için Evrensel İndirme Yöntemi (Android Chrome, Samsung Internet, iOS Safari ve masaüstü)
 */
export async function downloadBlobUniversal(blob: Blob, fileName: string): Promise<string> {
  const url = URL.createObjectURL(blob);
  // APK (Capacitor): dosyayı yaz + paylaşım/kaydet menüsünü aç
  if (isNativeApp()) {
    await saveAndShareNative(blob, fileName);
    return url;
  }
  if (typeof window === 'undefined') return url;

  // 1. IE / Eski Edge
  if ((window.navigator as any)?.msSaveOrOpenBlob) {
    (window.navigator as any).msSaveOrOpenBlob(blob, fileName);
    return url;
  }

  // 2. Mobil cihazlar (Android APK / WebView / iOS):
  // Eğer Web Share API destekliyorsa doğrudan sistem indirme/kaydetme diyaloğunu aç
  if (isMobileDevice() && canShareFiles()) {
    try {
      const shared = await shareFileNative(blob, fileName);
      if (shared) return url;
    } catch {
      // devam et
    }
  }

  // 3. iOS Safari veya Android WebView için Data URL indirmesi
  try {
    const dataUrl = await blobToDataUrl(blob);
    const forcedOctet = dataUrl.replace(/^data:[^;]+;/, 'data:application/octet-stream;');
    const a = document.createElement('a');
    a.href = forcedOctet;
    a.download = fileName;
    a.setAttribute('download', fileName);
    a.target = '_self';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        if (document.body.contains(a)) document.body.removeChild(a);
      } catch {}
    }, 4000);
  } catch (err) {
    console.warn('Data URL download fallback notice:', err);
  }

  // 4. Standart blob click
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.setAttribute('download', fileName);
    a.rel = 'noopener noreferrer';
    a.style.position = 'fixed';
    a.style.top = '-9999px';
    a.style.left = '-9999px';
    a.style.width = '2px';
    a.style.height = '2px';
    a.style.opacity = '0.01';
    document.body.appendChild(a);

    a.click();

    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      } catch {
        // ignore
      }
    }, 4000);
  } catch (err) {
    console.warn('Standard blob click notice:', err);
  }

  return url;
}

export function triggerFileDownload(blob: Blob, fileName: string): string {
  const url = URL.createObjectURL(blob);
  if (typeof window === 'undefined') return url;

  try {
    if ((window.navigator as any)?.msSaveOrOpenBlob) {
      (window.navigator as any).msSaveOrOpenBlob(blob, fileName);
      return url;
    }

    if (isIOS()) {
      downloadViaDataUrl(blob, fileName).catch(() => {});
      return url;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.setAttribute('download', fileName);
    a.rel = 'noopener noreferrer';
    a.style.position = 'fixed';
    a.style.top = '-9999px';
    a.style.left = '-9999px';
    a.style.width = '2px';
    a.style.height = '2px';
    a.style.opacity = '0.01';
    document.body.appendChild(a);

    a.click();

    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      } catch (e) {
        console.warn('Error cleaning up anchor:', e);
      }
    }, 4000);
  } catch (err) {
    console.warn('Programmatic download trigger notice:', err);
    downloadViaDataUrl(blob, fileName).catch(() => {});
  }
  return url;
}

/**
 * PDF (.PDF) DOSYASI OLUŞTURMA VE İNDİRME
 */
export function exportStatisticsToPdf({
  students,
  calendarConfig,
  sortOption = 'minutes-asc',
  weekRange = 'all_active_past',
  institutionName = 'Kurum',
  className = 'Sınıf',
}: {
  students: UserProfile[];
  calendarConfig?: AcademicCalendarConfig;
  sortOption?: ReportSortOption;
  weekRange?: ReportWeekRange;
  institutionName?: string;
  className?: string;
}) {
  const { weeksToInclude, activeWeekNum, rows, summary } = buildStudentReportData(
    students,
    calendarConfig,
    sortOption,
    weekRange
  );

  const sortLabel =
    sortOption === 'minutes-asc'
      ? 'Ekran Suresi: Dusukten Yuksege (En Az Sure Once)'
      : sortOption === 'minutes-desc'
      ? 'Ekran Suresi: Yuksekten Dusuge'
      : sortOption === 'name-asc'
      ? 'Ogrenci Adi: A-Z'
      : 'Ogrenci Adi: Z-A';

  // Çok hafta varsa yatay (landscape), az hafta varsa dikey (portrait)
  const orientation = weeksToInclude.length > 5 ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Üst Başlık Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(
    sanitizeForPdf(`${institutionName.toUpperCase()} - ${className.toUpperCase()}`),
    14,
    10
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('HAFTALIK EKRAN SURESI VE OGRENCI ISTATISTIK RAPORU', 14, 16);

  const rightDateText = `Tarih: ${summary.reportDateStr.slice(0, 10)} | Aktif Hafta: ${activeWeekNum}. Hafta`;
  doc.text(sanitizeForPdf(rightDateText), pageWidth - 14, 16, { align: 'right' });

  // 2. İstatistik Özet Kutucukları (Cards)
  let startY = 30;
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Siralama Duzeni: ${sortLabel}`, 14, startY);

  startY += 4;
  const boxWidth = (pageWidth - 28 - 12) / 5;
  const boxHeight = 16;

  const metricBoxes = [
    { label: 'Toplam Ogrenci', val: `${summary.totalStudents}`, fill: [241, 245, 249], text: [15, 23, 42] },
    { label: 'Haftalik Ort.', val: `${summary.avgMinutes} dk`, fill: [238, 242, 255], text: [67, 56, 202] },
    { label: 'Yesil (Guvenli)', val: `${summary.safeCount} (%${summary.safePercent})`, fill: [236, 253, 245], text: [4, 120, 87] },
    { label: 'Mavi (Orta)', val: `${summary.moderateCount} (%${summary.moderatePercent})`, fill: [239, 246, 255], text: [29, 78, 216] },
    { label: 'Uyari & Kritik', val: `${summary.warningCount + summary.criticalCount}`, fill: [255, 241, 242], text: [190, 18, 60] },
  ];

  metricBoxes.forEach((mb, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(mb.fill[0], mb.fill[1], mb.fill[2]);
    doc.roundedRect(x, startY, boxWidth, boxHeight, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(mb.label, x + 3, startY + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mb.text[0], mb.text[1], mb.text[2]);
    doc.text(mb.val, x + 3, startY + 12);
  });

  // 3. Tablo Hazırlığı
  const tableHeaders: string[] = ['No', 'Ogrenci Adi', 'Veli Adi', 'Sinif'];
  weeksToInclude.forEach((w) => {
    tableHeaders.push(w === activeWeekNum ? `H.${w} (Aktif)` : `H.${w}`);
  });
  tableHeaders.push('Ortalama', 'Aktif Sure', 'Kademe', 'Durum');

  const tableRows = rows.map((r) => {
    const row: any[] = [
      r.index,
      sanitizeForPdf(r.studentName),
      sanitizeForPdf(r.parentName),
      sanitizeForPdf(r.className),
    ];
    weeksToInclude.forEach((w) => {
      row.push(`${r.weeklyMinutes[w] || 0} dk`);
    });
    row.push(
      `${r.averageMinutes} dk`,
      `${r.activeWeekMinutes} dk`,
      `${r.activeWeekStage}. Kademe`,
      sanitizeForPdf(r.categoryLabel)
    );
    return row;
  });

  // 4. autoTable ile Tablo Çizimi
  autoTable(doc, {
    startY: startY + boxHeight + 6,
    head: [tableHeaders],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'left' },
      3: { halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Hafta sütunlarını durum rengine boya
      if (
        data.section === 'body' &&
        data.column.index >= 4 &&
        data.column.index < 4 + weeksToInclude.length
      ) {
        const rawVal = String(data.cell.raw || '');
        const num = parseInt(rawVal, 10) || 0;
        const st = Math.min(14, Math.max(0, Math.round(num / 30)));
        if (st >= 14) {
          data.cell.styles.fillColor = [255, 228, 230]; // Kırmızı
          data.cell.styles.textColor = [159, 18, 57];
          data.cell.styles.fontStyle = 'bold';
        } else if (st >= 11) {
          data.cell.styles.fillColor = [255, 237, 213]; // Turuncu
          data.cell.styles.textColor = [154, 52, 18];
          data.cell.styles.fontStyle = 'bold';
        } else if (st >= 8) {
          data.cell.styles.fillColor = [224, 242, 254]; // Mavi
          data.cell.styles.textColor = [3, 105, 161];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.fillColor = [209, 250, 229]; // Yeşil
          data.cell.styles.textColor = [6, 95, 70];
        }
      }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Sayfa alt bilgisi (Footer)
      const pageStr = `Sayfa ${data.pageNumber}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        sanitizeForPdf(`Haftalik Ekran Suresi Takip Sistemi - ${institutionName}`),
        14,
        doc.internal.pageSize.getHeight() - 8
      );
      doc.text(pageStr, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, {
        align: 'right',
      });
    },
  });

  const cleanFileBase = `${sanitizeForPdf(institutionName)}_${sanitizeForPdf(className)}_Rapor`
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const fileName = `${cleanFileBase}_${dateSuffix}.pdf`;

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  return { blob, fileName, url, doc };
}

/**
 * YAZDIR / TARAYICIDAN KUSURSUZ VE RENKLİ PDF KAYDETME
 */
export function printStatisticsReport({
  students,
  calendarConfig,
  sortOption = 'minutes-asc',
  weekRange = 'all_active_past',
  institutionName = 'Kurum',
  className = 'Sınıf',
}: {
  students: UserProfile[];
  calendarConfig?: AcademicCalendarConfig;
  sortOption?: ReportSortOption;
  weekRange?: ReportWeekRange;
  institutionName?: string;
  className?: string;
}) {
  // APK: WebView'da yazdırma diyaloğu yok; PDF üretilip sistem paylaşım menüsünden açılır/kaydedilir
  if (isNativeApp()) {
    try {
      const res = exportStatisticsToPdf({
        students,
        calendarConfig,
        sortOption,
        weekRange,
        institutionName,
        className,
      });
      saveAndShareNative(res.blob, res.fileName).catch(() => {});
    } catch (err) {
      console.warn('Native print fallback error:', err);
    }
    return;
  }

  const { weeksToInclude, activeWeekNum, rows, summary } = buildStudentReportData(
    students,
    calendarConfig,
    sortOption,
    weekRange
  );

  const sortLabel =
    sortOption === 'minutes-asc'
      ? 'Düşükten Yükseğe (Az Süre Önce)'
      : sortOption === 'minutes-desc'
      ? 'Yüksekten Düşüğe (Çok Süre Önce)'
      : sortOption === 'name-asc'
      ? 'Öğrenci Adı (A-Z)'
      : 'Öğrenci Adı (Z-A)';

  const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${institutionName} - ${className} İstatistik Raporu</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 16px;
      background: #ffffff;
      font-size: 11px;
    }
    .header {
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title {
      font-size: 18px;
      font-weight: 900;
      color: #1e1b4b;
      margin: 0 0 4px 0;
    }
    .subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }
    .meta-box {
      text-align: right;
      font-size: 10px;
      color: #475569;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .stat-card {
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .stat-card.safe { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
    .stat-card.moderate { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
    .stat-card.warning { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
    .stat-card.critical { background: #fff1f2; border-color: #fecdd3; color: #9f1239; }
    .stat-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-val { font-size: 16px; font-weight: 900; margin-top: 2px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 10px;
    }
    th {
      background: #4f46e5;
      color: #ffffff;
      padding: 7px 6px;
      font-weight: 800;
      text-align: center;
      border: 1px solid #4338ca;
    }
    td {
      padding: 6px 6px;
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .text-left { text-align: left !important; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 800;
    }
    .badge-safe { background: #d1fae5; color: #065f46; }
    .badge-moderate { background: #dbeafe; color: #1e40af; }
    .badge-warning { background: #ffedd5; color: #9a3412; }
    .badge-critical { background: #ffe4e6; color: #9f1239; }

    .footer {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
    .print-actions {
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      background: #f1f5f9;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
    }
    .btn-back {
      background: #334155;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-back:hover {
      background: #1e293b;
    }
    .btn-print {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-print:hover {
      background: #4338ca;
    }
    @media print {
      .print-actions { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button type="button" class="btn-back" onclick="if(window.opener){window.close();}else if(window.parent&&window.parent!==window){window.parent.focus();}else{history.back();}">← Uygulamaya Geri Dön</button>
    <button type="button" class="btn-print" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">${institutionName} - ${className}</h1>
      <p class="subtitle">HAFTALIK EKRAN SÜRESİ VE ÖĞRENCİ İSTATİSTİK RAPORU</p>
    </div>
    <div class="meta-box">
      <div><strong>Tarih:</strong> ${summary.reportDateStr}</div>
      <div><strong>Sıralama:</strong> ${sortLabel}</div>
      <div><strong>Aktif Hafta:</strong> ${activeWeekNum}. Hafta</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Toplam Öğrenci</div>
      <div class="stat-val">${summary.totalStudents}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Haftalık Ortalama</div>
      <div class="stat-val">${summary.avgMinutes} dk</div>
    </div>
    <div class="stat-card safe">
      <div class="stat-label">Yeşil (Güvenli)</div>
      <div class="stat-val">${summary.safeCount} <span style="font-size:11px;">(%${summary.safePercent})</span></div>
    </div>
    <div class="stat-card moderate">
      <div class="stat-label">Mavi (Orta)</div>
      <div class="stat-val">${summary.moderateCount} <span style="font-size:11px;">(%${summary.moderatePercent})</span></div>
    </div>
    <div class="stat-card critical">
      <div class="stat-label">Uyarı & Kritik</div>
      <div class="stat-val">${summary.warningCount + summary.criticalCount} <span style="font-size:11px;">(%${summary.warningPercent + summary.criticalPercent})</span></div>
    </div>
  </div>

  <div style="display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: bold; margin-bottom: 8px; flex-wrap: wrap;">
    <span style="color: #64748b;">Haftalık Durum Renkleri:</span>
    <span class="badge badge-safe">🟢 Yeşil (0-210 dk - Güvenli)</span>
    <span class="badge badge-moderate">🔵 Mavi (240-300 dk - Dengeli)</span>
    <span class="badge badge-warning">🟠 Turuncu (330-390 dk - Dikkat)</span>
    <span class="badge badge-critical">🔴 Kırmızı (420+ dk - Sınır)</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">Sıra</th>
        <th class="text-left" style="width: 140px;">Öğrenci Adı</th>
        <th class="text-left" style="width: 120px;">Veli Adı</th>
        <th style="width: 70px;">Sınıf</th>
        ${weeksToInclude
          .map(
            (w) =>
              `<th>${w === activeWeekNum ? `${w}. Hafta (Aktif)` : `${w}. H.`}</th>`
          )
          .join('')}
        <th>Haftalık Ort.</th>
        <th>Aktif Süre</th>
        <th>Kademe</th>
        <th>Risk Seviyesi</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map((r) => {
          let badgeCls = 'badge-safe';
          if (r.category === 'critical') badgeCls = 'badge-critical';
          else if (r.category === 'warning') badgeCls = 'badge-warning';
          else if (r.category === 'moderate') badgeCls = 'badge-moderate';

          return `
        <tr>
          <td><strong>${r.index}</strong></td>
          <td class="text-left"><strong>${r.studentName}</strong></td>
          <td class="text-left">${r.parentName}</td>
          <td>${r.className}</td>
          ${weeksToInclude
            .map((w) => {
              const min = r.weeklyMinutes[w] ?? 0;
              const st = Math.min(14, Math.max(0, Math.round(min / 30)));
              let wCls = 'badge-safe';
              if (st >= 14) wCls = 'badge-critical';
              else if (st >= 11) wCls = 'badge-warning';
              else if (st >= 8) wCls = 'badge-moderate';
              return `<td><span class="badge ${wCls}">${min} dk</span></td>`;
            })
            .join('')}
          <td><strong>${r.averageMinutes} dk</strong></td>
          <td><strong>${r.activeWeekMinutes} dk</strong></td>
          <td>${r.activeWeekStage}. Kademe</td>
          <td><span class="badge ${badgeCls}">${r.categoryLabel}</span></td>
        </tr>
      `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <div>Haftalık Ekran Süresi Takip Sistemi • ${institutionName}</div>
    <div>Rapor Oluşturuldu: ${summary.reportDateStr}</div>
  </div>

  <script>
    window.onload = function() {
      // Otomatik yazdırma diyaloğu (kullanıcı isterse direkt yazdırabilir)
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  // Güvenli yazdırma: Gizli iframe kullanarak uygulamadan ayrılmadan yazdırma diyaloğu açılır
  try {
    let iframe = document.getElementById('report-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'report-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print error, falling back to window:', e);
          fallbackWindowPrint(htmlContent);
        }
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('Hidden iframe print failed, falling back to window:', err);
  }

  fallbackWindowPrint(htmlContent);
}

function fallbackWindowPrint(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    console.warn('Yazdırma penceresi açılamadı. Lütfen tarayıcı açılır pencere (pop-up) izinlerini kontrol ediniz.');
  }
}