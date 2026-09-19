import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, ClassroomInfo, UserRole } from '../types';
import { formatMinutes, formatTimeAgo } from '../lib/weekUtils';
import { getStageCategory } from '../lib/stagesData';
import {
  createInstitution,
  updateInstitutionName,
  regenerateInstitutionCode,
  adminSendPasswordResetEmail,
  setUserRole,
} from '../lib/firebase';
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
  Edit2,
  RefreshCw,
  Sparkles,
  Share2,
  CheckCircle2,
  Mail,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCheck,
  AtSign,
  Filter,
  UserMinus,
  Info,
} from 'lucide-react';

interface AdminInstitutionViewProps {
  currentUser?: UserProfile | null;
  institutionName?: string;
  institutionCode?: string;
  institutionAdminCode?: string;
  classrooms: ClassroomInfo[];
  studentsByClass: Record<string, UserProfile[]>;
  allUsers?: UserProfile[];
  onOpenClassSetup?: () => void;
  onDeleteClassroom?: (classId: string, teacherUid?: string) => Promise<void> | void;
  onDeleteUser?: (userUid: string, classId?: string) => Promise<void> | void;
  onProfileUpdated?: (updates: Partial<UserProfile>) => void;
  isDemo?: boolean;
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
  currentUser,
  institutionName = 'Kurum',
  institutionCode,
  institutionAdminCode,
  classrooms,
  studentsByClass,
  allUsers = [],
  onOpenClassSetup,
  onDeleteClassroom,
  onDeleteUser,
  onProfileUpdated,
  isDemo = false,
}) => {
  // Navigation & Tabs
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [adminSection, setAdminSection] = useState<'classrooms' | 'registered_emails'>('classrooms');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [emailRoleFilter, setEmailRoleFilter] = useState<'all' | 'parent' | 'teacher' | 'admin' | 'unassigned'>('all');

  // Copy States
  const [copiedInstCode, setCopiedInstCode] = useState(false);
  const [copiedAdminCode, setCopiedAdminCode] = useState(false);
  const [copiedShareText, setCopiedShareText] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Institution Info
  const [currentInstName, setCurrentInstName] = useState(
    institutionName || currentUser?.institutionName || 'Cumhuriyet İlkokulu'
  );
  const [currentInstCode, setCurrentInstCode] = useState<string | null>(
    institutionCode || currentUser?.institutionCode || null
  );
  const [currentAdminCode, setCurrentAdminCode] = useState<string | null>(
    institutionAdminCode || currentUser?.institutionAdminCode || null
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentInstName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync props if updated from parent
  useEffect(() => {
    if (institutionCode && institutionCode !== currentInstCode) {
      setCurrentInstCode(institutionCode);
    }
  }, [institutionCode]);

  useEffect(() => {
    if (institutionAdminCode && institutionAdminCode !== currentAdminCode) {
      setCurrentAdminCode(institutionAdminCode);
    }
  }, [institutionAdminCode]);

  useEffect(() => {
    if (institutionName && institutionName !== currentInstName) {
      setCurrentInstName(institutionName);
      setNameInput(institutionName);
    }
  }, [institutionName]);

  // Modals state
  const [classToDelete, setClassToDelete] = useState<ClassroomInfo | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<{ user: UserProfile; classId: string } | null>(null);
  const [userToReset, setUserToReset] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingResetForUid, setSendingResetForUid] = useState<string | null>(null);
  const [roleChangingUser, setRoleChangingUser] = useState<UserProfile | null>(null);

  // Comprehensive Registered Users List
  const allRegisteredUsers = useMemo(() => {
    const map = new Map<string, UserProfile>();

    // 1. From allUsers
    (allUsers || []).forEach((u) => {
      if (u.uid) map.set(u.uid, u);
    });

    // 2. From classrooms teachers
    classrooms.forEach((c) => {
      if (c.teacherUid && !map.has(c.teacherUid)) {
        map.set(c.teacherUid, {
          uid: c.teacherUid,
          displayName: c.teacherName,
          email: c.teacherEmail,
          role: 'teacher',
          userType: 'teacher',
          classId: c.id,
          className: c.name,
          currentWeekId: '',
          currentWeekMinutes: 0,
          currentWeekStage: 0,
        });
      }
    });

    // 3. From studentsByClass
    Object.entries(studentsByClass).forEach(([cId, list]) => {
      const cls = classrooms.find((c) => c.id === cId);
      const studentList = (list || []) as UserProfile[];
      studentList.forEach((u) => {
        if (u.uid) {
          const existing = map.get(u.uid);
          map.set(u.uid, {
            ...existing,
            ...u,
            className: u.className || cls?.name || existing?.className,
            classId: u.classId || cId,
          });
        }
      });
    });

    return Array.from(map.values());
  }, [allUsers, classrooms, studentsByClass]);

  // Filtered Registered Users
  const filteredRegisteredUsers = useMemo(() => {
    return allRegisteredUsers.filter((u) => {
      // Role filter
      if (emailRoleFilter === 'parent' && u.role !== 'parent' && u.userType !== 'parent') return false;
      if (emailRoleFilter === 'teacher' && u.role !== 'teacher') return false;
      if (emailRoleFilter === 'admin' && u.role !== 'admin') return false;
      if (emailRoleFilter === 'unassigned' && (u.classId || u.role === 'admin')) return false;

      // Search query
      if (!emailSearchQuery.trim()) return true;
      const q = emailSearchQuery.toLowerCase();
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const nameMatch = (u.displayName || '').toLowerCase().includes(q);
      const studentMatch = (u.studentName || '').toLowerCase().includes(q);
      const parentMatch = (u.parentName || '').toLowerCase().includes(q);
      const classMatch = (u.className || '').toLowerCase().includes(q);
      return emailMatch || nameMatch || studentMatch || parentMatch || classMatch;
    });
  }, [allRegisteredUsers, emailRoleFilter, emailSearchQuery]);

  // User Counts
  const parentCount = useMemo(
    () => allRegisteredUsers.filter((u) => u.role === 'parent' || u.userType === 'parent').length,
    [allRegisteredUsers]
  );
  const teacherCount = useMemo(
    () => allRegisteredUsers.filter((u) => u.role === 'teacher').length,
    [allRegisteredUsers]
  );
  const adminCount = useMemo(
    () => allRegisteredUsers.filter((u) => u.role === 'admin').length,
    [allRegisteredUsers]
  );
  const unassignedCount = useMemo(
    () => allRegisteredUsers.filter((u) => !u.classId && u.role !== 'admin').length,
    [allRegisteredUsers]
  );

  const handleCopyInstCode = () => {
    if (!currentInstCode) return;
    navigator.clipboard.writeText(currentInstCode);
    setCopiedInstCode(true);
    setTimeout(() => setCopiedInstCode(false), 2000);
  };

  const handleCopyAdminCode = () => {
    if (!currentAdminCode) return;
    navigator.clipboard.writeText(currentAdminCode);
    setCopiedAdminCode(true);
    setTimeout(() => setCopiedAdminCode(false), 2000);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleCopyShareText = () => {
    if (!currentInstCode) return;
    const text = `Merhaba Sayın Öğretmenim,\n\n"${currentInstName}" kurumumuzun "Sözleşmeli Okuma Takip" sistemine dahil olmak için lütfen aşağıdaki Kurum Kodunu kullanınız:\n\nKurum Kodumuz: ${currentInstCode}\n\nUygulamada "Sınıfım" sekmesine girip bu kodu yapıştırarak hemen sınıfınızı oluşturabilirsiniz.`;
    navigator.clipboard.writeText(text);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2500);
  };

  const handleSaveInstitutionName = async () => {
    if (!nameInput.trim()) return;
    try {
      setIsSavingName(true);
      if (currentUser?.uid) {
        const instId = currentUser.institutionId || currentUser.uid;
        await updateInstitutionName(instId, currentUser.uid, nameInput.trim());
      }
      setCurrentInstName(nameInput.trim());
      setIsEditingName(false);
      onProfileUpdated?.({ institutionName: nameInput.trim() });
      setFeedback({ type: 'success', text: 'Kurum adı güncellendi.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to update institution name:', err);
      setFeedback({ type: 'error', text: 'Kurum adı kaydedilirken bir hata oluştu.' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleGenerateOrRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      setFeedback(null);
      if (currentUser?.uid) {
        if (!currentInstCode) {
          const res = await createInstitution(
            currentUser.uid,
            currentUser.displayName || 'Admin',
            currentUser.email || '',
            currentInstName
          );
          setCurrentInstCode(res.code);
          setCurrentAdminCode(res.adminCode);
          onProfileUpdated?.({
            institutionCode: res.code,
            institutionAdminCode: res.adminCode,
            institutionId: res.id,
          });
          setFeedback({ type: 'success', text: `Yeni kurum kodunuz oluşturuldu: ${res.code}` });
        } else {
          const instId = currentUser.institutionId || currentUser.uid;
          const newCode = await regenerateInstitutionCode(instId, currentUser.uid);
          setCurrentInstCode(newCode);
          onProfileUpdated?.({ institutionCode: newCode });
          setFeedback({ type: 'success', text: `Kurum kodunuz yenilendi: ${newCode}` });
        }
      } else {
        const mockCode = 'KRM-' + Math.floor(100000 + Math.random() * 900000);
        setCurrentInstCode(mockCode);
        setFeedback({ type: 'success', text: `Demo kurum kodu oluşturuldu: ${mockCode}` });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Error generating code:', err);
      setFeedback({ type: 'error', text: 'Kurum kodu oluşturulamadı.' });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteClassroom?.(classToDelete.id, classToDelete.teacherUid);
      setClassToDelete(null);
      if (selectedClassId === classToDelete.id) {
        setSelectedClassId(null);
      }
      setFeedback({ type: 'success', text: `"${classToDelete.name}" sınıfı başarıyla silindi.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Error deleting classroom:', err);
      setFeedback({ type: 'error', text: 'Sınıf silinirken hata oluştu.' });
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
      setFeedback({
        type: 'success',
        text: `"${studentToDelete.user.email || studentToDelete.user.displayName}" hesabı başarıyla silindi.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Error deleting student:', err);
      setFeedback({ type: 'error', text: 'Öğrenci silinirken hata oluştu.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmResetUser = async () => {
    if (!userToReset) return;
    try {
      setIsDeleting(true);
      await onDeleteUser?.(userToReset.uid, userToReset.classId);
      setFeedback({
        type: 'success',
        text: `"${userToReset.email || userToReset.displayName}" hesabı ve e-posta kaydı başarıyla sıfırlandı ve silindi. Artık bu e-posta ile yeniden kayıt olunabilir.`,
      });
      setUserToReset(null);
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      console.error('Error resetting user account:', err);
      setFeedback({
        type: 'error',
        text: err?.message || 'Hesap sıfırlanırken bir hata oluştu.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendPasswordReset = async (email?: string, uid?: string) => {
    if (!email) {
      setFeedback({ type: 'error', text: 'Bu hesabın kayıtlı bir e-posta adresi bulunmuyor.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    try {
      setSendingResetForUid(uid || 'loading');
      await adminSendPasswordResetEmail(email);
      setFeedback({
        type: 'success',
        text: `"${email}" adresine şifre sıfırlama bağlantısı gönderildi.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setFeedback({
        type: 'error',
        text: err?.message || 'Şifre sıfırlama e-postası gönderilemedi.',
      });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSendingResetForUid(null);
    }
  };

  const handleSaveRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    try {
      await setUserRole(targetUser.uid, newRole);
      setFeedback({
        type: 'success',
        text: `"${targetUser.displayName}" kullanıcısının rolü "${newRole === 'teacher' ? 'Öğretmen' : newRole === 'admin' ? 'Yönetici' : 'Veli'}" olarak güncellendi.`,
      });
      setRoleChangingUser(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error('Role change error:', err);
      setFeedback({ type: 'error', text: err?.message || 'Rol güncellenemedi.' });
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // Kurum İstatistikleri
  const overall = useMemo(() => {
    const allStudents: UserProfile[] = [];
    Object.values(studentsByClass).forEach((list) => {
      const studentList = (list || []) as UserProfile[];
      allStudents.push(...studentList);
    });
    return computeClassStats(allStudents);
  }, [studentsByClass]);

  // --------------------------------------------------------------
  // 1. TEK BİR SINIFIN İÇİNE GİRİLDİĞİNDE GÖSTERİLECEK DETAY GÖRÜNÜMÜ
  // --------------------------------------------------------------
  if (selectedClassId) {
    const selectedClassroom = classrooms.find((c) => c.id === selectedClassId);
    const students = studentsByClass[selectedClassId] || [];
    const stats = computeClassStats(students);

    const sortedStudents = [...students].sort((a, b) => {
      const stageA = a.currentWeekStage || 0;
      const stageB = b.currentWeekStage || 0;
      if (stageB !== stageA) return stageB - stageA;
      const minA = a.currentWeekMinutes ?? stageA * 30;
      const minB = b.currentWeekMinutes ?? stageB * 30;
      return minB - minA;
    }).filter((u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const sName = (u.studentName || u.displayName || '').toLowerCase();
      const pName = (u.parentName || '').toLowerCase();
      const mail = (u.email || '').toLowerCase();
      return sName.includes(q) || pName.includes(q) || mail.includes(q);
    });

    return (
      <div className="space-y-4">
        {/* Üst Bar: Geri Dönüş ve Sınıf Başlığı */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              id="btn-back-to-classes"
              onClick={() => {
                setSelectedClassId(null);
                setSearchQuery('');
              }}
              className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer active:scale-95 flex-shrink-0"
              title="Kurum Görünümüne Dön"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {selectedClassroom?.name || 'Sınıf Detayı'}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Öğretmen: {selectedClassroom?.teacherName || 'Atanmamış'} • {stats.totalStudents} Kayıtlı Öğrenci
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {selectedClassroom && (
              <button
                type="button"
                id="btn-delete-current-class"
                onClick={() => setClassToDelete(selectedClassroom)}
                className="p-2 rounded-2xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer active:scale-95"
                title="Bu Sınıfı Kurumdan Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sınıf İstatistik Kartı */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Sınıf İlerleme Durumu</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              Katılım: %{selectedClassroom?.studentTargetCount ? Math.round((stats.totalStudents / selectedClassroom.studentTargetCount) * 100) : 100}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            id="input-class-student-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Öğrenci, veli veya e-posta ile ara..."
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

                    <div className="text-[10px] font-bold text-slate-500 truncate mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>Veli: <strong className="text-slate-700">{pName}</strong></span>
                      {user.email && (
                        <span className="text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" />
                          <span>{user.email}</span>
                        </span>
                      )}
                      <span>• {formatTimeAgo(user.updatedAt)}</span>
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
                      id={`btn-reset-student-${user.uid}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserToReset(user);
                      }}
                      title="Bu e-postayı ve hesabı tamamen sıfırla/sil"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Sıfırla & Sil (Student / Email Reset Modal) */}
        {userToReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <RotateCcw className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="text-base font-black text-slate-900">
                  E-Postayı &amp; Üyeliği Sıfırla
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Yanlışlıkla açılan veya silinmesi gereken bu kaydı sistemden tamamen kaldıracaksınız.
                </p>
              </div>

              <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200 text-xs text-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="font-mono font-black text-rose-900 text-xs truncate">
                    {userToReset.email || '(E-posta belirtilmemiş)'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 pl-6 space-y-0.5">
                  <div>Kullanıcı: <strong className="text-slate-900">{userToReset.displayName || 'İsimsiz'}</strong></div>
                  {userToReset.studentName && <div>Öğrenci: <strong className="text-slate-900">{userToReset.studentName}</strong></div>}
                  {userToReset.className && <div>Sınıf: <strong className="text-slate-900">{userToReset.className}</strong></div>}
                </div>
                <div className="text-[11px] text-rose-700 bg-white/80 p-2 rounded-xl border border-rose-200 font-medium">
                  ⚠️ <strong>Önemli:</strong> Bu işlem yapıldığında bu e-posta adresi veritabanından tamamen silinir ve serbest kalır. Kullanıcı aynı e-posta ile sıfırdan yeniden üye olabilir.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  id="btn-cancel-reset-user"
                  onClick={() => setUserToReset(null)}
                  disabled={isDeleting}
                  className="btn-3d-white py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  id="btn-confirm-reset-user"
                  onClick={handleConfirmResetUser}
                  disabled={isDeleting}
                  className="py-2.5 px-4 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Sıfırlanıyor...' : 'Evet, Sıfırla & Sil'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Sınıf Silme */}
        {classToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="text-base font-black text-slate-900">Sınıfı Sil?</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  &quot;{classToDelete.name}&quot; sınıfını ve kurum bağlantısını silmek istediğinize emin misiniz?
                </p>
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
      </div>
    );
  }

  // --------------------------------------------------------------
  // 2. ANA GÖRÜNÜM (TABS: Sınıflar vs. Kayıtlı E-Postalar & Üyelikler)
  // --------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* 1. ÜST PANEL: KURUM BAŞLIĞI */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 flex-shrink-0">
              <Building2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Kurum Yönetim Paneli
                </span>
                {isDemo && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Demo Modu
                  </span>
                )}
              </div>

              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="text"
                    id="input-inst-name-edit"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Okul veya Kurum Adı..."
                    className="text-sm font-black text-slate-900 border border-slate-300 rounded-xl px-2.5 py-1 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    autoFocus
                  />
                  <button
                    type="button"
                    id="btn-save-inst-name"
                    onClick={handleSaveInstitutionName}
                    disabled={isSavingName}
                    className="btn-3d-rose px-3 py-1 rounded-xl text-xs font-black cursor-pointer active:scale-95"
                  >
                    {isSavingName ? '...' : 'Kaydet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setNameInput(currentInstName);
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {currentInstName}
                  </h2>
                  <button
                    type="button"
                    id="btn-edit-inst-name"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Kurum Adını Düzenle"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. KURUM KODU KARTI */}
      <div className="bg-white rounded-3xl border-2 border-rose-100 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <KeyRound className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight flex items-center gap-1.5">
                <span>Kurum Kodu &amp; Öğretmen Katılımı</span>
                {currentInstCode && (
                  <span className="text-[9.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    Aktif Kod
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Öğretmenler &quot;Sınıfım&quot; sekmesinden bu kodu girerek okulunuza bağlanırlar.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-generate-inst-code"
            onClick={handleGenerateOrRegenerateCode}
            disabled={isGeneratingCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
            title={currentInstCode ? 'Yeni bir Kurum Kodu üret' : 'Kurum Kodu oluştur'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingCode ? 'animate-spin text-rose-600' : ''}`} />
            <span>{currentInstCode ? 'Yeni Kod Üret' : 'Kod Oluştur'}</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {currentInstCode ? (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Kurum Kodu Kutusu */}
              <div className="bg-rose-50/90 p-3 rounded-2xl border border-rose-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                    Öğretmen Katılım Kodu
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-rose-900 tracking-wider">
                    {currentInstCode}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-copy-inst-code-main"
                  onClick={handleCopyInstCode}
                  className="btn-3d-rose px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Kurum Kodunu Kopyala"
                >
                  {copiedInstCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      <span>Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>

              {/* Admin Yetki Devir Kodu Kutusu */}
              {currentAdminCode && (
                <div className="bg-indigo-50/90 p-3 rounded-2xl border border-indigo-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                      Admin Yetki Kodu
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-indigo-900 tracking-wider">
                      {currentAdminCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    id="btn-copy-admin-code-main"
                    onClick={handleCopyAdminCode}
                    className="btn-3d-palette-primary px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Admin Yetki Kodunu Kopyala"
                  >
                    {copiedAdminCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        <span>Kopyalandı</span>
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

            {/* Öğretmenler İçin Hızlı Davet Paylaşım Butonu */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex-wrap">
              <span className="text-[11px] text-slate-600 font-medium">
                Öğretmenleriniz &quot;Sınıfım&quot; sekmesine girip bu kodu yazdıklarında sınıfları anında burada listelenir.
              </span>
              <button
                type="button"
                id="btn-copy-share-invite"
                onClick={handleCopyShareText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                {copiedShareText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    <span>Mesaj Kopyalandı!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Öğretmen Davet Metnini Kopyala</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/70 text-center space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              Okulunuza ait henüz bir kurum kodu bulunmuyor. Öğretmenlerinizi sisteminize dahil etmek için hemen bir kurum kodu oluşturun.
            </p>
            <button
              type="button"
              id="btn-create-inst-code-primary"
              onClick={handleGenerateOrRegenerateCode}
              disabled={isGeneratingCode}
              className="btn-3d-rose px-4 py-2 rounded-2xl text-xs font-black inline-flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGeneratingCode ? 'Kod Oluşturuluyor...' : 'Kurum Kodu Oluştur ve Başlat'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. ANA TAB SEÇİCİ: Sınıflar & Öğretmenler vs. Kayıtlı E-Postalar & Üyelikler */}
      <div className="flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90 gap-1.5 shadow-inner">
        <button
          type="button"
          id="tab-admin-classes"
          onClick={() => setAdminSection('classrooms')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            adminSection === 'classrooms'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className={`w-4 h-4 ${adminSection === 'classrooms' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Sınıflar &amp; Öğretmenler ({classrooms.length})</span>
        </button>

        <button
          type="button"
          id="tab-admin-registered-emails"
          onClick={() => setAdminSection('registered_emails')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            adminSection === 'registered_emails'
              ? 'bg-white text-rose-600 shadow-sm border border-rose-200 ring-1 ring-rose-100'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className={`w-4 h-4 ${adminSection === 'registered_emails' ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>Kayıtlı E-Postalar ({allRegisteredUsers.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECTION A: SINIFLAR & ÖĞRETMENLER GÖRÜNÜMÜ                     */}
      {/* ============================================================== */}
      {adminSection === 'classrooms' && (
        <div className="space-y-4">
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
                  Yukarıdaki <span className="font-mono font-black text-rose-600">{currentInstCode || 'Kurum Kodunu'}</span> öğretmenlerinizle
                  paylaşın; öğretmenler bu kodla bağlanıp kendi sınıflarını oluşturduğunda burada listelenecekler.
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
                        Ortalama: {stats.avgMinutes} dk
                      </span>
                      {hasCritical && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>{stats.criticalCount} Kırmızı</span>
                        </span>
                      )}
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {stats.safeCount} Güvenli
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION B: KAYITLI E-POSTALAR & HESAP YÖNETİMİ GÖRÜNÜMÜ        */}
      {/* ============================================================== */}
      {adminSection === 'registered_emails' && (
        <div className="space-y-3.5">
          {/* Açıklayıcı Bilgilendirme Kartı */}
          <div className="bg-gradient-to-r from-rose-50/80 to-indigo-50/80 rounded-3xl border border-rose-200/90 p-4 shadow-sm space-y-1.5">
            <div className="flex items-center gap-2 text-rose-700 font-black text-xs sm:text-sm">
              <Mail className="w-4 h-4" />
              <span>Kayıtlı E-Postalar &amp; Hesap Sıfırlama Merkezi</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Sisteme kayıt olan tüm e-posta adreslerini buradan inceleyebilirsiniz. Yanlışlıkla açılan veya hatalı e-posta ile üye olunan bir hesap olduğunda, yanındaki <strong>&quot;Sıfırla &amp; Sil&quot;</strong> butonunu kullanarak hesabı veritabanından tamamen silebilirsiniz. Böylece o e-posta adresi serbest kalır ve kullanıcı aynı e-posta ile sıfırdan yeniden kayıt olabilir.
            </p>
          </div>

          {/* Arama & Rol Filtreleri */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-registered-email-search"
                value={emailSearchQuery}
                onChange={(e) => setEmailSearchQuery(e.target.value)}
                placeholder="E-posta adresi, kullanıcı adı, öğrenci veya sınıf ara..."
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-2xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-bold shadow-xs"
              />
            </div>

            {/* Rol Filtre Butonları */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                type="button"
                id="filter-role-all"
                onClick={() => setEmailRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer transition-all ${
                  emailRoleFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tümü ({allRegisteredUsers.length})
              </button>
              <button
                type="button"
                id="filter-role-parents"
                onClick={() => setEmailRoleFilter('parent')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer transition-all ${
                  emailRoleFilter === 'parent'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50'
                }`}
              >
                Veliler ({parentCount})
              </button>
              <button
                type="button"
                id="filter-role-teachers"
                onClick={() => setEmailRoleFilter('teacher')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer transition-all ${
                  emailRoleFilter === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50'
                }`}
              >
                Öğretmenler ({teacherCount})
              </button>
              <button
                type="button"
                id="filter-role-admins"
                onClick={() => setEmailRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer transition-all ${
                  emailRoleFilter === 'admin'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-violet-50'
                }`}
              >
                Yöneticiler ({adminCount})
              </button>
              {unassignedCount > 0 && (
                <button
                  type="button"
                  id="filter-role-unassigned"
                  onClick={() => setEmailRoleFilter('unassigned')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer transition-all ${
                    emailRoleFilter === 'unassigned'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  Sınıfsız ({unassignedCount})
                </button>
              )}
            </div>
          </div>

          {/* Kayıtlı Kullanıcı ve E-Posta Kartları */}
          <div className="space-y-2.5">
            {filteredRegisteredUsers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-2 shadow-sm">
                <Mail className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {emailSearchQuery ? 'Aramanıza uygun kayıtlı e-posta bulunamadı.' : 'Sistemde kayıtlı kullanıcı bulunmuyor.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Yeni kullanıcılar üye oldukça burada anlık olarak listelenecektir.
                </p>
              </div>
            ) : (
              filteredRegisteredUsers.map((user) => {
                const isCurrentAdminAccount = user.uid === currentUser?.uid;
                const isTeacherRole = user.role === 'teacher';
                const isAdminRole = user.role === 'admin';
                const isParentRole = !isTeacherRole && !isAdminRole;

                return (
                  <div
                    key={user.uid}
                    className={`bg-white rounded-3xl border p-3.5 sm:p-4 shadow-sm transition-all hover:shadow-md ${
                      isCurrentAdminAccount
                        ? 'border-indigo-200 bg-indigo-50/20'
                        : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Rol İkonu */}
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                            isAdminRole
                              ? 'bg-violet-100 text-violet-700 border-violet-200'
                              : isTeacherRole
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isAdminRole ? (
                            <ShieldCheck className="w-5 h-5" />
                          ) : isTeacherRole ? (
                            <GraduationCap className="w-5 h-5" />
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                        </div>

                        {/* Bilgiler */}
                        <div className="min-w-0 space-y-1">
                          {/* E-Posta Adresi & Kopyalama */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-xs sm:text-sm text-slate-900 truncate">
                              {user.email || '(E-posta belirtilmemiş)'}
                            </span>
                            {user.email && (
                              <button
                                type="button"
                                onClick={() => handleCopyEmail(user.email!)}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="E-postayı Kopyala"
                              >
                                {copiedEmail === user.email ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Rol Rozeti */}
                            <span
                              className={`text-[9.5px] font-black px-2 py-0.5 rounded-md leading-none border ${
                                isAdminRole
                                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                                  : isTeacherRole
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {isAdminRole ? 'Yönetici' : isTeacherRole ? 'Öğretmen' : 'Veli'}
                            </span>

                            {isCurrentAdminAccount && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                Sizin Hesabınız
                              </span>
                            )}
                          </div>

                          {/* İsim & Detaylar */}
                          <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                            <span>Ad: <strong className="text-slate-900">{user.displayName || 'İsimsiz'}</strong></span>
                            {user.studentName && (
                              <span>• Öğrenci: <strong className="text-slate-800">{user.studentName}</strong></span>
                            )}
                            {user.className ? (
                              <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                {user.className}
                              </span>
                            ) : !isAdminRole ? (
                              <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                Henüz bir sınıfa katılmadı
                              </span>
                            ) : null}
                          </div>

                          {/* İlerleme Bilgisi (Veli ise) */}
                          {isParentRole && (user.currentWeekMinutes !== undefined || user.currentWeekStage !== undefined) && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span>Haftalık: {user.currentWeekMinutes ?? (user.currentWeekStage || 0) * 30} dk okuma</span>
                              <span>• {user.currentWeekStage || 0}. Kademe</span>
                              {user.updatedAt && <span>• Son İşlem: {formatTimeAgo(user.updatedAt)}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sağ Taraf: Admin Aksiyon Butonları */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Şifre Sıfırlama Gönder Butonu */}
                        {user.email && (
                          <button
                            type="button"
                            id={`btn-send-reset-${user.uid}`}
                            onClick={() => handleSendPasswordReset(user.email, user.uid)}
                            disabled={sendingResetForUid === user.uid}
                            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-bold"
                            title="Kullanıcıya Şifre Sıfırlama Bağlantısı Gönder"
                          >
                            <Send className={`w-3.5 h-3.5 ${sendingResetForUid === user.uid ? 'animate-bounce text-indigo-600' : ''}`} />
                            <span className="hidden sm:inline text-[10px]">Şifre Sıfırla</span>
                          </button>
                        )}

                        {/* Rol Değiştirme Butonu (Öğretmen <-> Veli) */}
                        {!isAdminRole && (
                          <button
                            type="button"
                            id={`btn-change-role-${user.uid}`}
                            onClick={() => setRoleChangingUser(user)}
                            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 transition-all cursor-pointer active:scale-95"
                            title="Kullanıcı Rolünü Değiştir (Veli / Öğretmen)"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Sıfırla & Sil Butonu */}
                        <button
                          type="button"
                          id={`btn-reset-and-delete-${user.uid}`}
                          onClick={() => setUserToReset(user)}
                          disabled={isCurrentAdminAccount}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isCurrentAdminAccount
                              ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400'
                              : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 shadow-xs'
                          }`}
                          title={
                            isCurrentAdminAccount
                              ? 'Kendi yönetici hesabınızı silemezsiniz'
                              : 'Bu e-postayı ve hesabı tamamen sıfırla/sil'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px]">Sıfırla &amp; Sil</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: E-POSTAYI & ÜYELİĞİ SIFIRLA / SİL ONAY MODALI           */}
      {/* ============================================================== */}
      {userToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <RotateCcw className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base sm:text-lg font-black text-slate-900">
                E-Postayı ve Hesabı Sıfırla &amp; Sil
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Yanlışlıkla açılan veya sıfırlanması istenen bu e-posta kaydını sistemden tamamen kaldıracaksınız.
              </p>
            </div>

            {/* Detay Kutusu */}
            <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="font-mono font-black text-rose-900 text-xs sm:text-sm truncate">
                  {userToReset.email || '(E-posta belirtilmemiş)'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 pl-6 space-y-0.5 font-medium">
                <div>Kullanıcı: <strong className="text-slate-900">{userToReset.displayName || 'İsimsiz'}</strong></div>
                <div>Rol: <strong className="text-slate-900">{userToReset.role === 'teacher' ? 'Öğretmen' : userToReset.role === 'admin' ? 'Yönetici' : 'Veli'}</strong></div>
                {userToReset.studentName && <div>Öğrenci: <strong className="text-slate-900">{userToReset.studentName}</strong></div>}
                {userToReset.className && <div>Sınıf: <strong className="text-slate-900">{userToReset.className}</strong></div>}
              </div>

              <div className="text-[11px] text-rose-800 bg-white/90 p-2.5 rounded-xl border border-rose-200 leading-relaxed font-medium space-y-1">
                <p>
                  ✅ <strong>Bu işlem sonucunda:</strong>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                  <li>Bu hesap veritabanından tamamen silinir.</li>
                  <li>E-posta adresi sistemde serbest kalır ve sıfırlanır.</li>
                  <li>Kullanıcı veya siz aynı e-posta ile sıfırdan yeniden üye olabilirsiniz.</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                id="btn-cancel-reset-user-modal"
                onClick={() => setUserToReset(null)}
                disabled={isDeleting}
                className="btn-3d-white py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                id="btn-confirm-reset-user-modal"
                onClick={handleConfirmResetUser}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Sıfırlanıyor...' : 'Evet, Sıfırla & Sil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ROL DEĞİŞTİRME MODALI (Veli <-> Öğretmen)               */}
      {/* ============================================================== */}
      {roleChangingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-indigo-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-200">
              <UserCheck className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900">Kullanıcı Rolünü Değiştir</h4>
              <p className="text-xs text-slate-500">
                Yanlışlıkla farklı bir rol seçilerek kaydolunmuşsa buradan düzeltebilirsiniz.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700">
              <div className="font-bold text-slate-900 truncate">{roleChangingUser.displayName}</div>
              <div className="font-mono text-[10.5px] text-indigo-700 truncate">{roleChangingUser.email}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Mevcut Rol: <strong>{roleChangingUser.role === 'teacher' ? 'Öğretmen' : 'Veli'}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSaveRoleChange(roleChangingUser, 'parent')}
                className={`w-full p-2.5 rounded-2xl text-xs font-black border transition-all text-left flex items-center justify-between ${
                  roleChangingUser.role === 'parent'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <span>Veli Hesabına Dönüştür</span>
                {roleChangingUser.role === 'parent' && <Check className="w-4 h-4 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => handleSaveRoleChange(roleChangingUser, 'teacher')}
                className={`w-full p-2.5 rounded-2xl text-xs font-black border transition-all text-left flex items-center justify-between ${
                  roleChangingUser.role === 'teacher'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <span>Öğretmen Hesabına Dönüştür</span>
                {roleChangingUser.role === 'teacher' && <Check className="w-4 h-4 text-indigo-600" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRoleChangingUser(null)}
              className="w-full py-2.5 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SINIF SİLME MODALI                                      */}
      {/* ============================================================== */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900">Sınıfı Sil?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                &quot;{classToDelete.name}&quot; sınıfını ve kurum bağlantısını silmek istediğinize emin misiniz?
              </p>
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
    </div>
  );
};
