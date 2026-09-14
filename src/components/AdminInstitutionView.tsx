import React, { useState } from 'react';
import { UserProfile, ClassroomInfo } from '../types';
import { formatMinutes, formatTimeAgo } from '../lib/weekUtils';
import { getStageCategory } from '../lib/stagesData';
import {
  Building2,
  School,
  Users,
  GraduationCap,
  ChevronRight,
  ArrowLeft,
  BarChart3,
  Search,
  Flame,
  Copy,
  Check,
  KeyRound,
  Trash2,
  AlertTriangle,
  UserX,
} from 'lucide-react';

interface AdminInstitutionViewProps {
  institutionName?: string;
  institutionCode?: string;
  institutionAdminCode?: string;
  classrooms: ClassroomInfo[];
  studentsByClass: Record<string, UserProfile[]>;
  onOpenClassSetup?: () => void;
  onDeleteClassroom?: (classId: string, teacherUid?: string) => Promise<void> | void;
  onDeleteUser?: (userUid: string, classId?: string) => Promise<void> | void;
}

function computeClassStats(students: UserProfile[]) {
  const totalStudents = students.length;
  const totalMinutes = students.reduce(
    (acc, u) => acc + (u.currentWeekMinutes ?? (u.currentWeekStage || 0) * 30),
    0
  );
  const avgMinutes = totalStudents > 0 ? Math.round(totalMinutes / totalStudents) : 0;
  const avgStage = Math.min(14, Math.max(0, Math.round(avgMinutes / 30)));
  const criticalCount = students.filter((u) => (u.currentWeekStage || 0) >= 14).length;
  const warningCount = students.filter((u) => {
    const s = u.currentWeekStage || 0;
    return s >= 11 && s <= 13;
  }).length;
  const moderateCount = students.filter((u) => {
    const s = u.currentWeekStage || 0;
    return s >= 8 && s <= 10;
  }).length;
  const safeCount = students.filter((u) => (u.currentWeekStage || 0) <= 7).length;

  return { totalStudents, avgMinutes, avgStage, criticalCount, warningCount, moderateCount, safeCount };
}

export const AdminInstitutionView: React.FC<AdminInstitutionViewProps> = ({
  institutionName = 'Kurum',
  institutionCode,
  institutionAdminCode,
  classrooms,
  studentsByClass,
  onOpenClassSetup,
  onDeleteClassroom,
  onDeleteUser,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedInstCode, setCopiedInstCode] = useState(false);
  const [copiedAdminCode, setCopiedAdminCode] = useState(false);

  // Deletion modals state
  const [classToDelete, setClassToDelete] = useState<ClassroomInfo | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<{ user: UserProfile; classId: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteClassroom?.(classToDelete.id, classToDelete.teacherUid);
      setClassToDelete(null);
      if (selectedClassId === classToDelete.id) {
        setSelectedClassId(null);
      }
    } catch (err) {
      console.error('Error deleting classroom:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteUser?.(studentToDelete.user.uid, studentToDelete.classId);
      setStudentToDelete(null);
    } catch (err) {
      console.error('Error deleting student:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyInstCode = () => {
    if (!institutionCode) return;
    navigator.clipboard.writeText(institutionCode);
    setCopiedInstCode(true);
    setTimeout(() => setCopiedInstCode(false), 2000);
  };

  const handleCopyAdminCode = () => {
    if (!institutionAdminCode) return;
    navigator.clipboard.writeText(institutionAdminCode);
    setCopiedAdminCode(true);
    setTimeout(() => setCopiedAdminCode(false), 2000);
  };

  // Kurum geneli toplam istatistikler
  const allStudents = classrooms.flatMap((c) => studentsByClass[c.id] || []);
  const overall = computeClassStats(allStudents);

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassId) || null;

  // --------------------------------------------------------------
  // DETAY GÖRÜNÜMÜ: Seçili sınıfın öğrenci listesi
  // --------------------------------------------------------------
  if (selectedClassroom) {
    const students = studentsByClass[selectedClassroom.id] || [];
    const stats = computeClassStats(students);

    const filteredStudents = students.filter((u) => {
      const sName = u.studentName || u.displayName || '';
      const pName = u.parentName || '';
      return (
        sName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    const sortedStudents = [...filteredStudents].sort((a, b) => {
      const minutesA = a.currentWeekMinutes ?? (a.currentWeekStage || 0) * 30;
      const minutesB = b.currentWeekMinutes ?? (b.currentWeekStage || 0) * 30;
      return minutesB - minutesA;
    });

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setSelectedClassId(null);
            setSearchQuery('');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 hover:text-indigo-900 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Tüm Sınıflara Dön</span>
        </button>

        {/* Sınıf Başlık Kartı */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 flex-shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">{selectedClassroom.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                  Öğretmen: {selectedClassroom.teacherName}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Sınıf Kodu: {selectedClassroom.code}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400">Sınıf Ortalaması</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">{stats.avgMinutes} dk</div>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200">
              <div className="text-[10px] font-bold text-emerald-600">Yeşil (0-7)</div>
              <div className="text-sm font-black text-emerald-700 mt-0.5">{stats.safeCount} Öğrenci</div>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-200">
              <div className="text-[10px] font-bold text-amber-600">Sarı &amp; Turuncu</div>
              <div className="text-sm font-black text-amber-700 mt-0.5">
                {stats.moderateCount + stats.warningCount} Öğrenci
              </div>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-2xl border border-rose-200">
              <div className="text-[10px] font-bold text-rose-600">Kırmızı (14)</div>
              <div className="text-sm font-black text-rose-700 mt-0.5">{stats.criticalCount} Öğrenci</div>
            </div>
          </div>
        </div>

        {/* Arama */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Öğrenci veya veli adına göre ara..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
          />
        </div>

        {/* Öğrenci Listesi */}
        <div className="space-y-2.5">
          {sortedStudents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-2 shadow-sm">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                {searchQuery ? 'Aramanıza uygun öğrenci bulunamadı.' : 'Bu sınıfa henüz veli bağlanmadı.'}
              </p>
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

              return (
                <div
                  key={user.uid}
                  className={`bg-white rounded-2xl border p-3 sm:p-3.5 shadow-xs flex items-center justify-between gap-3 ${
                    isRed
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : isOrange
                      ? 'border-orange-200'
                      : isYellow
                      ? 'border-yellow-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate">{sName}</span>
                      <span
                        className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                          isRed
                            ? 'bg-rose-600 text-white'
                            : isOrange
                            ? 'bg-orange-500 text-white'
                            : isYellow
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {category.name}
                      </span>
                      {isRed && <Flame className="w-3 h-3 text-rose-600" />}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                      Veli: <span className="text-slate-600">{pName}</span> • {formatTimeAgo(user.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-slate-900">{minutes} dk</div>
                      <div className="text-[9.5px] font-bold text-slate-500">
                        {timeInfo.longStr} • {stage}. Kademe
                      </div>
                    </div>
                    <button
                      type="button"
                      id={`btn-delete-student-${user.uid}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStudentToDelete({ user, classId: selectedClassroom.id });
                      }}
                      title="Öğrenci / Veli Hesabını Sil"
                      className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------
  // ANA GÖRÜNÜM: Kuruma bağlı tüm sınıfların listesi
  // --------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Kurum Bilgi Çubuğu - Üstte sade ve temiz kurum başlığı (Gereksiz kodlar kaldırıldı) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-xs text-slate-700">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-900 truncate block text-xs sm:text-sm">
              {institutionName || 'Kurum / Okul'}
            </span>
            <span className="text-[10px] font-bold text-rose-700">
              Yönetici Paneli
            </span>
          </div>
        </div>
      </div>

      {/* Kurum Geneli Özet */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
        <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 mb-3">
          <BarChart3 className="w-4 h-4 text-violet-500" />
          <span>Kurum Geneli Özet</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-indigo-50 p-2.5 rounded-2xl border border-indigo-200">
            <div className="text-[10px] font-bold text-indigo-500">Toplam Sınıf</div>
            <div className="text-sm font-black text-indigo-800 mt-0.5">{classrooms.length}</div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">Toplam Öğrenci</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{overall.totalStudents}</div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">Genel Ortalama</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{overall.avgMinutes} dk</div>
          </div>
          <div className="bg-rose-50 p-2.5 rounded-2xl border border-rose-200">
            <div className="text-[10px] font-bold text-rose-600">Kırmızı Bölgede</div>
            <div className="text-sm font-black text-rose-700 mt-0.5">{overall.criticalCount} Öğrenci</div>
          </div>
        </div>
      </div>

      {/* Öğretmen / Sınıf Listesi */}
      <div className="space-y-2.5">
        <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 px-1">
          <GraduationCap className="w-4 h-4 text-indigo-500" />
          <span>Öğretmenler &amp; Sınıflar ({classrooms.length})</span>
        </h3>

        {classrooms.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-2.5 shadow-sm">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Kurumunuza henüz bağlı bir öğretmen yok.</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Aşağıdaki <span className="font-mono font-black text-rose-600">{institutionCode}</span> kurum kodunu
              öğretmenlerinizle paylaşın; öğretmenler bu kodla bağlanıp kendi sınıflarını oluşturduğunda burada
              listelenecekler.
            </p>
          </div>
        ) : (
          classrooms.map((classroom) => {
            const students = studentsByClass[classroom.id] || [];
            const stats = computeClassStats(students);
            const hasCritical = stats.criticalCount > 0;

            return (
              <div
                key={classroom.id}
                onClick={() => setSelectedClassId(classroom.id)}
                className={`w-full text-left bg-white rounded-3xl border p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  hasCritical ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border flex-shrink-0 ${
                        hasCritical
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}
                    >
                      <School className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate">{classroom.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Öğretmen: {classroom.teacherName} • {stats.totalStudents}/
                        {classroom.studentTargetCount || 25} öğrenci
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      id={`btn-delete-class-${classroom.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClassToDelete(classroom);
                      }}
                      title="Sınıfı & Öğretmeni Kurumdan Sil"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {stats.avgMinutes} dk ortalama
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {stats.safeCount} Yeşil
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {stats.moderateCount + stats.warningCount} Sarı/Turuncu
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      hasCritical
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}
                  >
                    {stats.criticalCount} Kırmızı
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Altta Kurum Kodu ve Kopyalama Kartı (Üstte ayarlar butonu var, burada ayarlar butonu yok, sadece kopyalama butonu) */}
      {institutionCode && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                Kurum Kodu (Öğretmen Katılımı)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Öğretmenler bu kurum kodunu girerek kurumunuza bağlanır ve kendi sınıflarını açarlar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-rose-50/90 px-3.5 py-2.5 rounded-2xl border border-rose-200 flex-1 min-w-[220px] justify-between">
              <span className="text-sm sm:text-base font-mono font-black text-rose-800 tracking-wider">
                {institutionCode}
              </span>
              <button
                type="button"
                id="btn-copy-inst-code"
                onClick={handleCopyInstCode}
                title="Kurum Kodunu Kopyala"
                className="btn-3d-rose inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer active:scale-95"
              >
                {copiedInstCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    <span>Kopyalandı!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Kopyala</span>
                  </>
                )}
              </button>
            </div>

            {institutionAdminCode && (
              <div className="flex items-center gap-2 bg-indigo-50/90 px-3.5 py-2.5 rounded-2xl border border-indigo-200 flex-1 min-w-[220px] justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-500 block">Admin Yetki Kodu</span>
                  <span className="text-sm sm:text-base font-mono font-black text-indigo-900 tracking-wider">
                    {institutionAdminCode}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-copy-admin-code"
                  onClick={handleCopyAdminCode}
                  title="Admin Kodunu Kopyala"
                  className="btn-3d-palette-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer active:scale-95"
                >
                  {copiedAdminCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      <span>Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SINIF SİLME ONAY MODALI */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900">
                Sınıfı Kurumdan Sil?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bu sınıfı sildiğinizde, sınıfa kayıtlı öğrenci listesi ve öğretmenin sınıf bağlantısı temizlenecektir.
              </p>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-rose-600" />
                <span>Sınıf: {classToDelete.name}</span>
              </div>
              <div className="text-slate-600">
                Öğretmen: <span className="font-bold text-slate-900">{classToDelete.teacherName}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Sınıf Kodu: {classToDelete.code}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                disabled={isDeleting}
                className="btn-3d-white py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Siliniyor...' : 'Evet, Sınıfı Sil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÖĞRENCİ HESABI SİLME ONAY MODALI */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <UserX className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900">
                Öğrenci Hesabını Sil?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bu öğrenci/veli hesabını kalıcı olarak silmek üzeresiniz. Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Öğrenci: {studentToDelete.user.studentName || studentToDelete.user.displayName || 'Öğrenci'}</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                Veli: {studentToDelete.user.parentName || studentToDelete.user.displayName || 'Veli'}
              </div>
              {studentToDelete.user.email && (
                <div className="font-mono text-[10px] text-indigo-700 truncate">
                  {studentToDelete.user.email}
                </div>
              )}
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
                <span>{isDeleting ? 'Siliniyor...' : 'Evet, Hesabı Sil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
