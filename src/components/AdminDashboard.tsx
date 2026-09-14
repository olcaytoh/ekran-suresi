import React, { useState } from 'react';
import { UserProfile, ClassroomInfo } from '../types';
import { STAGES_CONFIG, getStageCategory } from '../lib/stagesData';
import { formatMinutes, formatTimeAgo } from '../lib/weekUtils';
import {
  Users,
  Search,
  AlertTriangle,
  Flame,
  Clock,
  ShieldCheck,
  UserPlus,
  Trash2,
  GraduationCap,
  Settings,
  School,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Calendar,
  Building2,
  KeyRound,
  Edit3,
} from 'lucide-react';
import { seed25ClassroomStudents, remove25ClassroomStudents } from '../lib/demoData';
import { AcademicCalendarModal } from './AcademicCalendarModal';
import { AcademicCalendarConfig } from '../types';
import {
  subscribeAcademicCalendar,
  generateDefaultAcademicCalendar,
} from '../lib/academicCalendar';

interface AdminDashboardProps {
  users: UserProfile[];
  currentUserId: string;
  userEmail?: string;
  classroom?: ClassroomInfo | null;
  teacherProfile?: UserProfile | null;
  onOpenClassSetup?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  currentUserId,
  userEmail,
  classroom,
  teacherProfile,
  onOpenClassSetup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'critical' | 'warning' | 'moderate' | 'safe'>('all');
  const [sortBy, setSortBy] = useState<'minutes-desc' | 'minutes-asc' | 'updated-desc' | 'name'>('minutes-desc');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarConfig, setCalendarConfig] = useState<AcademicCalendarConfig>(
    generateDefaultAcademicCalendar()
  );

  React.useEffect(() => {
    const unsub = subscribeAcademicCalendar((config) => {
      setCalendarConfig(config);
    });
    return () => unsub();
  }, []);

  // Classroom Info
  const classCode = classroom?.code || teacherProfile?.classCode || 'SINIF4A';
  const className = classroom?.name || teacherProfile?.className || '4-A Sınıfı';
  const targetCount = classroom?.studentTargetCount || 25;

  // Filter out teacher themself from students
  const studentList = users.filter((u) => {
    if (u.role === 'admin' || (u.userType === 'teacher' && u.uid === currentUserId)) {
      return false;
    }
    if (classroom?.id && u.classId) {
      return u.classId === classroom.id;
    }
    return true;
  });

  // Statistics
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
    (acc, u) => acc + (u.currentWeekMinutes || (u.currentWeekStage || 0) * 30),
    0
  );
  const avgMinutes = totalStudents > 0 ? Math.round(totalMinutes / totalStudents) : 0;
  const avgFormatted = formatMinutes(avgMinutes);

  const hasCritical = criticalStudents.length > 0;
  // Mascot image: green by default, red when critical threshold is triggered
  const currentMascot = hasCritical ? '/kirmizi.png' : '/yesil.png';

  // Filter & Search
  const filteredStudents = studentList.filter((user) => {
    const nameMatch =
      (user.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.parentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!nameMatch) return false;

    const stage = user.currentWeekStage || 0;
    if (filterCategory === 'critical') return stage >= 10;
    if (filterCategory === 'warning') return stage >= 7 && stage <= 9;
    if (filterCategory === 'moderate') return stage >= 4 && stage <= 6;
    if (filterCategory === 'safe') return stage <= 3;
    return true;
  });

  // Sort
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

  const handleClearDemoStudents = async () => {
    try {
      setIsSeeding(true);
      await remove25ClassroomStudents();
    } catch (err) {
      console.error('Failed to remove demo students:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const hasDemoStudents = users.some((u) => u.uid.startsWith('demo_std'));

  const instCode = classroom?.institutionCode || teacherProfile?.institutionCode;
  const instName = classroom?.institutionName || teacherProfile?.institutionName;

  return (
    <div className="space-y-5">
      {/* Okul / Kurum Bilgi ve Yönetim Çubuğu (Admin Kurum İsmi ve Kodunu Buradan Yönetebilir) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 truncate">
                {instName || 'Bağlı Okul / Kurum'}
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                Okul Hesabı
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span>Kurum Kodu (Öğretmen Katılımı):</span>
              <span className="font-mono font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[11px]">
                {instCode || 'Belirtilmedi'}
              </span>
            </div>
          </div>
        </div>

        {onOpenClassSetup && (
          <button
            type="button"
            id="btn-edit-school-details"
            onClick={onOpenClassSetup}
            className="btn-3d-rose inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ml-auto"
            title="Okul ismini ve kurum kodunu değiştir"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Okul & Kod Değiştir</span>
          </button>
        )}
      </div>

      {/* 1. Üst Başlık ve 3D Gamified Kahraman Kartı (Veli Ekranı ile Birebir Aynı Tasarım) */}
      <div className="relative bg-gradient-to-b from-sky-100/70 via-white to-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden pt-6 pb-6 px-4 sm:px-6">
        {/* Dekoratif arkaplan efekti */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-gradient-to-b from-indigo-200/40 via-sky-100/30 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Üst Rozetler ve Ortadaki Dairesel 3D Avatar */}
        <div className="relative flex items-center justify-between max-w-lg mx-auto mb-3">
          {/* Sol Rozet: Kayıtlı Öğrenci */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl py-1.5 px-3 border border-slate-200 shadow-[0_3px_0_#cbd5e1,0_6px_12px_rgba(0,0,0,0.04)]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 text-white flex items-center justify-center shadow-xs text-sm font-bold">
              👥
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Kayıtlı Veli
              </div>
              <div className="text-sm sm:text-base font-black text-slate-800 leading-tight">
                {totalStudents} <span className="text-[11px] font-bold text-slate-500">/{targetCount}</span>
              </div>
            </div>
          </div>

          {/* Ortadaki Dairesel 3D Avatar (yesil.png / kirmizi.png) */}
          <div className="relative mx-2 -my-2 flex-shrink-0">
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 transition-all duration-500 ${
                hasCritical
                  ? 'bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 shadow-[0_8px_24px_rgba(225,29,72,0.4)]'
                  : 'bg-gradient-to-tr from-emerald-400 via-cyan-400 to-indigo-500 shadow-[0_8px_24px_rgba(16,185,129,0.35)]'
              }`}
            >
              <div className="w-full h-full rounded-full p-1 bg-white shadow-inner flex items-center justify-center overflow-hidden">
                <img
                  src={currentMascot}
                  alt="Sınıf Maskotu"
                  className="w-full h-full object-cover rounded-full transition-transform duration-300 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Durum Rozeti */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
              <span
                className={`px-3 py-0.5 rounded-full text-[11px] font-black tracking-wider text-white shadow-md border border-white/60 flex items-center gap-1 ${
                  hasCritical ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                <span>{hasCritical ? 'Kritik Uyarı' : 'Sınıf Güvende'}</span>
              </span>
            </div>
          </div>

          {/* Sağ Rozet: Sınıf Ortalaması */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl py-1.5 px-3 border border-slate-200 shadow-[0_3px_0_#cbd5e1,0_6px_12px_rgba(0,0,0,0.04)]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-xs text-sm font-bold">
              ⏱️
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ortalama
              </div>
              <div className="text-sm sm:text-base font-black text-slate-800 leading-tight">
                {avgMinutes} <span className="text-[11px] font-bold text-slate-500">dk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Başlık ve Sınıf Adı */}
        <div className="text-center mt-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {className} Ekran Süresi Takibi
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Öğretmen Yönetim Paneli • Canlı Veli Senkronizasyonu
          </p>
        </div>

        {/* 3D "Statistics" Hap Buton */}
        <div className="flex justify-center mt-3">
          <div
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-xs sm:text-sm tracking-wide cursor-default ${
              hasCritical ? 'btn-3d-rose' : 'btn-3d-cyan'
            }`}
          >
            <BarChart3 className="w-4 h-4 stroke-[2.5]" />
            <span>
              {hasCritical
                ? `${criticalStudents.length} Öğrenci Kırmızı Bölgede (≥300 dk)`
                : `Sınıf Ortalaması: ${avgFormatted.longStr}`}
            </span>
          </div>
        </div>

        {/* Hızlı Aksiyon 3D Butonları (Örnek 25 Öğrenci Yükle, Temizle, Sınıf Ayarı) */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            id="btn-seed-25-demo"
            disabled={isSeeding}
            onClick={handleSeedDemoStudents}
            className="btn-3d-cyan inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black cursor-pointer"
            title="25 öğrencinin nasıl görüneceğini test etmek için örnek veliler ekleyin"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>{isSeeding ? 'Ekleniyor...' : 'Örnek 25 Öğrenci Yükle (Test)'}</span>
          </button>

          {hasDemoStudents && (
            <button
              type="button"
              id="btn-clear-demo"
              disabled={isSeeding}
              onClick={handleClearDemoStudents}
              className="btn-3d-rose inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black cursor-pointer"
              title="Örnek verileri temizle"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              <span>Temizle</span>
            </button>
          )}

          {onOpenClassSetup && (
            <button
              type="button"
              onClick={onOpenClassSetup}
              className="btn-3d-white inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Sınıf Ayarları</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCalendarModalOpen(true)}
            className="btn-3d-white inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer"
            title="35 haftanın tarihlerini ve tatil dönemlerini düzenleyin"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Takvim & Tatil Haftaları</span>
          </button>
        </div>
      </div>

      {/* 2. Filtre ve Arama Çubuğu (3D Butonlarla) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Arama */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Öğrenci veya veli adı ara..."
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
          />
        </div>

        {/* 3D Filtre Butonları */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-black">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                filterCategory === 'all' ? 'btn-3d-cyan' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tümü ({studentList.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('critical')}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 ${
                filterCategory === 'critical' ? 'btn-3d-rose' : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              <span>Kırmızı ({criticalStudents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('safe')}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 ${
                filterCategory === 'safe' ? 'btn-3d-emerald' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              <span>Yeşil ({safeStudents.length})</span>
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-slate-800 cursor-pointer shadow-[0_2px_0_#cbd5e1] focus:outline-hidden"
          >
            <option value="minutes-desc">Süreye Göre (Çoktan Aza)</option>
            <option value="minutes-asc">Süreye Göre (Azdan Çoka)</option>
            <option value="name">Öğrenci Adına Göre (A-Z)</option>
            <option value="updated-desc">Son Güncellenenler</option>
          </select>
        </div>
      </div>

      {/* 3. Öğrenci Kartları Listesi */}
      <div className="space-y-3">
        {sortedStudents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center border border-indigo-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {searchQuery ? 'Aramanıza uygun öğrenci bulunamadı' : 'Sınıfa henüz veli bağlanmadı'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? 'Arama terimini değiştirerek tekrar deneyebilirsiniz.'
                  : `Üstte yer alan "${classCode}" kodunu velilerinizle paylaşın veya hemen test etmek için "Örnek 25 Öğrenci Yükle" butonuna tıklayın.`}
              </p>
            </div>

            {!searchQuery && (
              <button
                type="button"
                onClick={handleSeedDemoStudents}
                className="btn-3d-cyan inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black cursor-pointer"
              >
                <UserPlus className="w-4 h-4 stroke-[3]" />
                <span>Örnek 25 Öğrenciyi Hemen Yükle</span>
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
            const isStudentRed = stage >= 14;
            const isStudentOrange = stage >= 11 && stage <= 13;
            const isStudentYellow = stage >= 8 && stage <= 10;
            const mascotSrc = category.mascotImg;

            return (
              <div
                key={user.uid}
                id={`student-card-${user.uid}`}
                className={`bg-white rounded-3xl border transition-all p-4 shadow-sm hover:shadow-md ${
                  isStudentRed
                    ? 'border-rose-300 ring-2 ring-rose-300/40'
                    : isStudentOrange
                    ? 'border-orange-300 ring-1 ring-orange-200'
                    : isStudentYellow
                    ? 'border-yellow-300 ring-1 ring-yellow-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Sol: Maskot Görseli & Öğrenci Bilgisi */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-2xl overflow-hidden border-2 flex-shrink-0 bg-slate-50 shadow-xs ${
                          isStudentRed
                            ? 'border-rose-500'
                            : isStudentOrange
                            ? 'border-orange-500'
                            : isStudentYellow
                            ? 'border-yellow-500'
                            : 'border-emerald-500'
                        }`}
                      >
                        <img
                          src={mascotSrc}
                          alt={category.label}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isStudentRed
                            ? 'bg-rose-600 animate-pulse'
                            : isStudentOrange
                            ? 'bg-orange-500'
                            : isStudentYellow
                            ? 'bg-yellow-400'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900">
                          {sName}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Veli: {pName}
                        </span>
                        {isStudentRed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            <Flame className="w-3 h-3 text-rose-600" />
                            Kırmızı Bölge
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span>Son işaretleme: {formatTimeAgo(user.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sağ: Ekran Süresi ve Kademe 3D Rozeti */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-black text-slate-900">
                        {minutes} <span className="text-xs font-semibold text-slate-400">dk</span>
                      </div>
                      <div className="text-xs text-slate-600 font-bold">
                        {timeInfo.longStr}
                      </div>
                    </div>

                    {/* 3D Kademe Butonu */}
                    <div
                      className={`px-3 py-1.5 rounded-xl font-black text-xs ${
                        isStudentRed
                          ? 'btn-3d-rose'
                          : stage >= 7
                          ? 'btn-3d-amber'
                          : 'btn-3d-emerald'
                      }`}
                    >
                      {stage}/14 Kademe
                    </div>
                  </div>
                </div>

                {/* 14 Minyatür Kademe Çubuğu */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex gap-1 h-3.5 rounded-xl overflow-hidden bg-slate-100 p-1 border border-slate-200">
                    {STAGES_CONFIG.map((config) => {
                      const isFilled = config.stageNumber <= stage;
                      return (
                        <div
                          key={config.stageNumber}
                          title={`${config.stageNumber}. Kademe: ${config.label} (${config.categoryLabel})`}
                          className={`flex-1 h-full rounded-xs transition-all ${
                            isFilled ? 'shadow-xs' : 'opacity-20 bg-slate-300'
                          }`}
                          style={{
                            backgroundColor: isFilled ? config.hexColor : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Academic Calendar Modal for Teacher */}
      <AcademicCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        calendarConfig={calendarConfig}
        userEmail={userEmail}
      />
    </div>
  );
};
