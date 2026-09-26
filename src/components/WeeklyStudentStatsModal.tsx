import React, { useState, useMemo } from 'react';
import { AcademicWeekConfig, UserProfile, AcademicCalendarConfig, ClassroomInfo } from '../types';
import { getStageCategory } from '../lib/stagesData';
import { formatMinutes } from '../lib/weekUtils';
import {
  X,
  Users,
  Search,
  Sparkles,
  Calendar,
  Clock,
  Palmtree,
  Printer,
  Copy,
  Check,
  TrendingDown,
  TrendingUp,
  Minus,
  MessageCircle,
  BarChart3,
  AlertTriangle,
  Award,
  ShieldCheck,
  Share2,
  ExternalLink,
  ChevronRight,
  Filter,
  MessageSquare,
  Send,
} from 'lucide-react';
import { SendMessageModal } from './SendMessageModal';

interface WeeklyStudentStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekConfig: AcademicWeekConfig;
  students: UserProfile[];
  allStudents?: UserProfile[];
  classrooms?: ClassroomInfo[];
  isActiveWeek?: boolean;
  activeWeekNumber?: number;
  classNameTitle?: string;
  institutionName?: string;
  calendarConfig?: AcademicCalendarConfig;
  onOpenExportReport?: () => void;
  currentUserProfile?: UserProfile | null;
}

export const WeeklyStudentStatsModal: React.FC<WeeklyStudentStatsModalProps> = ({
  isOpen,
  onClose,
  weekConfig,
  students,
  allStudents = [],
  classrooms = [],
  isActiveWeek = false,
  activeWeekNumber = 1,
  classNameTitle = 'Sınıf Detayı',
  institutionName = 'AKÇAKOCA İLKOKULU',
  onOpenExportReport,
  currentUserProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'comparison'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'urgent' | 'safe' | 'moderate' | 'warning' | 'critical'
  >('all');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedStudentUid, setCopiedStudentUid] = useState<string | null>(null);

  // Uygulama içi mesajlaşma modal state'i
  const [messagingStudent, setMessagingStudent] = useState<any | null>(null);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  if (!isOpen) return null;

  const isFuture = weekConfig.weekNum > activeWeekNumber;
  const isHoliday = !!weekConfig.isHoliday;

  // Sadece öğrencileri filtrele (öğretmenler hariç)
  const studentList = students.filter(
    (u) => u.role !== 'admin' && u.role !== 'teacher' && u.userType !== 'teacher'
  );

  // Öğrenci verilerini ve geçmiş haftalık renk geçmişini hesapla
  const studentStats = studentList.map((st, idx) => {
    let stage = 0;
    if (isActiveWeek) {
      stage = st.currentWeekStage || 0;
    } else if (isFuture || isHoliday) {
      stage = 0;
    } else {
      // Geçmiş hafta simülasyonu
      const pseudoHash = (st.uid.charCodeAt(0) + idx * 7 + weekConfig.weekNum * 3) % 15;
      stage = Math.min(14, Math.max(0, pseudoHash));
    }

    const minutes = stage * 30;
    const category = getStageCategory(stage);

    // Bir önceki haftaya göre değişim trendi (Trend Okları için)
    let prevMinutes = 0;
    if (weekConfig.weekNum > 1 && !isHoliday) {
      const prevHash = (st.uid.charCodeAt(0) + idx * 7 + (weekConfig.weekNum - 1) * 3) % 15;
      prevMinutes = Math.min(14, Math.max(0, prevHash)) * 30;
    }
    const diff = weekConfig.weekNum > 1 ? minutes - prevMinutes : 0;

    // Geçmiş haftaların renk geçmişi (1. haftadan bu haftaya kadar)
    const historyWeeks = Array.from(
      { length: Math.min(weekConfig.weekNum, 10) },
      (_, i) => i + 1
    ).map((wNum) => {
      let wStage = 0;
      if (wNum === activeWeekNumber) {
        wStage = st.currentWeekStage || 0;
      } else {
        const wHash = (st.uid.charCodeAt(0) + idx * 7 + wNum * 3) % 15;
        wStage = Math.min(14, Math.max(0, wHash));
      }
      return {
        weekNum: wNum,
        stage: wStage,
        minutes: wStage * 30,
        isCurrentWeek: wNum === weekConfig.weekNum,
      };
    });

    return {
      uid: st.uid,
      studentName: st.studentName || st.displayName || `Öğrenci #${idx + 1}`,
      parentName: st.parentName || (st.displayName !== st.studentName ? st.displayName : 'Veli'),
      className: st.className,
      stage,
      minutes,
      category,
      diff,
      historyWeeks,
      formattedTime: formatMinutes(minutes),
    };
  });

  const totalStudents = studentStats.length;
  const safeCount = studentStats.filter((s) => s.stage <= 7).length;
  const moderateCount = studentStats.filter((s) => s.stage >= 8 && s.stage <= 10).length;
  const warningCount = studentStats.filter((s) => s.stage >= 11 && s.stage <= 13).length;
  const criticalCount = studentStats.filter((s) => s.stage >= 14).length;
  const urgentCount = warningCount + criticalCount; // Destek/Riskli (Turuncu + Kırmızı)

  const totalMinutes = studentStats.reduce((acc, s) => acc + s.minutes, 0);
  const avgMinutes = totalStudents > 0 ? Math.round(totalMinutes / totalStudents) : 0;
  const avgStage = Math.min(14, Math.max(0, Math.round(avgMinutes / 30)));

  const safePercent = totalStudents > 0 ? Math.round((safeCount / totalStudents) * 100) : 0;
  const moderatePercent = totalStudents > 0 ? Math.round((moderateCount / totalStudents) * 100) : 0;
  const warningPercent = totalStudents > 0 ? Math.round((warningCount / totalStudents) * 100) : 0;
  const criticalPercent = totalStudents > 0 ? Math.round((criticalCount / totalStudents) * 100) : 0;

  // Filtreleme (Risk/Uyarı Filtresi Dahil)
  const filteredStudents = studentStats.filter((s) => {
    const matchName =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchName) return false;

    if (filterCategory === 'urgent') return s.stage >= 11; // Destek/Riskli (Turuncu + Kırmızı)
    if (filterCategory === 'safe') return s.stage <= 7;
    if (filterCategory === 'moderate') return s.stage >= 8 && s.stage <= 10;
    if (filterCategory === 'warning') return s.stage >= 11 && s.stage <= 13;
    if (filterCategory === 'critical') return s.stage >= 14;
    return true;
  });

  // Sıralama (en çok kullanan en üstte)
  filteredStudents.sort((a, b) => b.minutes - a.minutes);

  // Sınıflar Arası Karşılaştırma Verisi
  const effectiveClassroomsList = classrooms.length > 0 ? classrooms : [
    {
      id: 'demo-class-1a',
      code: 'AKC-1A',
      name: '1-A Sınıfı',
      teacherUid: 't1',
      teacherName: 'Ayşe Kaya',
      teacherEmail: 'ayse@akcakocailkokulu.k12.tr',
    },
    {
      id: 'demo-class-2b',
      code: 'AKC-2B',
      name: '2-B Sınıfı',
      teacherUid: 't2',
      teacherName: 'Mehmet Demir',
      teacherEmail: 'mehmet@akcakocailkokulu.k12.tr',
    },
    {
      id: 'demo-class-3c',
      code: 'AKC-3C',
      name: '3-C Sınıfı',
      teacherUid: 't3',
      teacherName: 'Zeynep Çelik',
      teacherEmail: 'zeynep@akcakocailkokulu.k12.tr',
    },
  ];

  const poolStudents = allStudents.length > 0 ? allStudents : students;

  const classComparisonStats = effectiveClassroomsList.map((cls, cIdx) => {
    // Sınıfa ait öğrencileri bul
    const cStudents = poolStudents.filter(
      (s) =>
        s.role !== 'admin' &&
        s.role !== 'teacher' &&
        s.userType !== 'teacher' &&
        (s.classId === cls.id || s.className?.trim().toLowerCase() === cls.name.trim().toLowerCase())
    );

    const cCount = cStudents.length > 0 ? cStudents.length : 10;
    const cCalculatedStudents = (cStudents.length > 0 ? cStudents : Array.from({ length: 10 }, (_, idx) => ({
      uid: `${cls.id}_st_${idx}`,
      displayName: `Öğrenci ${idx + 1}`,
      currentWeekStage: Math.min(14, Math.max(0, (cls.id.charCodeAt(0) + idx * 5 + weekConfig.weekNum * 2) % 15)),
    }))).map((st: any, idx: number) => {
      let stage = 0;
      if (isActiveWeek && st.currentWeekStage !== undefined) {
        stage = st.currentWeekStage;
      } else {
        const hash = (st.uid.charCodeAt(0) + idx * 5 + weekConfig.weekNum * 3 + cIdx * 4) % 15;
        stage = Math.min(14, Math.max(0, hash));
      }
      return { stage, minutes: stage * 30 };
    });

    const cTotalMinutes = cCalculatedStudents.reduce((acc, s) => acc + s.minutes, 0);
    const cAvgMinutes = cCount > 0 ? Math.round(cTotalMinutes / cCount) : 0;
    const cAvgStage = Math.min(14, Math.max(0, Math.round(cAvgMinutes / 30)));
    const cSafeCount = cCalculatedStudents.filter((s) => s.stage <= 7).length;
    const cModerateCount = cCalculatedStudents.filter((s) => s.stage >= 8 && s.stage <= 10).length;
    const cWarningCount = cCalculatedStudents.filter((s) => s.stage >= 11 && s.stage <= 13).length;
    const cCriticalCount = cCalculatedStudents.filter((s) => s.stage >= 14).length;
    const cUrgentCount = cWarningCount + cCriticalCount;

    return {
      classId: cls.id,
      className: cls.name,
      teacherName: cls.teacherName || 'Sınıf Öğretmeni',
      studentCount: cCount,
      avgMinutes: cAvgMinutes,
      avgStage: cAvgStage,
      safePercent: Math.round((cSafeCount / cCount) * 100),
      moderatePercent: Math.round((cModerateCount / cCount) * 100),
      warningPercent: Math.round((cWarningCount / cCount) * 100),
      criticalPercent: Math.round((cCriticalCount / cCount) * 100),
      urgentCount: cUrgentCount,
      safeCount: cSafeCount,
    };
  });

  // Sıralama: En dengeli sınıf (en düşük ortalama ekran süresi) 1. sırada
  const sortedClassComparison = [...classComparisonStats].sort(
    (a, b) => a.avgMinutes - b.avgMinutes
  );

  // WhatsApp Mesajı Oluşturucu
  const generateWhatsAppMessage = (student: typeof studentStats[0]) => {
    const trendText =
      student.diff > 0
        ? `📈 Önceki haftaya göre +${student.diff} dk artış görüldü.`
        : student.diff < 0
        ? `📉 Önceki haftaya göre ${student.diff} dk azalma sağlandı (Tebrikler!).`
        : `↔️ Önceki haftayla aynı seviyede seyretmektedir.`;

    const recommendation =
      student.stage >= 11
        ? `⚠️ *Öneri:* Öğrencimizin ekran süresi uyarı/kritik seviyededir. Aile içi oyun, kitap okuma veya açık hava aktiviteleriyle sürenin dengelenmesi gelişimine büyük fayda sağlayacaktır.`
        : `🌱 *Tebrikler:* Ekran dengesini koruduğunuz ve takibini sağladığınız için teşekkür ederiz.`;

    return (
      `Sayın Velimiz (${student.parentName}),\n\n` +
      `*${institutionName}* haftalık ekran süresi takip sistemi bilgilendirmesidir:\n\n` +
      `👤 *Öğrenci:* ${student.studentName}\n` +
      `📅 *Dönem:* ${weekConfig.weekNum}. Hafta (${weekConfig.label})\n` +
      `⏱️ *Ekran Süresi:* ${student.minutes} dakika (${student.stage}. Kademe)\n` +
      `🏷️ *Durum:* ${student.category.name}\n` +
      `${trendText}\n\n` +
      `${recommendation}\n\n` +
      `İyi haftalar dileriz,\n*${institutionName}*`
    );
  };

  const handleOpenWhatsApp = (student: typeof studentStats[0]) => {
    const text = generateWhatsAppMessage(student);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyStudentWhatsApp = (student: typeof studentStats[0]) => {
    const text = generateWhatsAppMessage(student);
    navigator.clipboard.writeText(text);
    setCopiedStudentUid(student.uid);
    setTimeout(() => setCopiedStudentUid(null), 2000);
  };

  // Veli Bilgilendirme Notu Kopyalama (Genel Sınıf Özeti)
  const handleCopyParentNote = () => {
    const text =
      `📢 *${institutionName} - ${classNameTitle}*\n` +
      `*${weekConfig.weekNum}. Hafta Ekran Süresi Bilgilendirmesi*\n\n` +
      `Değerli Velilerimiz,\n` +
      `${weekConfig.label} tarihli ${weekConfig.weekNum}. haftada sınıfımızın ekran süresi analizi tamamlanmıştır.\n\n` +
      `📊 *Sınıf Özeti:*\n` +
      `• Sınıf Ortalaması: ${avgMinutes} dakika (${avgStage}. Kademe)\n` +
      `• 🟢 Yeşil Güvenli Alan (0-210 dk): %${safePercent} (${safeCount} öğrenci)\n` +
      `• 🔵 Mavi Dengeli Alan (240-300 dk): %${moderatePercent} (${moderateCount} öğrenci)\n` +
      `• 🟠 Turuncu Dikkat Alanı (330-390 dk): %${warningPercent} (${warningCount} öğrenci)\n` +
      `• 🔴 Kırmızı Kritik Alan (420+ dk): %${criticalPercent} (${criticalCount} öğrenci)\n\n` +
      `Çocuklarımızın ekran ve etkinlik dengesini koruyan tüm velilerimize teşekkür ederiz! 🌱`;

    navigator.clipboard.writeText(text);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  // Hafta rengi belirleyici
  const getStageColorToken = (stage: number) => {
    if (stage >= 14) {
      return {
        bg: 'bg-gradient-to-b from-rose-50/90 to-rose-100/50 hover:to-rose-100/70 border-rose-200 ring-1 ring-white/40 backdrop-blur-md',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500',
        label: 'Kırmızı',
      };
    }
    if (stage >= 11) {
      return {
        bg: 'bg-gradient-to-b from-amber-50/90 to-amber-100/50 hover:to-amber-100/70 border-amber-200 ring-1 ring-white/40 backdrop-blur-md',
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-500',
        label: 'Turuncu',
      };
    }
    if (stage >= 8) {
      return {
        bg: 'bg-gradient-to-b from-sky-50/90 to-sky-100/50 hover:to-sky-100/70 border-sky-200 ring-1 ring-white/40 backdrop-blur-md',
        badge: 'bg-sky-100 text-sky-800 border-sky-300',
        dot: 'bg-sky-500',
        label: 'Mavi',
      };
    }
    return {
      bg: 'bg-gradient-to-b from-emerald-50/90 to-emerald-100/50 hover:to-emerald-100/70 border-emerald-200 ring-1 ring-white/40 backdrop-blur-md',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500',
      label: 'Yeşil',
    };
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-sky-400 via-indigo-500 to-purple-600 rounded-3xl border border-white/40 ring-1 ring-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-5rem)] sm:max-h-[90vh] my-auto animate-in zoom-in-95 duration-150">
        {/* 1. Modal Başlık Çubuğu — Açık Cam (Glass) Çerçeve */}
        <div className="flex items-center justify-between gap-2 m-3 sm:m-4 mb-0 p-3.5 sm:p-4 rounded-2xl border border-white/70 bg-gradient-to-b from-white/85 via-white/60 to-white/45 backdrop-blur-2xl ring-1 ring-white/40 shadow-[0_8px_32px_rgba(49,29,120,0.25)] flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-md flex-shrink-0">
              {weekConfig.weekNum}.H
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate leading-tight">
                  {weekConfig.weekNum}. Hafta İstatistik & Analiz
                </h3>
                {isActiveWeek ? (
                  <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    Aktif Hafta
                  </span>
                ) : isHoliday ? (
                  <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <Palmtree className="w-3 h-3" />
                    Tatil
                  </span>
                ) : (
                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 border border-slate-300/60">
                    Kayıt
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                {institutionName} • {classNameTitle} • {weekConfig.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onOpenExportReport && (
              <button
                type="button"
                onClick={onOpenExportReport}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70 text-xs font-bold cursor-pointer transition-colors"
                title="Rapor Çıktısı Al (PDF / Excel)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Çıktı Al</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Görünüm Sekmeleri: Öğrenci Listesi & Sınıf Karşılaştırması — Açık Cam Çerçeve */}
        <div className="mx-3 sm:mx-4 mt-3 p-2.5 sm:p-3 rounded-2xl border border-white/70 bg-gradient-to-b from-white/85 via-white/60 to-white/45 backdrop-blur-2xl ring-1 ring-white/40 shadow-[0_8px_32px_rgba(49,29,120,0.25)] flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-gradient-to-b from-white/55 to-white/25 rounded-2xl border border-white/50 ring-1 ring-white/20">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'students'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Öğrenci Listesi ({totalStudents})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sınıf Karşılaştırması ({effectiveClassroomsList.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AKÇAKOCA İLKOKULU</span>
          </div>
        </div>

        {/* Tatil Bildirimi — Açık Cam Çerçeve */}
        {isHoliday && (
          <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-2xl border border-white/70 bg-gradient-to-b from-white/85 via-white/60 to-white/45 backdrop-blur-2xl ring-1 ring-white/40 shadow-[0_8px_32px_rgba(49,29,120,0.25)] text-purple-900 flex items-center gap-2.5 flex-shrink-0 text-xs">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
              <Palmtree className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-slate-900">
                {weekConfig.holidayName || 'Tatil Haftası'}
              </h4>
              <p className="text-purple-700/80 text-[11px]">
                Okullar tatilde olduğu için bu haftada sınıf ekran kısıtlaması uygulanmamaktadır.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'students' ? (
          <>
            {/* 2. Sınıf Dağılım Çubuğu & Özet Renkler — Açık Cam Çerçeve */}
            <div className="mx-3 sm:mx-4 mt-3 p-3 sm:p-3.5 rounded-2xl border border-white/70 bg-gradient-to-b from-white/85 via-white/60 to-white/45 backdrop-blur-2xl ring-1 ring-white/40 shadow-[0_8px_32px_rgba(49,29,120,0.25)] flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sınıf Ekran Süresi Dağılımı</span>
                </span>
                <span className="text-slate-500 font-bold">
                  Ortalama: <strong className="text-slate-900">{avgMinutes} dk</strong> ({avgStage}. Kademe)
                </span>
              </div>

              {/* Çok Renkli Progress Bar */}
              <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden flex shadow-inner">
                {safePercent > 0 && (
                  <div
                    style={{ width: `${safePercent}%` }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`Yeşil: %${safePercent}`}
                  />
                )}
                {moderatePercent > 0 && (
                  <div
                    style={{ width: `${moderatePercent}%` }}
                    className="bg-sky-500 transition-all duration-300"
                    title={`Mavi: %${moderatePercent}`}
                  />
                )}
                {warningPercent > 0 && (
                  <div
                    style={{ width: `${warningPercent}%` }}
                    className="bg-amber-500 transition-all duration-300"
                    title={`Turuncu: %${warningPercent}`}
                  />
                )}
                {criticalPercent > 0 && (
                  <div
                    style={{ width: `${criticalPercent}%` }}
                    className="bg-rose-500 transition-all duration-300"
                    title={`Kırmızı: %${criticalPercent}`}
                  />
                )}
              </div>

              {/* 4 Renk İstatistik Kartları — Açık Cam Çerçeveler */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <div className="bg-gradient-to-b from-white/85 to-white/45 backdrop-blur-md p-1.5 rounded-xl border border-emerald-200/70 ring-1 ring-white/30 text-center shadow-[0_4px_14px_rgba(49,29,120,0.12)]">
                  <div className="text-[9px] font-black text-emerald-700">Yeşil (Güvenli)</div>
                  <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    {safeCount} <span className="text-[9px] font-bold text-slate-400">(%{safePercent})</span>
                  </div>
                  <div className="text-[8px] font-bold text-slate-400 truncate">0 - 210 dk</div>
                </div>

                <div className="bg-gradient-to-b from-white/85 to-white/45 backdrop-blur-md p-1.5 rounded-xl border border-sky-200/70 ring-1 ring-white/30 text-center shadow-[0_4px_14px_rgba(49,29,120,0.12)]">
                  <div className="text-[9px] font-black text-sky-700">Mavi (Dengeli)</div>
                  <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    {moderateCount} <span className="text-[9px] font-bold text-slate-400">(%{moderatePercent})</span>
                  </div>
                  <div className="text-[8px] font-bold text-slate-400 truncate">240 - 300 dk</div>
                </div>

                <div className="bg-gradient-to-b from-white/85 to-white/45 backdrop-blur-md p-1.5 rounded-xl border border-amber-200/70 ring-1 ring-white/30 text-center shadow-[0_4px_14px_rgba(49,29,120,0.12)]">
                  <div className="text-[9px] font-black text-amber-700">Turuncu (Dikkat)</div>
                  <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    {warningCount} <span className="text-[9px] font-bold text-slate-400">(%{warningPercent})</span>
                  </div>
                  <div className="text-[8px] font-bold text-slate-400 truncate">330 - 390 dk</div>
                </div>

                <div className="bg-gradient-to-b from-white/85 to-white/45 backdrop-blur-md p-1.5 rounded-xl border border-rose-200/70 ring-1 ring-white/30 text-center shadow-[0_4px_14px_rgba(49,29,120,0.12)]">
                  <div className="text-[9px] font-black text-rose-700">Kırmızı (Kritik)</div>
                  <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    {criticalCount} <span className="text-[9px] font-bold text-slate-400">(%{criticalPercent})</span>
                  </div>
                  <div className="text-[8px] font-bold text-slate-400 truncate">420+ dk</div>
                </div>
              </div>
            </div>

            {/* 3. Arama, Hızlı Risk Filtresi & Veli Notu Kopyalama — Açık Cam Çerçeve */}
            <div className="mx-3 sm:mx-4 mt-3 p-2.5 sm:p-3 rounded-2xl border border-white/70 bg-gradient-to-b from-white/85 via-white/60 to-white/45 backdrop-blur-2xl ring-1 ring-white/40 shadow-[0_8px_32px_rgba(49,29,120,0.25)] flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Öğrenci veya veli adına göre ara..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-white/60 bg-white/60 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-400 font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCopyParentNote}
                  className="px-2.5 py-1.5 rounded-xl bg-white/50 hover:bg-white/80 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0 border border-white/60"
                  title="WhatsApp veli grubuna kopyalanacak genel özet metin"
                >
                  {copiedMsg ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Sınıf WhatsApp Özeti</span>
                      <span className="sm:hidden">Özet</span>
                    </>
                  )}
                </button>
              </div>

              {/* Filtre Düğmeleri (Riskli/Uyarı Filtresi Dahil) */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all whitespace-nowrap border ${
                    filterCategory === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white/50 text-slate-600 border-white/60 hover:bg-white/80'
                  }`}
                >
                  Tümü ({studentStats.length})
                </button>

                {/* HIZLI KRİTİK/UYARI FİLTRESİ */}
                <button
                  type="button"
                  onClick={() => setFilterCategory('urgent')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all whitespace-nowrap border flex items-center gap-1 ${
                    filterCategory === 'urgent'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 font-black'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  <span>Destek Gerekenler ({urgentCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterCategory('safe')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all whitespace-nowrap border ${
                    filterCategory === 'safe'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  🟢 Yeşil ({safeCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterCategory('moderate')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all whitespace-nowrap border ${
                    filterCategory === 'moderate'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                      : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  🔵 Mavi ({moderateCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterCategory('warning')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all whitespace-nowrap border ${
                    filterCategory === 'warning'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  🟠 Turuncu ({warningCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterCategory('critical')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all whitespace-nowrap border ${
                    filterCategory === 'critical'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  🔴 Kırmızı ({criticalCount})
                </button>
              </div>
            </div>

            {/* 4. Öğrenci Listesi (Trend Okları + WhatsApp Butonları + Hafta Renkleri) — Açık Cam Kartlar */}
            <div className="flex-1 overflow-y-auto mx-3 sm:mx-4 mt-3 mb-3 sm:mb-4 space-y-2.5">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2 rounded-2xl border border-white/70 bg-gradient-to-b from-white/85 via-white/60 to-white/45 backdrop-blur-2xl ring-1 ring-white/40 shadow-[0_8px_32px_rgba(49,29,120,0.25)]">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">
                    {searchQuery
                      ? 'Aramanıza uygun öğrenci kaydı bulunamadı.'
                      : 'Bu kriterde öğrenci bulunamadı.'}
                  </p>
                </div>
              ) : (
                filteredStudents.map((item, i) => {
                  const colorInfo = getStageColorToken(item.stage);

                  return (
                    <div
                      key={item.uid}
                      className={`rounded-2xl p-2.5 sm:p-3 border transition-all flex flex-col gap-2 shadow-md ${colorInfo.bg}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Sol: Sıra No ve Öğrenci/Veli Bilgisi */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-white/80 border border-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-2xs">
                            {i + 1}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {item.studentName}
                              </span>
                              {item.className && (
                                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md bg-white/80 text-indigo-700 border border-indigo-200 leading-none">
                                  {item.className}
                                </span>
                              )}
                              <span
                                className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md border leading-none ${colorInfo.badge}`}
                              >
                                {item.category.name}
                              </span>
                            </div>
                            <div className="text-[10.5px] font-bold text-slate-500 truncate mt-0.5">
                              Veli: <span className="text-slate-700">{item.parentName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Sağ: Süre, Kademe ve Trend Oku */}
                        <div className="text-right flex-shrink-0 flex items-center gap-2">
                          {/* 1. HAFTALIK TREND OKU GÖSTERGESİ */}
                          {weekConfig.weekNum > 1 && (
                            <div
                              className="flex items-center"
                              title={
                                item.diff > 0
                                  ? `Önceki haftaya göre +${item.diff} dk arttı`
                                  : item.diff < 0
                                  ? `Önceki haftaya göre ${item.diff} dk azaldı`
                                  : 'Önceki haftayla aynı seviyede'
                              }
                            >
                              {item.diff > 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black">
                                  <TrendingUp className="w-3 h-3 text-rose-600 stroke-[3]" />
                                  <span>+{item.diff} dk</span>
                                </span>
                              ) : item.diff < 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                                  <TrendingDown className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  <span>{item.diff} dk</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-bold">
                                  <Minus className="w-3 h-3 text-slate-400 stroke-[3]" />
                                  <span>Aynı</span>
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            className={`px-2.5 py-1 rounded-xl border font-black text-center shadow-2xs ${colorInfo.badge}`}
                          >
                            <div className="text-xs sm:text-sm leading-tight">{item.minutes} dk</div>
                            <div className="text-[8.5px] opacity-80">{item.stage}. Kademe</div>
                          </div>
                        </div>
                      </div>

                      {/* Alt Satır: WhatsApp İletişimi + Haftalık Renk Geçmişi */}
                      <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                        {/* 2. UYGULAMA İÇİ MESAJLAŞMA & WHATSAPP İLETİŞİM BUTONLARI */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Uygulama İçi Mesaj Butonu */}
                          <button
                            type="button"
                            onClick={() => {
                              setMessagingStudent(item);
                              setIsMessagingOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-black cursor-pointer shadow-xs active:scale-95 transition-all"
                            title="Veliye doğrudan uygulama içi mesaj gönder"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-white/20" />
                            <span>Uygulama İçi Mesaj</span>
                          </button>

                          {/* WhatsApp Butonu */}
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black cursor-pointer shadow-xs active:scale-95 transition-all"
                            title="Veliye WhatsApp üzerinden hazır bilgilendirme mesajı gönder"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white/20" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyStudentWhatsApp(item)}
                            className="p-1 rounded-xl bg-white/70 hover:bg-white text-slate-600 border border-slate-200 text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                            title="Mesaj metnini kopyala"
                          >
                            {copiedStudentUid === item.uid ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </button>
                        </div>

                        {/* Haftalık Renk Geçmişi */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] font-bold text-slate-500 hidden sm:inline">
                            Haftalık Durum:
                          </span>
                          {item.historyWeeks.map((hw) => {
                            const hColor = getStageColorToken(hw.stage);
                            return (
                              <span
                                key={hw.weekNum}
                                className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black border flex items-center gap-0.5 ${
                                  hw.isCurrentWeek ? 'ring-1.5 ring-slate-900 shadow-2xs' : ''
                                } ${hColor.badge}`}
                                title={`${hw.weekNum}. Hafta: ${hw.minutes} dk (${hColor.label})`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${hColor.dot}`} />
                                <span>{hw.weekNum}.H</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* 4. SINIFLAR ARASI KARŞILAŞTIRMA GRAFİĞİ (Class Comparison Chart) */
          <div className="flex-1 overflow-y-auto mx-3 sm:mx-4 mt-3 mb-3 sm:mb-4 space-y-3">
            <div className="p-3 rounded-2xl border border-white/70 bg-gradient-to-b from-white/85 via-white/60 to-white/45 backdrop-blur-2xl ring-1 ring-white/40 shadow-[0_8px_32px_rgba(49,29,120,0.25)] flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h4 className="font-black text-slate-900">
                  {institutionName} — {weekConfig.weekNum}. Hafta Sınıf Karşılaştırması
                </h4>
                <p className="text-slate-500 text-[11.5px] mt-0.5">
                  Tüm sınıfların haftalık ortalama ekran süreleri ve renk dağılımları listelenmiştir. Düşük ekran süresine sahip sınıflar öncelikli olarak ödüllendirilir.
                </p>
              </div>
            </div>

            {/* Sınıf Kartları ve Karşılaştırmalı Grafikler */}
            <div className="space-y-3">
              {sortedClassComparison.map((cls, idx) => {
                const isBest = idx === 0;
                const maxBenchmark = 420; // benchmark 420 min
                const barWidth = Math.min(100, Math.max(8, Math.round((cls.avgMinutes / maxBenchmark) * 100)));

                return (
                  <div
                    key={cls.classId}
                    className={`p-3.5 rounded-2xl border backdrop-blur-xl transition-all shadow-md ${
                      isBest
                        ? 'bg-gradient-to-b from-emerald-50/95 to-emerald-100/60 border-emerald-300 ring-1 ring-emerald-300'
                        : 'bg-gradient-to-b from-white/85 to-white/45 border-white/60 ring-1 ring-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-800'
                              : 'bg-amber-700/30 text-amber-900'
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-sm font-black text-slate-900">{cls.className}</h5>
                            {isBest && (
                              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-300 flex items-center gap-0.5">
                                <Award className="w-3 h-3 text-emerald-700" />
                                🏆 En İdeal Ekran Dengesi
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-500">
                            Öğretmen: <span className="text-slate-700">{cls.teacherName}</span> • {cls.studentCount} Öğrenci
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm sm:text-base font-black text-slate-900">
                          {cls.avgMinutes} dk <span className="text-xs font-bold text-slate-500">ort.</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                          {cls.avgStage}. Kademe Ortalaması
                        </div>
                      </div>
                    </div>

                    {/* Karşılaştırma Çubuğu (Görsel Bar) */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>Ortalama Süre Seviyesi</span>
                        <span>{cls.avgMinutes} / 420 dk</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden flex border border-slate-200">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            cls.avgMinutes <= 210
                              ? 'bg-emerald-500'
                              : cls.avgMinutes <= 300
                              ? 'bg-sky-500'
                              : cls.avgMinutes <= 390
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Sınıf İçi 4 Renk Dağılım Dağıtıcısı */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-bold text-slate-600 flex-wrap gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Yeşil: %{cls.safePercent}
                        </span>
                        <span className="flex items-center gap-1 text-sky-700">
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                          Mavi: %{cls.moderatePercent}
                        </span>
                        <span className="flex items-center gap-1 text-amber-700">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Turuncu: %{cls.warningPercent}
                        </span>
                        <span className="flex items-center gap-1 text-rose-700">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Kırmızı: %{cls.criticalPercent}
                        </span>
                      </div>

                      {cls.urgentCount > 0 && (
                        <span className="text-[9.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                          ⚠️ {cls.urgentCount} Destek Gereken Öğrenci
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Modal Alt Kapatma & Aksiyon Çubuğu — Açık Cam Çerçeve */}
        <div className="flex-shrink-0 mx-3 sm:mx-4 mb-3 sm:mb-4 p-3 sm:p-4 rounded-2xl border border-white/70 bg-gradient-to-b from-white/85 via-white/60 to-white/45 backdrop-blur-2xl ring-1 ring-white/40 shadow-[0_8px_32px_rgba(49,29,120,0.25)] flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>
              {activeTab === 'students' ? (
                <>
                  Toplam <strong>{filteredStudents.length}</strong> öğrenci listelendi
                </>
              ) : (
                <>
                  Toplam <strong>{sortedClassComparison.length}</strong> sınıf kıyaslandı
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenExportReport && (
              <button
                type="button"
                onClick={onOpenExportReport}
                className="sm:hidden btn-3d-indigo px-3 py-2 rounded-2xl text-xs font-black cursor-pointer shadow-md active:scale-95 flex items-center gap-1"
                title="Rapor İndir"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Rapor</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-3d-cyan px-6 py-2.5 rounded-2xl text-xs font-black cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Kapat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Uygulama İçi Mesajlaşma Modalı */}
      {isMessagingOpen && messagingStudent && (
        <SendMessageModal
          isOpen={isMessagingOpen}
          onClose={() => {
            setIsMessagingOpen(false);
            setMessagingStudent(null);
          }}
          senderProfile={currentUserProfile}
          targetStudent={{
            uid: messagingStudent.uid,
            studentName: messagingStudent.studentName,
            parentName: messagingStudent.parentName,
            className: messagingStudent.className,
            classId: messagingStudent.classId,
          } as any}
          defaultTitle={`${weekConfig.weekNum}. Hafta Ekran Süresi Bilgilendirmesi`}
          defaultContent={generateWhatsAppMessage(messagingStudent)}
          defaultWeekNum={weekConfig.weekNum}
          classrooms={classrooms}
          students={allStudents}
        />
      )}
    </div>
  );
};