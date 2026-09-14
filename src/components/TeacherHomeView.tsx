import React, { useState } from 'react';
import { UserProfile, ClassroomInfo, AcademicCalendarConfig } from '../types';
import { formatMinutes, formatTimeAgo } from '../lib/weekUtils';
import { getStageCategory } from '../lib/stagesData';
import {
  Users,
  Search,
  BarChart3,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Trash2,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import { seed25ClassroomStudents } from '../lib/demoData';
import { AcademicCalendarModal } from './AcademicCalendarModal';
import { TransparentMascotVideo } from './TransparentMascotVideo';
import badgeRed from '../buttons/badge_red.png';
import badgeBlue from '../buttons/badge_blue.png';
import badgeOrange from '../buttons/badge_orange.png';
import badgeGreen from '../buttons/badge_green.png';
import {
  subscribeAcademicCalendar,
  generateDefaultAcademicCalendar,
} from '../lib/academicCalendar';

interface TeacherHomeViewProps {
  users: UserProfile[];
  currentUserId: string;
  classroom: ClassroomInfo | null;
  teacherProfile: UserProfile | null;
  onOpenClassSetup?: () => void;
  userEmail?: string;
  onDeleteUser?: (userUid: string) => Promise<void> | void;
}

export const TeacherHomeView: React.FC<TeacherHomeViewProps> = ({
  users,
  currentUserId,
  classroom,
  teacherProfile,
  onOpenClassSetup,
  userEmail,
  onDeleteUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'critical' | 'warning' | 'moderate' | 'safe'>('all');
  const [sortBy, setSortBy] = useState<'minutes-desc' | 'minutes-asc' | 'name' | 'updated-desc'>('minutes-desc');
  const [isSeeding, setIsSeeding] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarConfig, setCalendarConfig] = useState<AcademicCalendarConfig>(
    generateDefaultAcademicCalendar()
  );

  // Student deletion state
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteUser?.(studentToDelete.uid);
      setStudentToDelete(null);
    } catch (err) {
      console.error('Error deleting student:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  React.useEffect(() => {
    const unsub = subscribeAcademicCalendar((config) => {
      setCalendarConfig(config);
    });
    return () => unsub();
  }, []);

  const classCode = classroom?.code || teacherProfile?.classCode || 'SINIF4A';
  const className = classroom?.name || teacherProfile?.className || '4-A Sınıfı';
  const targetCount = classroom?.studentTargetCount || 25;

  // Filter out teacher themself
  const studentList = users.filter((u) => {
    if (u.role === 'admin' || (u.userType === 'teacher' && u.uid === currentUserId)) {
      return false;
    }
    if (classroom?.id && u.classId) {
      return u.classId === classroom.id;
    }
    return true;
  });

  // Calculate statistics
  const totalStudents = studentList.length;
  const criticalStudents = studentList.filter((u) => (u.currentWeekStage || 0) >= 14);
  const warningStudents = studentList.filter((u) => {
    const s = u.currentWeekStage || 0;
    return s >= 11 && s <= 13;
  });
  const moderateStudents = studentList.filter((u) => {
    const s = u.currentWeekStage || 0;
    return s >= 8 && s <= 10;
  });
  const safeStudents = studentList.filter((u) => {
    const s = u.currentWeekStage || 0;
    return s <= 7;
  });

  const totalMinutes = studentList.reduce(
    (acc, u) => acc + (u.currentWeekMinutes ?? (u.currentWeekStage || 0) * 30),
    0
  );
  const avgMinutes = totalStudents > 0 ? Math.round(totalMinutes / totalStudents) : 0;
  const avgStage = Math.min(14, Math.max(0, Math.round(avgMinutes / 30)));
  const avgFormatted = formatMinutes(avgMinutes);

  const hasCritical = criticalStudents.length > 0;
  const currentMascot = hasCritical ? '/kirmizi.png' : '/yesil.png';

  const handleCopyCode = () => {
    if (!classCode) return;
    navigator.clipboard.writeText(classCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSeedDemoStudents = async () => {
    try {
      setIsSeeding(true);
      const targetClassId = classroom?.id || teacherProfile?.classId || 'default_class_id';
      await seed25ClassroomStudents(targetClassId, classCode, className);
    } catch (err) {
      console.error('Failed to seed demo students:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Filtering & Sorting
  const filteredStudents = studentList.filter((user) => {
    const nameMatch =
      (user.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.parentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!nameMatch) return false;

    const stage = user.currentWeekStage || 0;
    if (filterCategory === 'critical') return stage >= 14;
    if (filterCategory === 'warning') return stage >= 11 && stage <= 13;
    if (filterCategory === 'moderate') return stage >= 8 && stage <= 10;
    if (filterCategory === 'safe') return stage <= 7;
    return true;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const stageA = a.currentWeekStage || 0;
    const stageB = b.currentWeekStage || 0;
    const minutesA = a.currentWeekMinutes ?? stageA * 30;
    const minutesB = b.currentWeekMinutes ?? stageB * 30;

    if (sortBy === 'minutes-desc') return minutesB - minutesA;
    if (sortBy === 'minutes-asc') return minutesA - minutesB;
    if (sortBy === 'name') {
      const nameA = a.studentName || a.displayName || '';
      const nameB = b.studentName || b.displayName || '';
      return nameA.localeCompare(nameB, 'tr');
    }
    if (sortBy === 'updated-desc') {
      const timeA = a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0;
      const timeB = b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0;
      return timeB - timeA;
    }
    return 0;
  });

  const instCode = classroom?.institutionCode || teacherProfile?.institutionCode;
  const instName = classroom?.institutionName || teacherProfile?.institutionName;

  return (
    <div className="relative flex-1 flex flex-col gap-3 pb-8 select-none">
      {/* Pastel Arka Plan Katmanı (Bulanık Renk Lekeleri) */}
      <div className="absolute -inset-3 -z-10 overflow-hidden rounded-[32px] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-pink-50 to-orange-50" />
        <div className="absolute -top-16 -left-10 w-56 h-56 bg-violet-300/35 rounded-full blur-3xl" />
        <div className="absolute top-4 right-0 w-48 h-48 bg-pink-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-52 h-52 bg-sky-300/25 rounded-full blur-3xl" />
      </div>

      {/* Bağlı Kurum Bilgisi (Varsa zarif ince çubuk) */}
      {instCode && (
        <div className="relative z-10 flex items-center justify-between px-3.5 py-1.5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-2xs text-xs text-slate-700">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-extrabold text-slate-900 truncate">
              {instName || 'Bağlı Kurum'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-slate-500 font-medium">Kurum Kodu:</span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-mono font-black text-[11px] border border-rose-200">
              {instCode}
            </span>
          </div>
        </div>
      )}

      {/* 1. ÖĞRETMEN ANASAYFA KAHRAMAN KARTI (Buzlu Cam / Pastel) */}
      {(() => {
        // Durum bazlı vurgu rengi (arka plan artık pastel, sadece aksan/degrade değişiyor)
        let accent: 'teal' | 'amber' | 'orange' | 'rose' = 'teal';
        if (hasCritical) accent = 'rose';
        else if (avgStage >= 11) accent = 'orange';
        else if (avgStage >= 8) accent = 'amber';

        const progressPercent = Math.min(100, Math.round((avgStage / 14) * 100));

        const progressFillClass =
          accent === 'rose'
            ? 'bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500'
            : accent === 'orange'
            ? 'bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400'
            : accent === 'amber'
            ? 'bg-gradient-to-r from-emerald-200 via-lime-300 to-yellow-300'
            : 'bg-gradient-to-r from-teal-200 via-emerald-300 to-green-200';

        return (
          <div className="relative z-10 rounded-3xl p-4 sm:p-5 bg-white/75 backdrop-blur-xl border border-white/95 shadow-[0_2px_6px_rgba(0,0,0,0.16),0_8px_18px_rgba(0,0,0,0.10),0_20px_38px_rgba(124,58,237,0.18)] overflow-hidden flex items-stretch justify-between gap-3 sm:gap-4">
            {/* Sol İçerik */}
            <div className="relative z-10 flex-1 min-w-0 pr-1 flex flex-col justify-center gap-2.5">
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* 1. Buton (Sol): ist.png - Üzerinde Yalnızca İstatistik Bilgileri (Ekstra İkon Yok) */}
                <div className="relative rounded-2xl overflow-hidden flex items-end justify-center select-none transition-transform duration-150 active:scale-95 cursor-pointer">
                  <img
                    src="/ist.png"
                    alt="İstatistik"
                    className="w-full h-auto object-contain block drop-shadow-sm"
                    draggable={false}
                  />
                  <div className="absolute inset-x-0 bottom-1 sm:bottom-1.5 md:bottom-2 z-10 flex flex-col items-center justify-center text-center px-1">
                    <span className="text-[8px] sm:text-[9.5px] md:text-[10px] font-black tracking-wide uppercase text-white leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                      Haftalık Ortalama
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white tracking-tight leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                      {avgMinutes} dk
                    </span>
                  </div>
                </div>

                {/* 2. Buton (Sağ): saf.png - Üzerinde Yalnızca Sınıf Durumu Bilgileri (Ekstra İkon Yok) */}
                <div className="relative rounded-2xl overflow-hidden flex items-end justify-center select-none transition-transform duration-150 active:scale-95 cursor-pointer">
                  <img
                    src="/saf.png"
                    alt="Sınıf Durumu"
                    className="w-full h-auto object-contain block drop-shadow-sm"
                    draggable={false}
                  />
                  <div className="absolute inset-x-0 bottom-1 sm:bottom-1.5 md:bottom-2 z-10 flex flex-col items-center justify-center text-center px-1">
                    <span className="text-[8px] sm:text-[9.5px] md:text-[10px] font-black tracking-wide uppercase text-white leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                      {hasCritical ? 'Kritik Süre' : 'Sınıf Güvende'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white tracking-tight leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                      {avgStage}. Kademe
                    </span>
                  </div>
                </div>
              </div>

              {/* 14-Kademe Spektrum İlerleme Çubuğu */}
              <div className="space-y-1">
                <div className="w-full h-2.5 sm:h-3 bg-slate-200/60 rounded-full p-0.5 border border-white shadow-inner overflow-hidden">
                  <div
                    className={`relative h-full rounded-full transition-all duration-500 overflow-hidden ${progressFillClass}`}
                    style={{ width: `${Math.max(6, progressPercent)}%` }}
                  >
                    {/* Glossy top highlight, matching the pill button sheen */}
                    <div
                      className="absolute inset-x-0 top-0 h-1/2 rounded-full pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(to bottom, rgba(255,255,255,0.65), rgba(255,255,255,0))',
                      }}
                    />
                    {/* Soft bottom shadow for depth */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-1/3 rounded-full pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.12), rgba(0,0,0,0))',
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black text-slate-400">
                  <span>0 dk</span>
                  <span>{avgStage}/14 Kademe Ortalaması</span>
                  <span>420+ dk</span>
                </div>
              </div>
            </div>

            {/* Sağ Taraf: Kedi Maskotu (Şeffaf Arka Planlı Video) */}
            <div className="relative z-10 flex-shrink-0 self-stretch flex items-end justify-center w-[110px] sm:w-[140px] md:w-[165px] -my-4 sm:-my-5 -mr-2 sm:-mr-3 overflow-hidden pointer-events-none select-none">
              <TransparentMascotVideo
                src="/mascot.mp4"
                className="h-full w-auto max-h-[160px] sm:max-h-[195px] md:max-h-[220px] drop-shadow-[0_10px_20px_rgba(124,58,237,0.18)] transition-all duration-300"
              />
            </div>
          </div>
        );
      })()}

      {/* 2. RENK BÖLGELERİNE GÖRE DAĞILIM (Pastel İkonlu İstatistik Kutuları) */}
      <div className="relative z-10 bg-white/75 backdrop-blur-xl rounded-3xl border border-white/95 p-2.5 sm:p-3 shadow-[0_2px_6px_rgba(0,0,0,0.14),0_8px_18px_rgba(0,0,0,0.09),0_20px_38px_rgba(124,58,237,0.16)] space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-violet-500" />
            <span>Renk Bölgelerine Göre Dağılım</span>
          </span>
          {filterCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className="text-[10px] font-bold text-violet-600 hover:underline cursor-pointer"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>

        {/* 4 Yeni 3D Rozet Buton (Yeşil, Mavi, Turuncu, Kırmızı) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {/* Yeşil Buton */}
          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'safe' ? 'all' : 'safe')}
            className={`relative aspect-[456/513] w-full rounded-2xl select-none transition-all duration-200 cursor-pointer active:scale-95 ${
              filterCategory === 'safe'
                ? 'scale-[1.05] drop-shadow-[0_8px_20px_rgba(16,185,129,0.5)] ring-3 ring-emerald-400 z-10'
                : filterCategory !== 'all'
                ? 'opacity-60 hover:opacity-100 hover:scale-[1.02] drop-shadow-md'
                : 'hover:scale-[1.03] drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
            }`}
          >
            <img
              src={badgeGreen}
              alt="Yeşil Bölge"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            <div className="relative z-10 h-full w-full flex flex-col justify-end items-center pb-2.5 sm:pb-3.5 md:pb-4 px-1">
              <div className="text-xl sm:text-2xl md:text-3xl font-black leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {safeStudents.length}
              </div>
              <div className="text-[9px] sm:text-[10px] md:text-xs font-black tracking-wide text-white uppercase mt-0.5 sm:mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                Yeşil
              </div>
              <div className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-white/95 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                0-210 dk
              </div>
            </div>
          </button>

          {/* Mavi Buton */}
          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'moderate' ? 'all' : 'moderate')}
            className={`relative aspect-[456/513] w-full rounded-2xl select-none transition-all duration-200 cursor-pointer active:scale-95 ${
              filterCategory === 'moderate'
                ? 'scale-[1.05] drop-shadow-[0_8px_20px_rgba(59,130,246,0.5)] ring-3 ring-sky-400 z-10'
                : filterCategory !== 'all'
                ? 'opacity-60 hover:opacity-100 hover:scale-[1.02] drop-shadow-md'
                : 'hover:scale-[1.03] drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
            }`}
          >
            <img
              src={badgeBlue}
              alt="Mavi Bölge"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            <div className="relative z-10 h-full w-full flex flex-col justify-end items-center pb-2.5 sm:pb-3.5 md:pb-4 px-1">
              <div className="text-xl sm:text-2xl md:text-3xl font-black leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {moderateStudents.length}
              </div>
              <div className="text-[9px] sm:text-[10px] md:text-xs font-black tracking-wide text-white uppercase mt-0.5 sm:mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                Mavi
              </div>
              <div className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-white/95 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                240-300 dk
              </div>
            </div>
          </button>

          {/* Turuncu Buton */}
          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'warning' ? 'all' : 'warning')}
            className={`relative aspect-[456/513] w-full rounded-2xl select-none transition-all duration-200 cursor-pointer active:scale-95 ${
              filterCategory === 'warning'
                ? 'scale-[1.05] drop-shadow-[0_8px_20px_rgba(249,115,22,0.5)] ring-3 ring-orange-400 z-10'
                : filterCategory !== 'all'
                ? 'opacity-60 hover:opacity-100 hover:scale-[1.02] drop-shadow-md'
                : 'hover:scale-[1.03] drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
            }`}
          >
            <img
              src={badgeOrange}
              alt="Turuncu Bölge"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            <div className="relative z-10 h-full w-full flex flex-col justify-end items-center pb-2.5 sm:pb-3.5 md:pb-4 px-1">
              <div className="text-xl sm:text-2xl md:text-3xl font-black leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {warningStudents.length}
              </div>
              <div className="text-[9px] sm:text-[10px] md:text-xs font-black tracking-wide text-white uppercase mt-0.5 sm:mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                Turuncu
              </div>
              <div className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-white/95 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                330-390 dk
              </div>
            </div>
          </button>

          {/* Kırmızı Buton */}
          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'critical' ? 'all' : 'critical')}
            className={`relative aspect-[456/513] w-full rounded-2xl select-none transition-all duration-200 cursor-pointer active:scale-95 ${
              filterCategory === 'critical'
                ? 'scale-[1.05] drop-shadow-[0_8px_20px_rgba(244,63,94,0.5)] ring-3 ring-rose-400 z-10'
                : filterCategory !== 'all'
                ? 'opacity-60 hover:opacity-100 hover:scale-[1.02] drop-shadow-md'
                : 'hover:scale-[1.03] drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
            }`}
          >
            <img
              src={badgeRed}
              alt="Kırmızı Bölge"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            <div className="relative z-10 h-full w-full flex flex-col justify-end items-center pb-2.5 sm:pb-3.5 md:pb-4 px-1">
              <div className="text-xl sm:text-2xl md:text-3xl font-black leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {criticalStudents.length}
              </div>
              <div className="text-[9px] sm:text-[10px] md:text-xs font-black tracking-wide text-white uppercase mt-0.5 sm:mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                Kırmızı
              </div>
              <div className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-white/95 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                420+ dk
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 3. ÖĞRENCİ BİLGİLERİ (Buzlu Cam Kart) */}
      <div className="relative z-10 bg-white/75 backdrop-blur-xl rounded-3xl border border-white/95 p-3.5 sm:p-4 shadow-[0_2px_6px_rgba(0,0,0,0.14),0_8px_18px_rgba(0,0,0,0.09),0_20px_38px_rgba(124,58,237,0.16)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-violet-500" />
            <span>Öğrenci Bilgileri ({sortedStudents.length} / {totalStudents})</span>
          </h3>
        </div>

        {/* Arama ve Filtre Çubuğu */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Öğrenci veya veli adına göre ara..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-white bg-white/70 backdrop-blur-md text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-400 focus:bg-white font-medium"
            />
          </div>

          {/* Kategori Filtre Butonları (Pastel Piller) */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-black cursor-pointer transition-all active:scale-95 border ${
                filterCategory === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white/70 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Tümü ({studentList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('critical')}
              className={`px-2.5 py-1 rounded-full text-xs font-black cursor-pointer transition-all active:scale-95 border ${
                filterCategory === 'critical'
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-rose-50/80 border-rose-100 text-rose-600 hover:bg-rose-100'
              }`}
            >
              Kırmızı ({criticalStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('warning')}
              className={`px-2.5 py-1 rounded-full text-xs font-black cursor-pointer transition-all active:scale-95 border ${
                filterCategory === 'warning'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-orange-50/80 border-orange-100 text-orange-600 hover:bg-orange-100'
              }`}
            >
              Turuncu ({warningStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('safe')}
              className={`px-2.5 py-1 rounded-full text-xs font-black cursor-pointer transition-all active:scale-95 border ${
                filterCategory === 'safe'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-emerald-50/80 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
              }`}
            >
              Yeşil ({safeStudents.length})
            </button>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold rounded-full border border-slate-200 bg-white/70 backdrop-blur-md text-slate-700 cursor-pointer focus:outline-hidden"
            >
              <option value="minutes-desc">Süre (Çoktan Aza)</option>
              <option value="minutes-asc">Süre (Azdan Çoka)</option>
              <option value="name">Ada Göre (A-Z)</option>
              <option value="updated-desc">Son Güncelleme</option>
            </select>
          </div>
        </div>

        {/* Öğrenci Kartları Listesi */}
        <div className="space-y-2 pt-1">
          {sortedStudents.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-white/60 backdrop-blur-md border border-white space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                {searchQuery ? 'Aramanıza uygun öğrenci bulunamadı' : 'Sınıfta henüz kayıtlı öğrenci yok'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleSeedDemoStudents}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black text-cyan-700 bg-cyan-50 border border-cyan-100 cursor-pointer hover:bg-cyan-100"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Örnek 25 Öğrenci Yükle</span>
                </button>
              )}
            </div>
          ) : (
            sortedStudents.map((user, index) => {
              const stage = user.currentWeekStage || 0;
              const minutes = user.currentWeekMinutes ?? stage * 30;
              const timeInfo = formatMinutes(minutes);
              const category = getStageCategory(stage);
              const sName = user.studentName || user.displayName || `Öğrenci #${index + 1}`;
              const pName = user.parentName || (user.displayName !== sName ? user.displayName : 'Veli');

              const isRed = stage >= 14;
              const isOrange = stage >= 11 && stage <= 13;
              const isYellow = stage >= 8 && stage <= 10;
              const mascotSrc = category.mascotImg;

              let badgeColorClass = 'bg-emerald-500 text-white';
              let cardTint = 'border-emerald-100';
              if (isRed) {
                badgeColorClass = 'bg-rose-500 text-white';
                cardTint = 'border-rose-300';
              } else if (isOrange) {
                badgeColorClass = 'bg-orange-500 text-white';
                cardTint = 'border-orange-200';
              } else if (isYellow) {
                badgeColorClass = 'bg-amber-500 text-slate-950';
                cardTint = 'border-amber-200';
              }

              return (
                <div
                  key={user.uid}
                  id={`teacher-student-card-${user.uid}`}
                  className={`relative bg-white/70 backdrop-blur-md rounded-2xl border p-2.5 sm:p-3 transition-all hover:bg-white/90 flex items-center justify-between gap-2.5 ${cardTint}`}
                >
                  {/* Sol: Maskot ve İsim Bilgileri */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-white border border-white flex-shrink-0 flex items-center justify-center shadow-sm">
                      <img
                        src={mascotSrc}
                        alt="Öğrenci Maskotu"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                          {sName}
                        </h4>
                        <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md leading-none ${badgeColorClass}`}>
                          {category.name}
                        </span>
                      </div>

                      <div className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                        Veli: <span className="text-slate-700">{pName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sağ: Süre, Kademe ve Silme Butonu */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        {minutes} dk
                      </div>
                      <div className="text-[9.5px] font-bold text-slate-500">
                        {timeInfo.longStr} • {stage}. Kademe
                      </div>
                    </div>

                    {onDeleteUser && (
                      <button
                        type="button"
                        id={`btn-teacher-delete-student-${user.uid}`}
                        onClick={() => setStudentToDelete(user)}
                        title="Öğrenciyi Sınıftan Sil"
                        className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Akademik Takvim Düzenleme Modalı */}
      <AcademicCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        calendarConfig={calendarConfig}
        userEmail={userEmail}
      />

      {/* ÖĞRENCİ HESABI SİLME ONAY MODALI */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <UserX className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900">
                Öğrenciyi Sınıftan Sil?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bu öğrenciyi ve veli bağlantısını sınıftan silmek üzeresiniz.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Öğrenci: {studentToDelete.studentName || studentToDelete.displayName || 'Öğrenci'}</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                Veli: {studentToDelete.parentName || studentToDelete.displayName || 'Veli'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeleting}
                className="btn-3d-white py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Siliniyor...' : 'Evet, Sil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
