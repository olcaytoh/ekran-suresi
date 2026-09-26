import React, { useState, useMemo } from 'react';
import {
  UserProfile,
  ClassroomInfo,
  AcademicCalendarConfig,
} from '../types';
import {
  ReportSortOption,
  ReportWeekRange,
  buildStudentReportData,
  exportStatisticsToExcel,
  exportStatisticsToPdf,
  printStatisticsReport,
} from '../lib/reportExport';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  ArrowUpDown,
  Filter,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  School,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface StatsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: UserProfile[];
  classrooms?: ClassroomInfo[];
  defaultClassId?: string | null;
  calendarConfig?: AcademicCalendarConfig;
  institutionName?: string;
  defaultClassName?: string;
  isTeacher?: boolean;
}

export const StatsExportModal: React.FC<StatsExportModalProps> = ({
  isOpen,
  onClose,
  students,
  classrooms = [],
  defaultClassId,
  calendarConfig,
  institutionName = 'AKÇAKOCA İLKOKULU',
  defaultClassName = 'Sınıf',
  isTeacher = false,
}) => {
  // Seçili sınıf (Yönetici ise tüm okul veya belirli bir sınıf seçebilir)
  const [selectedClassId, setSelectedClassId] = useState<string>(
    defaultClassId || (classrooms.length > 0 && isTeacher ? classrooms[0].id : 'all')
  );

  // Sıralama ölçütü (Varsayılan: Süreye göre Düşükten Yükseğe - Teşvik edici başarı tablosu)
  const [sortOption, setSortOption] = useState<ReportSortOption>('minutes-asc');

  // Hafta aralığı
  const [weekRange, setWeekRange] = useState<ReportWeekRange>('all_active_past');

  // Önizleme arama
  const [searchQuery, setSearchQuery] = useState<string>('');

  // İndirme / işlem durumları
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Modal açıldığında varsayılan sınıfı güncelle
  React.useEffect(() => {
    if (defaultClassId) {
      setSelectedClassId(defaultClassId);
    } else if (isTeacher && classrooms.length > 0) {
      setSelectedClassId(classrooms[0].id);
    } else {
      setSelectedClassId('all');
    }
  }, [defaultClassId, isTeacher, classrooms]);

  // Seçilen sınıfa göre filtrelenmiş öğrenci listesi
  const filteredByClassStudents = useMemo(() => {
    if (selectedClassId === 'all') {
      return students;
    }
    return students.filter((s) => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Sınıf başlığı
  const currentClassName = useMemo(() => {
    if (selectedClassId === 'all') {
      return 'Tüm Okul / Tüm Sınıflar';
    }
    const found = classrooms.find((c) => c.id === selectedClassId);
    return found?.name || defaultClassName;
  }, [selectedClassId, classrooms, defaultClassName]);

  // Rapor veri seti ve özet
  const reportData = useMemo(() => {
    return buildStudentReportData(
      filteredByClassStudents,
      calendarConfig,
      sortOption,
      weekRange
    );
  }, [filteredByClassStudents, calendarConfig, sortOption, weekRange]);

  // Önizleme tablosu için arama filtresi
  const previewRows = useMemo(() => {
    if (!searchQuery.trim()) return reportData.rows;
    const q = searchQuery.toLowerCase();
    return reportData.rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.parentName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q)
    );
  }, [reportData.rows, searchQuery]);

  if (!isOpen) return null;

  // EXCEL İNDİRME
  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      exportStatisticsToExcel({
        students: filteredByClassStudents,
        calendarConfig,
        sortOption,
        weekRange,
        institutionName,
        className: currentClassName,
      });
      setExportFeedback('Excel (.xlsx) dosyası başarıyla indirildi!');
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err: any) {
      console.error('Excel export error:', err);
      setExportFeedback('Excel oluşturulurken bir hata oluştu.');
      setTimeout(() => setExportFeedback(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  // PDF İNDİRME
  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      exportStatisticsToPdf({
        students: filteredByClassStudents,
        calendarConfig,
        sortOption,
        weekRange,
        institutionName,
        className: currentClassName,
      });
      setExportFeedback('PDF raporu başarıyla oluşturuldu ve indirildi!');
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err: any) {
      console.error('PDF export error:', err);
      setExportFeedback('PDF oluşturulurken bir hata oluştu.');
      setTimeout(() => setExportFeedback(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  // YAZDIR / TARAYICI PDF DİYALOĞU
  const handlePrint = () => {
    printStatisticsReport({
      students: filteredByClassStudents,
      calendarConfig,
      sortOption,
      weekRange,
      institutionName,
      className: currentClassName,
    });
  };

  const { summary, activeWeekNum, weeksToInclude } = reportData;

  // Glass effect styles matching Sınıfım (ParentClassroomView)
  const classroomGlassCardStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.50) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    boxShadow:
      '0 8px 32px rgba(31, 38, 135, 0.15), 0 0 16px rgba(168, 85, 247, 0.18), 0 0 16px rgba(45, 212, 191, 0.16), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
  };

  const neutralGlassCardStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.50) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    boxShadow:
      '0 8px 32px rgba(31, 38, 135, 0.15), 0 0 16px rgba(168, 85, 247, 0.18), 0 0 16px rgba(45, 212, 191, 0.16), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
  };

  const indigoGlassCardStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(140% 140% at 0% 0%, rgba(199,210,254,0.65) 0%, rgba(199,210,254,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(165,180,252,0.50) 0%, rgba(165,180,252,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    boxShadow:
      '0 8px 32px rgba(99, 102, 241, 0.16), 0 0 16px rgba(129, 140, 248, 0.18), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
  };

  const emeraldGlassCardStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(140% 140% at 0% 0%, rgba(167,243,208,0.65) 0%, rgba(167,243,208,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(110,231,183,0.50) 0%, rgba(110,231,183,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    boxShadow:
      '0 8px 32px rgba(16, 185, 129, 0.16), 0 0 16px rgba(52, 211, 153, 0.18), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
  };

  const skyGlassCardStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(140% 140% at 0% 0%, rgba(186,230,253,0.65) 0%, rgba(186,230,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(125,211,252,0.50) 0%, rgba(125,211,252,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    boxShadow:
      '0 8px 32px rgba(14, 165, 233, 0.16), 0 0 16px rgba(56, 189, 248, 0.18), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
  };

  const roseGlassCardStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(140% 140% at 0% 0%, rgba(254,205,211,0.65) 0%, rgba(254,205,211,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(253,164,175,0.50) 0%, rgba(253,164,175,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    boxShadow:
      '0 8px 32px rgba(244, 63, 94, 0.16), 0 0 16px rgba(251, 113, 133, 0.18), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
  };

  const getWeekCellColor = (minutes: number) => {
    const stage = Math.min(14, Math.max(0, Math.round(minutes / 30)));
    if (stage >= 14) {
      return {
        badge: 'bg-rose-100 text-rose-800 border-rose-300 font-black',
        cell: 'bg-rose-50/60',
        label: 'Kritik (420+ dk)',
      };
    }
    if (stage >= 11) {
      return {
        badge: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold',
        cell: 'bg-amber-50/50',
        label: 'Dikkat (330-390 dk)',
      };
    }
    if (stage >= 8) {
      return {
        badge: 'bg-sky-100 text-sky-800 border-sky-300 font-extrabold',
        cell: 'bg-sky-50/50',
        label: 'Dengeli (240-300 dk)',
      };
    }
    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold',
      cell: 'bg-emerald-50/40',
      label: 'Güvenli (0-210 dk)',
    };
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 pb-20 sm:pb-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl"
        style={{
          background:
            'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 244, 255, 0.88) 50%, rgba(235, 248, 255, 0.90) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          boxShadow:
            '0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 35px rgba(99, 102, 241, 0.20), inset 0 1.5px 1px rgba(255, 255, 255, 0.9)',
        }}
      >
        {/* 1. MODAL ÜST BAŞLIK — Cam Efekti */}
        <div
          className="relative z-10 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0"
          style={{
            backgroundImage:
              'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.50) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.40), rgba(255,255,255,0.40))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.75)',
            boxShadow:
              '0 4px 20px rgba(31, 38, 135, 0.08), inset 0 1.5px 1px rgba(255, 255, 255, 0.9)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 truncate flex items-center gap-2">
                <span>İstatistik Raporu &amp; Çıktı Alma</span>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100/90 text-indigo-900 border border-indigo-200 shadow-2xs">
                  PDF &amp; Excel
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 font-bold truncate">
                {institutionName} • {currentClassName} ({summary.totalStudents} Öğrenci)
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-stats-export"
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-all cursor-pointer active:scale-95"
            title="Kapat"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 2. GERİ BİLDİRİM BİLDİRİMİ */}
        {exportFeedback && (
          <div className="px-6 py-2.5 bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-inner">
            <CheckCircle2 className="w-4 h-4" />
            <span>{exportFeedback}</span>
          </div>
        )}

        {/* 3. MODAL İÇERİĞİ (KAYDIRILABİLİR) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 custom-scrollbar">
          {/* FİLTRE VE YAPILANDIRMA BARLARI — Sınıfım Cam Çerçevesi */}
          <div
            className="rounded-3xl p-3.5 sm:p-4 space-y-3"
            style={classroomGlassCardStyle}
          >
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <div className="p-1.5 rounded-xl bg-indigo-100/80 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span>Rapor Kapsamı &amp; Sıralama Ayarları</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Sınıf / Kapsam Seçimi */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Sınıf / Kurum Kapsamı:
                </label>
                <select
                  id="select-report-classroom"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={isTeacher && classrooms.length <= 1}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-white/70 bg-white/70 backdrop-blur-md text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer disabled:bg-slate-100/80"
                >
                  {!isTeacher && <option value="all">🏢 Tüm Okul / Tüm Sınıflar</option>}
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏫 {c.name}
                    </option>
                  ))}
                  {classrooms.length === 0 && (
                    <option value={defaultClassId || 'class1'}>{defaultClassName}</option>
                  )}
                </select>
              </div>

              {/* Sıralama Seçimi (KULLANICI İSTEĞİ: DÜŞÜKTEN-YÜKSEK SÜREYE SIRALAMA) */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Öğrenci Sıralama Ölçütü:
                </label>
                <select
                  id="select-report-sorting"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as ReportSortOption)}
                  className="w-full px-3 py-2 text-xs font-black rounded-xl border border-white/70 bg-white/70 backdrop-blur-md text-indigo-950 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  <option value="minutes-asc">
                    🟢 Ekran Süresi: Düşükten Yükseğe (Az Süre Önce)
                  </option>
                  <option value="minutes-desc">
                    🔴 Ekran Süresi: Yüksekten Düşüğe (Risk Takibi)
                  </option>
                  <option value="name-asc">🔤 Öğrenci Adı: A'dan Z'ye</option>
                  <option value="name-desc">🔤 Öğrenci Adı: Z'den A'ya</option>
                </select>
              </div>

              {/* Hafta Kapsamı */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Haftalık Veri Kapsamı:
                </label>
                <select
                  id="select-report-week-range"
                  value={weekRange}
                  onChange={(e) => setWeekRange(e.target.value as ReportWeekRange)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-white/70 bg-white/70 backdrop-blur-md text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  <option value="all_active_past">
                    📅 1. Haftadan Aktif Haftaya Kadar ({weeksToInclude.length} Hafta)
                  </option>
                  <option value="last_4_weeks">🗓️ Son 4 Hafta</option>
                  <option value="current_week_only">📍 Yalnızca Aktif Hafta ({activeWeekNum}. Hafta)</option>
                </select>
              </div>
            </div>
          </div>

          {/* İSTATİSTİK METRİKLERİ KARTLARI — Sınıfım Cam Çerçeveleri */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
            <div
              className="rounded-3xl p-3 sm:p-3.5 flex flex-col justify-between"
              style={neutralGlassCardStyle}
            >
              <span className="text-[10.5px] font-black text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Toplam Öğrenci
              </span>
              <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1.5">
                {summary.totalStudents}
              </div>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5">Kayıtlı veri</span>
            </div>

            <div
              className="rounded-3xl p-3 sm:p-3.5 flex flex-col justify-between"
              style={indigoGlassCardStyle}
            >
              <span className="text-[10.5px] font-black text-indigo-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Haftalık Ortalama
              </span>
              <div className="text-lg sm:text-2xl font-black text-indigo-950 mt-1.5">
                {summary.avgMinutes} <span className="text-sm font-bold">dk</span>
              </div>
              <span className="text-[10px] font-black text-indigo-700 mt-0.5">
                {summary.avgHoursStr}
              </span>
            </div>

            <div
              className="rounded-3xl p-3 sm:p-3.5 flex flex-col justify-between"
              style={emeraldGlassCardStyle}
            >
              <span className="text-[10.5px] font-black text-emerald-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Yeşil (Güvenli)
              </span>
              <div className="text-lg sm:text-2xl font-black text-emerald-950 mt-1.5">
                {summary.safeCount}{' '}
                <span className="text-xs font-bold text-emerald-700">
                  (%{summary.safePercent})
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 mt-0.5">0-7 Kademe (0-210 dk)</span>
            </div>

            <div
              className="rounded-3xl p-3 sm:p-3.5 flex flex-col justify-between"
              style={skyGlassCardStyle}
            >
              <span className="text-[10.5px] font-black text-sky-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Mavi (Orta)
              </span>
              <div className="text-lg sm:text-2xl font-black text-sky-950 mt-1.5">
                {summary.moderateCount}{' '}
                <span className="text-xs font-bold text-sky-700">
                  (%{summary.moderatePercent})
                </span>
              </div>
              <span className="text-[10px] font-bold text-sky-700 mt-0.5">8-10 Kademe (240-300 dk)</span>
            </div>

            <div
              className="rounded-3xl p-3 sm:p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1"
              style={roseGlassCardStyle}
            >
              <span className="text-[10.5px] font-black text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Uyarı &amp; Kritik
              </span>
              <div className="text-lg sm:text-2xl font-black text-rose-950 mt-1.5">
                {summary.warningCount + summary.criticalCount}{' '}
                <span className="text-xs font-bold text-rose-700">
                  (%{summary.warningPercent + summary.criticalPercent})
                </span>
              </div>
              <span className="text-[10px] font-bold text-rose-700 mt-0.5">11+ Kademe (330+ dk)</span>
            </div>
          </div>

          {/* HAFTANIN EN DÜŞÜK EKRAN SÜRESİNE SAHİP ÖĞRENCİLERİ (ROL MODELLER) — Cam Çerçeve */}
          {summary.topModelStudents.length > 0 && (
            <div
              className="rounded-3xl p-3.5 flex items-center justify-between gap-2 flex-wrap"
              style={{
                backgroundImage:
                  'radial-gradient(140% 140% at 0% 0%, rgba(167,243,208,0.60) 0%, rgba(167,243,208,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(153,246,228,0.55) 0%, rgba(153,246,228,0) 55%), linear-gradient(rgba(255,255,255,0.40), rgba(255,255,255,0.40))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                boxShadow:
                  '0 8px 32px rgba(16, 185, 129, 0.12), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-xs font-black text-emerald-950">
                  Haftanın Rol Modelleri (En Az Ekran Süresi):
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {summary.topModelStudents.map((st, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-2xs"
                    style={{
                      background: 'rgba(255, 255, 255, 0.75)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">
                      {i + 1}
                    </span>
                    <span className="text-slate-900">{st.name}</span>
                    <span className="text-emerald-700 font-extrabold">({st.minutes} dk)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ÖĞRENCİ CANLI ÖNİZLEME TABLOSU — Sınıfım Cam Çerçevesi */}
          <div
            className="rounded-3xl p-3.5 sm:p-4 space-y-3 overflow-hidden"
            style={classroomGlassCardStyle}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  Öğrenci Haftalık Çizelge Önizlemesi ({previewRows.length} Öğrenci)
                </span>
                <span
                  className="text-[10px] font-bold text-indigo-900 px-2.5 py-0.5 rounded-full shadow-2xs"
                  style={{
                    background: 'rgba(238, 242, 255, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                  }}
                >
                  {sortOption === 'minutes-asc'
                    ? 'Düşükten Yükseğe Sıralı'
                    : sortOption === 'minutes-desc'
                    ? 'Yüksekten Düşüğe Sıralı'
                    : 'Alfabetik Sıralı'}
                </span>
              </div>

              {/* Tablo İçi Hızlı Arama */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Öğrenci veya veli ara..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-white/70 bg-white/70 backdrop-blur-md focus:bg-white/95 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs"
                />
              </div>
            </div>

            {/* Haftalık Renk Durumu Bilgilendirme Çubuğu */}
            <div
              className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] sm:text-[10.5px] font-bold text-slate-700 px-3 py-2 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.50)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.75)',
                boxShadow: '0 2px 10px rgba(31, 38, 135, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
              }}
            >
              <span className="text-slate-500 font-black">Haftalık Renk Durumu:</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-800 border border-emerald-300 font-black shadow-2xs">
                🟢 Yeşil (0-210 dk - Güvenli)
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-sky-100/90 text-sky-800 border border-sky-300 font-black shadow-2xs">
                🔵 Mavi (240-300 dk - Dengeli)
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-100/90 text-amber-900 border border-amber-300 font-black shadow-2xs">
                🟠 Turuncu (330-390 dk - Dikkat)
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-rose-100/90 text-rose-800 border border-rose-300 font-black shadow-2xs">
                🔴 Kırmızı (420+ dk - Sınır)
              </span>
            </div>

            <div
              className="overflow-x-auto max-h-[330px] custom-scrollbar rounded-2xl border"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderColor: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 4px 16px rgba(31, 38, 135, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
              }}
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 backdrop-blur-md text-slate-800 sticky top-0 z-10 text-[11px] font-black border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Sıra</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Öğrenci Adı</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Veli Adı</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Sınıf</th>
                    {weeksToInclude.map((w) => (
                      <th
                        key={w}
                        className={`py-2.5 px-2.5 text-center whitespace-nowrap ${
                          w === activeWeekNum ? 'bg-indigo-100 text-indigo-900' : ''
                        }`}
                      >
                        {w === activeWeekNum ? `${w}.H (Aktif)` : `${w}.H`}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center whitespace-nowrap bg-indigo-50 text-indigo-950 font-black">
                      Haftalık Ort.
                    </th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap bg-violet-50 text-violet-950 font-black">
                      Aktif Süre
                    </th>
                    <th className="py-2.5 px-3 text-center">Kademe</th>
                    <th className="py-2.5 px-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  {previewRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8 + weeksToInclude.length}
                        className="py-8 text-center text-slate-400 font-medium"
                      >
                        Filtreye uygun öğrenci bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((r) => {
                      let badgeCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      if (r.category === 'critical') {
                        badgeCls = 'bg-rose-50 text-rose-700 border-rose-200';
                      } else if (r.category === 'warning') {
                        badgeCls = 'bg-orange-50 text-orange-700 border-orange-200';
                      } else if (r.category === 'moderate') {
                        badgeCls = 'bg-sky-50 text-sky-700 border-sky-200';
                      }

                      return (
                        <tr
                          key={r.uid}
                          className="hover:bg-indigo-50/40 transition-colors duration-100"
                        >
                          <td className="py-2 px-3 text-center font-bold text-slate-500">
                            {r.index}
                          </td>
                          <td className="py-2 px-3 font-extrabold text-slate-900">
                            {r.studentName}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-medium">
                            {r.parentName}
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-bold">
                            {r.className}
                          </td>
                          {weeksToInclude.map((w) => {
                            const min = r.weeklyMinutes[w] ?? 0;
                            const colorInfo = getWeekCellColor(min);
                            return (
                              <td
                                key={w}
                                className={`py-1.5 px-1 text-center ${colorInfo.cell} ${
                                  w === activeWeekNum
                                    ? 'ring-1 ring-inset ring-indigo-400 font-black'
                                    : ''
                                }`}
                              >
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] border shadow-2xs whitespace-nowrap ${colorInfo.badge}`}
                                  title={`${w}. Hafta: ${min} dk (${colorInfo.label})`}
                                >
                                  {min} dk
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-center font-black text-indigo-950 bg-indigo-50/40">
                            {r.averageMinutes} dk
                          </td>
                          <td className="py-2 px-3 text-center font-black text-violet-950 bg-violet-50/40">
                            {r.activeWeekMinutes} dk
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-600">
                            {r.activeWeekStage}. Kademe
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeCls}`}
                            >
                              {r.categoryLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. ALT AKSİYON / İNDİRME ÇUBUĞU — Cam Efekti */}
        <div
          className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 flex-wrap flex-shrink-0"
          style={{
            backgroundImage:
              'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.45) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.40) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.45))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.75)',
            boxShadow:
              '0 -4px 20px rgba(31, 38, 135, 0.06), inset 0 1.5px 1px rgba(255, 255, 255, 0.9)',
          }}
        >
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-bold text-slate-800">{summary.totalStudents} Öğrenci</span>
            <span>analiz edildi • İstenilen formatı seçerek anında indirin.</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* EXCEL BUTONU */}
            <button
              type="button"
              id="btn-export-excel"
              onClick={handleExportExcel}
              disabled={isExporting || previewRows.length === 0}
              className="btn-3d-emerald px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black inline-flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Öğrenci haftalık sürelerini ve özet istatistikleri Excel (.xlsx) olarak indir"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel (.xlsx) İndir</span>
            </button>

            {/* PDF BUTONU */}
            <button
              type="button"
              id="btn-export-pdf"
              onClick={handleExportPdf}
              disabled={isExporting || previewRows.length === 0}
              className="btn-3d-rose px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black inline-flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Formatlı PDF Raporu Oluştur ve İndir"
            >
              <FileText className="w-4 h-4" />
              <span>PDF Raporu İndir</span>
            </button>

            {/* YAZDIR / TARAYICI PDF BUTONU */}
            <button
              type="button"
              id="btn-print-report"
              onClick={handlePrint}
              disabled={isExporting || previewRows.length === 0}
              className="btn-3d-palette-primary px-3 sm:px-3.5 py-2 rounded-2xl text-xs font-black inline-flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Renkli Yazıcı / Tarayıcı PDF Diyaloğunu Aç"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF Kaydet</span>
            </button>

            {/* KAPAT BUTONU */}
            <button
              type="button"
              id="btn-close-export-modal"
              onClick={onClose}
              className="btn-3d-cyan px-4 py-2 rounded-2xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95 ml-1"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Kapat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
