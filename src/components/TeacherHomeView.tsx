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
  Building2,
  Trash2,
  AlertTriangle,
  UserX,
  Pencil,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { seed25ClassroomStudents } from '../lib/demoData';
import { AcademicCalendarModal } from './AcademicCalendarModal';
import { StatsExportModal } from './StatsExportModal';
import { TransparentMascotVideo } from './TransparentMascotVideo';
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
  onUpdateUser?: (userUid: string, updates: Partial<UserProfile>) => Promise<void> | void;
  onSwitchRole?: (role: 'admin' | 'teacher') => void;
  onUpgradeToAdminWithCode?: (code: string) => Promise<void>;
}

export const TeacherHomeView: React.FC<TeacherHomeViewProps> = ({
  users,
  currentUserId,
  classroom,
  teacherProfile,
  onOpenClassSetup,
  userEmail,
  onDeleteUser,
  onUpdateUser,
  onSwitchRole,
  onUpgradeToAdminWithCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'critical' | 'warning' | 'moderate' | 'safe'>('all');
  const [sortBy, setSortBy] = useState<'minutes-desc' | 'minutes-asc' | 'name' | 'updated-desc'>('minutes-desc');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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

  // Student editing state
  const [studentToEdit, setStudentToEdit] = useState<UserProfile | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEditStudent = (user: UserProfile) => {
    setStudentToEdit(user);
    setEditStudentName(user.studentName || user.displayName || '');
    setEditParentName(user.parentName || '');
    setEditError(null);
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    const cleanStudentName = editStudentName.trim();
    const cleanParentName = editParentName.trim();
    if (!cleanStudentName) {
      setEditError('Lütfen öğrencinin adını ve soyadını giriniz.');
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);
      await onUpdateUser?.(studentToEdit.uid, {
        studentName: cleanStudentName,
        parentName: cleanParentName || undefined,
        displayName: cleanStudentName,
      });
      setStudentToEdit(null);
    } catch (err: any) {
      console.error('Error updating student:', err);
      setEditError(err.message || 'Öğrenci bilgileri güncellenirken bir hata oluştu.');
    } finally {
      setIsSavingEdit(false);
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
  const currentMascot = hasCritical ? '/k.png' : '/yesil.png';

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
      {/* Bağlı Kurum Bilgisi (Zarif Cam Çubuk) */}
      {instCode && (
        <div
          className="relative z-10 flex items-center justify-between px-3.5 py-1.5 rounded-2xl border text-xs text-slate-700 shadow-2xs overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.5) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.45) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.75)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06), 0 0 14px rgba(168,85,247,0.15), 0 0 14px rgba(45,212,191,0.14), inset 0 1px 1px rgba(255, 255, 255, 0.7)',
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-extrabold text-slate-900 truncate">
              {instName || 'Bağlı Kurum'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-slate-500 font-medium">Kurum Kodu:</span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-50/80 text-rose-700 font-mono font-black text-[11px] border border-rose-200">
              {instCode}
            </span>
          </div>
        </div>
      )}

      {/* 1. ÖĞRETMEN ANASAYFA KAHRAMAN KARTI (Veli Sayfası Gibi Buzlu Cam / Glassmorphism) */}
      {(() => {
        // Durum bazlı vurgu rengi
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
          <div
            className="relative z-10 rounded-3xl px-3.5 pt-3 pb-3 sm:px-4.5 sm:pt-3.5 sm:pb-3.5 overflow-hidden flex items-stretch justify-between gap-2.5 sm:gap-3.5"
            style={{
              backgroundImage: 'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.50) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.75)',
              boxShadow:
                '0 8px 32px rgba(31, 38, 135, 0.15), 0 0 16px rgba(168, 85, 247, 0.18), 0 0 16px rgba(45, 212, 191, 0.16), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
            }}
          >
            {/* Üstteki hafif cam parlama efekti */}
            <div
              className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none rounded-t-3xl"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.35), transparent)',
              }}
            />

            {/* Sol İçerik: İstatistikler ve İlerleme Çubuğu */}
            <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center gap-1.5 sm:gap-2">
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* 1. Buton (Sol): ist.png - Cam Efektli Çerçeve */}
                <div
                  className="relative rounded-2xl p-1 sm:p-1.5 overflow-hidden flex flex-col items-center justify-center select-none transition-all duration-150 active:scale-95 cursor-pointer backdrop-blur-md"
                  style={{
                    background: 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.55)',
                    boxShadow:
                      '0 6px 20px rgba(0, 0, 0, 0.08), inset 0 1px 1.5px rgba(255, 255, 255, 0.7), inset 0 -1px 1px rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {/* Üst cam ışıma efekti */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none rounded-t-2xl z-20"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.40), transparent)',
                    }}
                  />

                  <div className="relative z-10 w-full rounded-xl overflow-hidden flex items-end justify-center">
                    <img
                      src="/ist.png"
                      alt="Haftalık Ortalama"
                      className="w-full h-auto object-contain block drop-shadow-sm"
                      draggable={false}
                    />
                    <div className="absolute inset-x-0 bottom-1 sm:bottom-1.5 z-10 flex flex-col items-center justify-center text-center px-1">
                      <span className="text-[8.5px] sm:text-[10px] font-black tracking-wide uppercase text-white leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                        Haftalık Ortalama
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white tracking-tight leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                        {avgMinutes} dk
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Buton (Sağ): saf.png - Cam Efektli Çerçeve */}
                <div
                  className="relative rounded-2xl p-1 sm:p-1.5 overflow-hidden flex flex-col items-center justify-center select-none transition-all duration-150 active:scale-95 cursor-pointer backdrop-blur-md"
                  style={{
                    background: 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.55)',
                    boxShadow:
                      '0 6px 20px rgba(0, 0, 0, 0.08), inset 0 1px 1.5px rgba(255, 255, 255, 0.7), inset 0 -1px 1px rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {/* Üst cam ışıma efekti */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none rounded-t-2xl z-20"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.40), transparent)',
                    }}
                  />

                  <div className="relative z-10 w-full rounded-xl overflow-hidden flex items-end justify-center">
                    <img
                      src="/saf.png"
                      alt="Sınıf Durumu"
                      className="w-full h-auto object-contain block drop-shadow-sm"
                      draggable={false}
                    />
                    <div className="absolute inset-x-0 bottom-1 sm:bottom-1.5 z-10 flex flex-col items-center justify-center text-center px-1">
                      <span className="text-[8.5px] sm:text-[10px] font-black tracking-wide uppercase text-white leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                        {hasCritical ? 'Kritik Süre' : 'Sınıf Güvende'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white tracking-tight leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                        {avgStage}. Kademe
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 14-Kademe Spektrum İlerleme Çubuğu */}
              <div className="space-y-0.5">
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
                <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-black text-slate-500 leading-tight">
                  <span>0 dk</span>
                  <span>{avgStage}/14 Kademe Ortalaması</span>
                  <span>420+ dk</span>
                </div>
              </div>
            </div>

            {/* Sağ Taraf: Kedi Maskotu */}
            <div className="relative z-10 flex-shrink-0 self-stretch flex items-end justify-center w-[100px] sm:w-[124px] md:w-[140px] -mb-3 sm:-mb-3.5 pointer-events-none select-none">
              <TransparentMascotVideo
                src="/mascot.mp4"
                className="h-auto w-full max-h-[126px] sm:max-h-[140px] md:max-h-[150px] drop-shadow-[0_8px_16px_rgba(124,58,237,0.18)] transition-all duration-300"
              />
            </div>
          </div>
        );
      })()}

      {/* 2. RENK BÖLGELERİNE GÖRE DAĞILIM (Veli Sayfasındaki Gibi Glass Efektli Çerçeveler) */}
      <div
        className="relative z-10 rounded-3xl p-3 sm:p-3.5 space-y-2 overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.50) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.75)',
          boxShadow:
            '0 8px 32px rgba(31, 38, 135, 0.15), 0 0 16px rgba(168, 85, 247, 0.18), 0 0 16px rgba(45, 212, 191, 0.16), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Üst cam parlama efekti */}
        <div
          className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none rounded-t-3xl"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.35), transparent)',
          }}
        />

        <div className="relative z-10 flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-violet-600" />
            <span>Renk Bölgelerine Göre Dağılım</span>
          </span>
          {filterCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className="text-[10px] font-bold text-violet-700 hover:underline cursor-pointer"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>

        {/* 4 Renk Bölgesi Çerçevesi (Veli Sayfasındaki Birebir Glass Efekti: /ta.png, /ro.png, /sa.png, /me.png) */}
        <div className="relative z-10 grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {/* 1. Güvenli Alan (Yeşil) */}
          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'safe' ? 'all' : 'safe')}
            className={`rounded-2xl py-2 px-0.5 sm:py-2.5 sm:px-1.5 flex flex-col items-center justify-between gap-1 text-center min-h-[92px] sm:min-h-[102px] transition-all duration-150 active:scale-95 cursor-pointer backdrop-blur-md overflow-hidden select-none relative ${
              filterCategory === 'safe'
                ? 'bg-emerald-200/40 border-2 border-emerald-400 scale-[1.03]'
                : `bg-emerald-100/25 hover:bg-emerald-100/35 border border-white/50 ${
                    filterCategory !== 'all' ? 'opacity-60 hover:opacity-100' : ''
                  }`
            }`}
            style={{
              boxShadow:
                filterCategory === 'safe'
                  ? '0 8px 24px rgba(16, 185, 129, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.8)'
                  : '0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
            }}
            title="Güvenli Alan (0-210 dk) - Filtrelemek için tıklayın"
          >
            {/* Üst cam ışıma efekti */}
            <div
              className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none rounded-t-2xl"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.40), transparent)',
              }}
            />

            <div className="relative z-10 flex items-center justify-center h-10 sm:h-12 w-full my-0">
              <img
                src="/ta.png"
                alt="Güvenli Alan"
                className="h-10 sm:h-12 w-auto max-w-full object-contain pointer-events-none drop-shadow-none"
                draggable={false}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full leading-none px-0.5">
              <div className="text-base sm:text-lg font-black text-slate-900 leading-none">
                {safeStudents.length}
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 ml-0.5">öğr</span>
              </div>
              <span className="text-[10px] min-[380px]:text-[11px] sm:text-xs font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight mt-0.5">
                Güvenli Alan
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-emerald-900 leading-tight mt-1 px-1.5 py-0.5 rounded bg-white/70 whitespace-nowrap border border-white/60">
                0-210 dk
              </span>
            </div>
          </button>

          {/* 2. Dengeli Süre (Mavi/Sarı) */}
          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'moderate' ? 'all' : 'moderate')}
            className={`rounded-2xl py-2 px-0.5 sm:py-2.5 sm:px-1.5 flex flex-col items-center justify-between gap-1 text-center min-h-[92px] sm:min-h-[102px] transition-all duration-150 active:scale-95 cursor-pointer backdrop-blur-md overflow-hidden select-none relative ${
              filterCategory === 'moderate'
                ? 'bg-amber-200/40 border-2 border-amber-400 scale-[1.03]'
                : `bg-amber-100/25 hover:bg-amber-100/35 border border-white/50 ${
                    filterCategory !== 'all' ? 'opacity-60 hover:opacity-100' : ''
                  }`
            }`}
            style={{
              boxShadow:
                filterCategory === 'moderate'
                  ? '0 8px 24px rgba(245, 158, 11, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.8)'
                  : '0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
            }}
            title="Dengeli Süre (240-300 dk) - Filtrelemek için tıklayın"
          >
            {/* Üst cam ışıma efekti */}
            <div
              className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none rounded-t-2xl"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.40), transparent)',
              }}
            />

            <div className="relative z-10 flex items-center justify-center h-10 sm:h-12 w-full my-0">
              <img
                src="/ro.png"
                alt="Dengeli Süre"
                className="h-10 sm:h-12 w-auto max-w-full object-contain pointer-events-none drop-shadow-none"
                draggable={false}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full leading-none px-0.5">
              <div className="text-base sm:text-lg font-black text-slate-900 leading-none">
                {moderateStudents.length}
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 ml-0.5">öğr</span>
              </div>
              <span className="text-[10px] min-[380px]:text-[11px] sm:text-xs font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight mt-0.5">
                Dengeli Süre
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-amber-900 leading-tight mt-1 px-1.5 py-0.5 rounded bg-white/70 whitespace-nowrap border border-white/60">
                240-300 dk
              </span>
            </div>
          </button>

          {/* 3. Dikkat Sınırı (Turuncu) */}
          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'warning' ? 'all' : 'warning')}
            className={`rounded-2xl py-2 px-0.5 sm:py-2.5 sm:px-1.5 flex flex-col items-center justify-between gap-1 text-center min-h-[92px] sm:min-h-[102px] transition-all duration-150 active:scale-95 cursor-pointer backdrop-blur-md overflow-hidden select-none relative ${
              filterCategory === 'warning'
                ? 'bg-orange-200/40 border-2 border-orange-400 scale-[1.03]'
                : `bg-orange-100/25 hover:bg-orange-100/35 border border-white/50 ${
                    filterCategory !== 'all' ? 'opacity-60 hover:opacity-100' : ''
                  }`
            }`}
            style={{
              boxShadow:
                filterCategory === 'warning'
                  ? '0 8px 24px rgba(249, 115, 22, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.8)'
                  : '0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
            }}
            title="Dikkat Sınırı (330-390 dk) - Filtrelemek için tıklayın"
          >
            {/* Üst cam ışıma efekti */}
            <div
              className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none rounded-t-2xl"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.40), transparent)',
              }}
            />

            <div className="relative z-10 flex items-center justify-center h-10 sm:h-12 w-full my-0">
              <img
                src="/sa.png"
                alt="Dikkat Sınırı"
                className="h-10 sm:h-12 w-auto max-w-full object-contain pointer-events-none drop-shadow-none"
                draggable={false}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full leading-none px-0.5">
              <div className="text-base sm:text-lg font-black text-slate-900 leading-none">
                {warningStudents.length}
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 ml-0.5">öğr</span>
              </div>
              <span className="text-[10px] min-[380px]:text-[11px] sm:text-xs font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight mt-0.5">
                Dikkat Sınırı
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-orange-900 leading-tight mt-1 px-1.5 py-0.5 rounded bg-white/70 whitespace-nowrap border border-white/60">
                330-390 dk
              </span>
            </div>
          </button>

          {/* 4. Kırmızı Sınır (Kırmızı) */}
          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'critical' ? 'all' : 'critical')}
            className={`rounded-2xl py-2 px-0.5 sm:py-2.5 sm:px-1.5 flex flex-col items-center justify-between gap-1 text-center min-h-[92px] sm:min-h-[102px] transition-all duration-150 active:scale-95 cursor-pointer backdrop-blur-md overflow-hidden select-none relative ${
              filterCategory === 'critical'
                ? 'bg-rose-200/40 border-2 border-rose-400 scale-[1.03]'
                : `bg-rose-100/25 hover:bg-rose-100/35 border border-white/50 ${
                    filterCategory !== 'all' ? 'opacity-60 hover:opacity-100' : ''
                  }`
            }`}
            style={{
              boxShadow:
                filterCategory === 'critical'
                  ? '0 8px 24px rgba(244, 63, 94, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.8)'
                  : '0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
            }}
            title="Kırmızı Sınır (420+ dk) - Filtrelemek için tıklayın"
          >
            {/* Üst cam ışıma efekti */}
            <div
              className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none rounded-t-2xl"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.40), transparent)',
              }}
            />

            <div className="relative z-10 flex items-center justify-center h-10 sm:h-12 w-full my-0">
              <img
                src="/me.png"
                alt="Kırmızı Sınır"
                className="h-10 sm:h-12 w-auto max-w-full object-contain pointer-events-none drop-shadow-none"
                draggable={false}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full leading-none px-0.5">
              <div className="text-base sm:text-lg font-black text-slate-900 leading-none">
                {criticalStudents.length}
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 ml-0.5">öğr</span>
              </div>
              <span className="text-[10px] min-[380px]:text-[11px] sm:text-xs font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight mt-0.5">
                Kırmızı Sınır
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-rose-900 leading-tight mt-1 px-1.5 py-0.5 rounded bg-white/70 whitespace-nowrap border border-white/60">
                420+ dk
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. ÖĞRENCİ BİLGİLERİ (Buzlu Cam Kart) */}
      <div
        className="relative z-10 rounded-3xl p-3.5 sm:p-4 space-y-3 overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.50) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.75)',
          boxShadow:
            '0 8px 32px rgba(31, 38, 135, 0.15), 0 0 16px rgba(168, 85, 247, 0.18), 0 0 16px rgba(45, 212, 191, 0.16), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Üst cam parlama efekti */}
        <div
          className="absolute top-0 left-0 right-0 h-[30%] pointer-events-none rounded-t-3xl"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.35), transparent)',
          }}
        />

        <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-violet-500" />
            <span>Öğrenci Bilgileri ({sortedStudents.length} / {totalStudents})</span>
          </h3>

          <button
            type="button"
            id="btn-teacher-export-stats"
            onClick={() => setIsExportModalOpen(true)}
            className="btn-3d-emerald px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            title="Sınıf istatistiklerini ve tüm öğrencilerin hafta hafta sürelerini PDF veya Excel olarak dışa aktar"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>İstatistik Çıktısı (PDF / Excel)</span>
          </button>
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
                  className={`relative backdrop-blur-md rounded-2xl border p-2.5 sm:p-3 transition-all hover:bg-white/40 flex items-center justify-between gap-2.5 ${cardTint}`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.32)',
                    borderColor: 'rgba(255, 255, 255, 0.55)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
                  }}
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

                  {/* Sağ: Süre, Kademe, Düzenleme ve Silme Butonu */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        {minutes} dk
                      </div>
                      <div className="text-[9.5px] font-bold text-slate-500">
                        {timeInfo.longStr} • {stage}. Kademe
                      </div>
                    </div>

                    {onUpdateUser && (
                      <button
                        type="button"
                        id={`btn-teacher-edit-student-${user.uid}`}
                        onClick={() => handleOpenEditStudent(user)}
                        title="Öğrenci & Veli Bilgilerini Düzenle"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

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

      {/* ÖĞRENCİ BİLGİLERİNİ DÜZENLEME MODALI */}
      {studentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200"
            style={{
              background: 'rgba(255, 255, 255, 0.78)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow:
                '0 20px 48px rgba(30, 27, 75, 0.25), inset 0 1px 1.5px rgba(255, 255, 255, 0.8)',
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 backdrop-blur-md text-indigo-600 flex items-center justify-center mx-auto border border-indigo-200/70">
              <Pencil className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900">
                Öğrenci & Veli Düzenle
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Öğrenci veya veli adında düzeltme yapabilirsiniz.
              </p>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Öğrenci Adı Soyadı:</label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  placeholder="Örn: Ali Yılmaz"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Veli Adı Soyadı:</label>
                <input
                  type="text"
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                  placeholder="Örn: Mehmet Yılmaz"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {editError && (
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStudentToEdit(null);
                    setEditError(null);
                  }}
                  disabled={isSavingEdit}
                  className="btn-3d-white py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editStudentName.trim()}
                  className="btn-3d-indigo py-2.5 px-4 rounded-2xl text-xs font-black text-white cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isSavingEdit ? (
                    <span>Kaydediliyor...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÖĞRENCİ HESABI SİLME ONAY MODALI */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200"
            style={{
              background: 'rgba(255, 255, 255, 0.78)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow:
                '0 20px 48px rgba(76, 5, 25, 0.22), inset 0 1px 1.5px rgba(255, 255, 255, 0.8)',
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100/80 backdrop-blur-md text-rose-600 flex items-center justify-center mx-auto border border-rose-200/70">
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

            <div className="p-3 bg-white/50 backdrop-blur-md rounded-2xl border border-white/70 text-[11px] text-slate-600 space-y-1">
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

      {/* Sınıf & Öğrenci İstatistik Çıktısı Modalı (PDF / Excel) */}
      <StatsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={studentList}
        classrooms={classroom ? [classroom] : []}
        defaultClassId={classroom?.id}
        calendarConfig={calendarConfig}
        institutionName={instName || 'Okul Kurumu'}
        defaultClassName={className}
        isTeacher={true}
      />
    </div>
  );
};