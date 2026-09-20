import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  createInstitution,
  updateInstitutionName,
  joinInstitutionWithCode,
  joinInstitutionAsAdmin,
  ensureInstitutionAdminCode,
  createClassroom,
  updateClassroom,
  joinClassroomWithCode,
  addStudentToClassroom,
} from '../lib/firebase';
import {
  GraduationCap,
  Users,
  KeyRound,
  UserCheck,
  Sparkles,
  School,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
  ShieldAlert,
  Check,
  Copy,
  UserPlus,
} from 'lucide-react';

interface ClassroomSetupModalProps {
  currentUser: UserProfile;
  onCompleted: () => void;
  onCancel?: () => void;
  canCancel?: boolean;
  /** true when currentUser is a local "Giriş Yapmadan İncele" demo profile */
  isDemo?: boolean;
  /** Used only in demo mode to reflect changes in the app's local profile */
  onDemoProfileUpdate?: (updates: Partial<UserProfile>) => void;
  /** Used when teacher adds a student in demo mode to update student list */
  onAddStudent?: (student: UserProfile) => void;
}

function generateDemoCode(prefix: string): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export const ClassroomSetupModal: React.FC<ClassroomSetupModalProps> = ({
  currentUser,
  onCompleted,
  onCancel,
  canCancel = false,
  isDemo = false,
  onDemoProfileUpdate,
  onAddStudent,
}) => {
  const isAdminUser = currentUser.role === 'admin';
  const isTeacherUser = currentUser.role === 'teacher';
  const isParentUser = currentUser.role === 'parent' || (!isAdminUser && !isTeacherUser);
  const isEstablishedUser = Boolean(canCancel && (isTeacherUser || isAdminUser || isParentUser));

  // Initial role determination: Veli hesapları ASLA admin veya öğretmen olarak başlatılmaz
  const initialRole: 'admin' | 'teacher' | 'parent' = isAdminUser
    ? 'admin'
    : isTeacherUser
    ? 'teacher'
    : 'parent';

  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'parent'>(
    isParentUser ? 'parent' : initialRole
  );

  // ADMIN: Kurum Alanları
  const [adminSubMode, setAdminSubMode] = useState<'create' | 'join'>('create');
  const [institutionName, setInstitutionName] = useState(currentUser.institutionName || 'Cumhuriyet İlkokulu');
  const [createdInstitutionCode, setCreatedInstitutionCode] = useState<string | null>(currentUser.institutionCode || null);
  const [createdAdminCode, setCreatedAdminCode] = useState<string | null>(currentUser.institutionAdminCode || null);
  const [adminCodeInput, setAdminCodeInput] = useState('');

  // ÖĞRETMEN: Kurum & Sınıf Alanları
  const [teacherInstitutionCode, setTeacherInstitutionCode] = useState(currentUser.institutionCode || '');
  const [connectedInstitutionName, setConnectedInstitutionName] = useState(currentUser.institutionName || '');
  const [connectedInstitutionId, setConnectedInstitutionId] = useState(currentUser.institutionId || '');
  const [isInstitutionConnected, setIsInstitutionConnected] = useState(Boolean(currentUser.institutionId));
  const [className, setClassName] = useState(currentUser.className || '4-A Sınıfı');
  const [studentTargetCount, setStudentTargetCount] = useState<number>(25);
  const [copiedClassCode, setCopiedClassCode] = useState(false);

  // VELİ: Sınıf Kodu ile Katılma
  const [classCode, setClassCode] = useState(currentUser.classCode || '');
  const [studentName, setStudentName] = useState(currentUser.studentName || '');
  const [parentName, setParentName] = useState(currentUser.parentName || currentUser.displayName || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generatingAdminCode, setGeneratingAdminCode] = useState(false);

  const activeClassCode = currentUser.classCode || classCode || 'SINIF4A';

  const handleCopyClassCode = () => {
    if (!activeClassCode) return;
    navigator.clipboard.writeText(activeClassCode);
    setCopiedClassCode(true);
    setTimeout(() => setCopiedClassCode(false), 2000);
  };

  // --- ADMIN: Admin Kodu Oluşturma ---
  const handleGenerateAdminCodeForExistingInstitution = async () => {
    if (!currentUser.institutionId) return;
    try {
      setGeneratingAdminCode(true);
      setError(null);
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        const code = generateDemoCode('ADM');
        setCreatedAdminCode(code);
        onDemoProfileUpdate?.({ institutionAdminCode: code });
        return;
      }
      const code = await ensureInstitutionAdminCode(currentUser.institutionId, currentUser.uid);
      setCreatedAdminCode(code);
    } catch (err: any) {
      console.error('Ensure admin code error:', err);
      setError(err.message || 'Admin Kodu oluşturulurken bir hata oluştu.');
    } finally {
      setGeneratingAdminCode(false);
    }
  };

  // --- ADMIN: Kurum Oluştur / Güncelle ---
  const handleAdminCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim()) {
      setError('Lütfen bir kurum / okul adı girin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        if (currentUser.institutionId) {
          onDemoProfileUpdate?.({ institutionName: institutionName.trim() });
          setSuccessMsg(`Kurum adı güncellendi: "${institutionName.trim()}".`);
        } else {
          const code = createdInstitutionCode || generateDemoCode('KRM');
          const adminCode = createdAdminCode || generateDemoCode('ADM');
          setCreatedInstitutionCode(code);
          setCreatedAdminCode(adminCode);
          onDemoProfileUpdate?.({
            role: 'admin',
            userType: 'teacher',
            institutionId: 'demo-institution-manual',
            institutionCode: code,
            institutionAdminCode: adminCode,
            institutionName: institutionName.trim(),
          });
          setSuccessMsg(`Kurum oluşturuldu! Kurum Kodu: ${code} — Admin Kodu: ${adminCode}`);
        }
        setTimeout(() => onCompleted(), 1200);
        return;
      }

      if (currentUser.institutionId) {
        const inst = await updateInstitutionName(
          currentUser.institutionId,
          currentUser.uid,
          institutionName.trim()
        );
        setSuccessMsg(`Kurum adı güncellendi: "${inst.name}". Kurum Kodunuz: ${createdInstitutionCode}`);
        setTimeout(() => onCompleted(), 1200);
      } else {
        const inst = await createInstitution(
          currentUser.uid,
          currentUser.displayName || 'Admin',
          currentUser.email,
          institutionName.trim()
        );
        setCreatedInstitutionCode(inst.code);
        setCreatedAdminCode(inst.adminCode);
        setSuccessMsg(`Kurum başarıyla oluşturuldu! Kurum Kodunuz: ${inst.code} — Admin Kodunuz: ${inst.adminCode}`);
        setTimeout(() => onCompleted(), 1200);
      }
    } catch (err: any) {
      console.error('Create/update institution error:', err);
      setError(err.message || 'Kurum kaydedilirken bir hata meydana geldi.');
    } finally {
      setLoading(false);
    }
  };

  // --- ADMIN: Admin Kodu ile Katıl ---
  const handleAdminJoinAsCoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCodeInput.trim()) {
      setError('Lütfen diğer yöneticinizden aldığınız Admin Kodunu girin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        const code = adminCodeInput.trim().toUpperCase();
        const kurumKodu = currentUser.institutionCode || generateDemoCode('KRM');
        setCreatedInstitutionCode(kurumKodu);
        setCreatedAdminCode(code);
        onDemoProfileUpdate?.({
          role: 'admin',
          userType: 'teacher',
          institutionId: currentUser.institutionId || 'demo-institution-manual',
          institutionCode: kurumKodu,
          institutionAdminCode: code,
          institutionName: currentUser.institutionName || institutionName.trim(),
        });
        setSuccessMsg(`"${code}" Admin Koduyla kuruma katıldınız.`);
        setTimeout(() => onCompleted(), 1200);
        return;
      }

      const inst = await joinInstitutionAsAdmin(currentUser.uid, adminCodeInput.trim());
      setCreatedInstitutionCode(inst.code);
      setCreatedAdminCode(inst.adminCode);
      setSuccessMsg(`Tebrikler! "${inst.name}" kurumuna admin olarak katıldınız.`);
      setTimeout(() => onCompleted(), 1200);
    } catch (err: any) {
      console.error('Join as admin error:', err);
      setError(err.message || 'Admin olarak katılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // --- ÖĞRETMEN: Kurum Kodunu Doğrulayıp Bağlanma ---
  const handleTeacherConnectInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherInstitutionCode.trim()) {
      setError('Lütfen yöneticinizden aldığınız Kurum Kodunu girin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        const name = currentUser.institutionName || 'Cumhuriyet İlkokulu';
        setConnectedInstitutionName(name);
        setConnectedInstitutionId(currentUser.institutionId || 'demo-institution-manual');
        setIsInstitutionConnected(true);
        setSuccessMsg(`"${name}" kurumuna bağlanıldı.`);
        return;
      }

      const inst = await joinInstitutionWithCode(currentUser.uid, teacherInstitutionCode.trim());
      setConnectedInstitutionName(inst.name);
      setConnectedInstitutionId(inst.id);
      setIsInstitutionConnected(true);
      setSuccessMsg(`Tebrikler! "${inst.name}" kurumuna bağlandınız.`);
    } catch (err: any) {
      console.error('Connect institution error:', err);
      setError(err.message || 'Kuruma bağlanırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // --- ÖĞRETMEN: Sınıf Oluşturma / Güncelleme ---
  const handleTeacherSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setError('Lütfen bir sınıf adı girin (Örn: 4-A Sınıfı).');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const institutionPayload =
        isInstitutionConnected && teacherInstitutionCode.trim()
          ? {
              ...(connectedInstitutionId ? { id: connectedInstitutionId } : {}),
              code: teacherInstitutionCode.trim().toUpperCase(),
              name: connectedInstitutionName || '',
            }
          : undefined;

      // Sınıf zaten varsa güncelle
      if (currentUser.classId) {
        if (isDemo) {
          await new Promise((r) => setTimeout(r, 400));
          onDemoProfileUpdate?.({
            className: className.trim(),
            institutionCode: teacherInstitutionCode.trim().toUpperCase() || undefined,
            institutionName: connectedInstitutionName || undefined,
          });
          setSuccessMsg(`Sınıf bilgileriniz güncellendi: "${className.trim()}"`);
          setTimeout(() => onCompleted(), 1200);
          return;
        }

        await updateClassroom(
          currentUser.classId,
          currentUser.uid,
          className.trim(),
          studentTargetCount,
          institutionPayload
        );
        setSuccessMsg(`Sınıf bilgileriniz başarıyla güncellendi!`);
        setTimeout(() => onCompleted(), 1200);
        return;
      }

      // Yeni sınıf oluşturma
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        const code = currentUser.classCode || generateDemoCode('SNF');
        onDemoProfileUpdate?.({
          role: 'teacher',
          userType: 'teacher',
          classId: 'demo-class-manual',
          classCode: code,
          className: className.trim(),
        });
        setSuccessMsg(`Sınıfınız oluşturuldu! Sınıf Kodunuz: ${code}`);
        setTimeout(() => onCompleted(), 1200);
        return;
      }

      const classroom = await createClassroom(
        currentUser.uid,
        currentUser.displayName || 'Öğretmen',
        currentUser.email,
        className.trim(),
        studentTargetCount,
        institutionPayload
      );
      setSuccessMsg(`Sınıfınız başarıyla oluşturuldu! Sınıf Kodunuz: ${classroom.code}`);
      setTimeout(() => onCompleted(), 1200);
    } catch (err: any) {
      console.error('Save class error:', err);
      setError(err.message || 'Sınıf kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // --- VELİ: Sınıf Kodu ile Katılma (Yalnızca yeni veli hesapları için) ---
  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Güvenlik Kilidi: Öğretmen veya Admin hesabı olan biri bu akışla kendini veliye dönüştüremez
    if (isTeacherUser || isAdminUser) {
      setError(
        'Öğretmen veya Yönetici hesabı ile veli olarak sınıfa katılamazsınız! Hesabınız öğretmen yetkisine sahiptir.'
      );
      return;
    }

    if (!classCode.trim()) {
      setError('Lütfen öğretmeninizin verdiği 6 haneli sınıf kodunu girin.');
      return;
    }
    if (!studentName.trim()) {
      setError('Lütfen öğrencinizin adını ve soyadını girin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        onDemoProfileUpdate?.({
          role: 'parent',
          userType: 'parent',
          classId: currentUser.classId || 'demo-class-manual',
          classCode: classCode.trim().toUpperCase(),
          studentName: studentName.trim(),
          parentName: parentName.trim(),
        });
        setSuccessMsg(`Tebrikler! Sınıfa veli olarak katıldınız.`);
        setTimeout(() => onCompleted(), 1200);
        return;
      }

      const classroom = await joinClassroomWithCode(
        currentUser.uid,
        classCode.trim(),
        studentName.trim(),
        parentName.trim()
      );
      setSuccessMsg(`Tebrikler! "${classroom.name}" sınıfına başarıyla katıldınız.`);
      setTimeout(() => onCompleted(), 1200);
    } catch (err: any) {
      console.error('Join class error:', err);
      setError(err.message || 'Sınıfa katılırken bir hata oluştu. Kodu kontrol ediniz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Modal Başlığı */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
            {isTeacherUser || selectedRole === 'teacher' ? (
              <GraduationCap className="w-6 h-6 text-indigo-600" />
            ) : isAdminUser || selectedRole === 'admin' ? (
              <Building2 className="w-6 h-6 text-rose-600" />
            ) : (
              <Users className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {isEstablishedUser && isTeacherUser
              ? 'Öğretmen & Sınıf Ayarları'
              : isEstablishedUser && isAdminUser
              ? 'Kurum Yönetimi & Ayarlar'
              : isParentUser
              ? 'Sınıfı Değiştir & Öğrenci Bilgileri'
              : selectedRole === 'admin'
              ? 'Kurum Yönetimi & Kurum Kodu'
              : selectedRole === 'teacher'
              ? 'Öğretmen: Kuruma Bağlan & Sınıf Aç'
              : 'Veli: Sınıf Kodu ile Katıl'}
          </h2>
          
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isEstablishedUser && isTeacherUser
              ? 'Sınıf bilgilerinizi ve bağlı olduğunuz kurum kodunu buradan güncelleyebilirsiniz.'
              : isEstablishedUser && isAdminUser
              ? 'Kurum adını düzenleyin ve öğretmenleriniz için kurum kodunu görüntüleyin.'
              : isParentUser
              ? 'Öğretmeninizden aldığınız 6 haneli yeni sınıf kodunu girerek sınıfınızı değiştirebilirsiniz.'
              : selectedRole === 'admin'
              ? 'Yeni kurum oluşturun ya da bir Admin Kodu ile mevcut kuruma yönetici olarak katılın.'
              : selectedRole === 'teacher'
              ? 'Öğretmen kurum kodunu girer, ardından kendi sınıf kodunu oluşturur.'
              : 'Veli, öğretmenden aldığı sınıf kodunu girerek çocuğunu bağlar.'}
          </p>
        </div>

        {/* 1. DURUM: KULLANICI ZATEN AKTİF BİR ÖĞRETMEN (Sınıf & Kurum Ayarları) */}
        {isEstablishedUser && isTeacherUser ? (
          <div className="space-y-4">
            {/* Öğretmen Hesap Rozeti & Sınıf Kodu Çubuğu */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-2xs flex-shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <span>Öğretmen Hesabı</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-200/80 text-indigo-900">
                      Aktif
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-700 font-medium truncate">
                    {className || currentUser.className || 'Sınıfınız'}
                  </div>
                </div>
              </div>

              {activeClassCode && (
                <button
                  type="button"
                  onClick={handleCopyClassCode}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-all text-xs font-bold shadow-2xs active:scale-95 cursor-pointer flex-shrink-0"
                >
                  <span className="text-[10px] text-slate-500 font-medium">Kod:</span>
                  <span className="font-mono font-black">{activeClassCode}</span>
                  {copiedClassCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              )}
            </div>

            {/* Geri Bildirim Mesajları */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Sınıf & Kurum Bilgileri */}
            <div className="space-y-4">
              {/* 1. Adım: Kurum Kodu */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Bağlı Kurum Kodu
                  </span>
                  {isInstitutionConnected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      Bağlandı
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={teacherInstitutionCode}
                    onChange={(e) => setTeacherInstitutionCode(e.target.value.toUpperCase())}
                    placeholder="Örn: KRM-8842"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono uppercase tracking-wider font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleTeacherConnectInstitution}
                    disabled={loading || !teacherInstitutionCode.trim()}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <span>Kuruma Bağlan</span>
                  </button>
                </div>

                {connectedInstitutionName ? (
                  <p className="text-[11px] font-bold text-emerald-700">
                    Bağlı Kurum: {connectedInstitutionName}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Okulunuzun admininden aldığınız Kurum Kodunu girerek okulunuza bağlanabilirsiniz.
                  </p>
                )}
              </div>

              {/* 2. Adım: Sınıf Adı ve Hedef Öğrenci Sayısı */}
              <form onSubmit={handleTeacherSaveClass} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Sınıf Adı / Şube:</label>
                  <input
                    type="text"
                    id="input-class-name"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Örn: 4-A Sınıfı"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Beklenen Öğrenci Sayısı:</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={studentTargetCount}
                    onChange={(e) => setStudentTargetCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {canCancel && onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="btn-3d-white flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold cursor-pointer"
                    >
                      Kapat
                    </button>
                  )}
                  <button
                    type="submit"
                    id="btn-save-class"
                    disabled={loading}
                    className="btn-3d-indigo flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black cursor-pointer disabled:opacity-60"
                  >
                    <span>{loading ? 'Kaydediliyor...' : 'Sınıf Bilgilerini Güncelle'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : isEstablishedUser && isAdminUser ? (
          /* 2. DURUM: KULLANICI ZATEN AKTİF BİR ADMİN */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/80 border border-rose-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                    <span>Admin Hesabı</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-200/80 text-rose-900">
                      Yönetici
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-700 font-medium">
                    {institutionName || 'Kurum Yönetimi'}
                  </div>
                </div>
              </div>
            </div>

            {/* Geri Bildirim Mesajları */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAdminCreateInstitution} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-rose-600" />
                  Okul / Kurum Adı:
                </label>
                <input
                  type="text"
                  id="input-institution-name"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Örn: Atatürk İlkokulu, Bilim Koleji..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  required
                />
              </div>

              {createdInstitutionCode && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-1">
                  <p className="text-xs font-bold text-rose-800">Kurum Kodunuz (öğretmenler için):</p>
                  <p className="text-xl font-mono font-black text-rose-700 tracking-wider">
                    {createdInstitutionCode}
                  </p>
                  <p className="text-[10px] text-rose-600">
                    Öğretmenleriniz bu kodu girerek kuruma bağlanacaktır.
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                {canCancel && onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="btn-3d-white flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold cursor-pointer"
                  >
                    Kapat
                  </button>
                )}
                <button
                  type="submit"
                  id="btn-update-institution"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 cursor-pointer disabled:opacity-60 transition-all"
                >
                  <span>{loading ? 'Güncelleniyor...' : 'Kurum Adını Güncelle'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* 3. DURUM: İLK KURULUM / VELİ HESABI (Veli hesaplarında 3'lü buton ASLA gösterilmez) */
          <div className="space-y-4">
            {/* 3'lü Rol Seçim Butonları (Admin, Öğretmen, Veli) - YALNIZCA YENİ HESAP SEÇİMİNDE, VELİ HESAPLARINDA ASLA GÖSTERİLMEZ */}
            {!isParentUser && (
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  id="role-select-admin"
                  onClick={() => {
                    setSelectedRole('admin');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedRole === 'admin'
                      ? 'bg-white text-rose-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${selectedRole === 'admin' ? 'bg-rose-50 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black">Admin</span>
                  <span className="text-[9px] text-slate-400">Kurum Kodu</span>
                </button>

                <button
                  type="button"
                  id="role-select-teacher"
                  onClick={() => {
                    setSelectedRole('teacher');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedRole === 'teacher'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${selectedRole === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black">Öğretmen</span>
                  <span className="text-[9px] text-slate-400">Sınıf Oluştur</span>
                </button>

                <button
                  type="button"
                  id="role-select-parent"
                  onClick={() => {
                    setSelectedRole('parent');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedRole === 'parent'
                      ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${selectedRole === 'parent' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black">Veli</span>
                  <span className="text-[9px] text-slate-400">Sınıfa Katıl</span>
                </button>
              </div>
            )}

            {/* Geri Bildirim Mesajları */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 3a. ADMİN: Kurum Kodu Oluştur */}
            {selectedRole === 'admin' && (
              <div className="space-y-4">
                <form onSubmit={handleAdminCreateInstitution} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-rose-600" />
                      Okul / Kurum Adı:
                    </label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="Örn: Atatürk İlkokulu, Bilim Koleji..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    {canCancel && onCancel && (
                      <button
                        type="button"
                        onClick={onCancel}
                        className="btn-3d-white flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold cursor-pointer"
                      >
                        Kapat
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 cursor-pointer disabled:opacity-60 transition-all"
                    >
                      <span>{loading ? 'Oluşturuluyor...' : 'Kurum Kodu Oluştur'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3b. ÖĞRETMEN: Kurum Bağlan & Sınıf Aç */}
            {selectedRole === 'teacher' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      1. Adım: Kurum Kodunu Gir
                    </span>
                    {isInstitutionConnected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        Kuruma Bağlandı
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={teacherInstitutionCode}
                      onChange={(e) => setTeacherInstitutionCode(e.target.value.toUpperCase())}
                      placeholder="Örn: KRM-8842"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono uppercase tracking-wider font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleTeacherConnectInstitution}
                      disabled={loading || !teacherInstitutionCode.trim()}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      <span>Kuruma Bağlan</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleTeacherSaveClass} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <School className="w-4 h-4 text-indigo-600" />
                      2. Adım: {currentUser.classId ? 'Sınıf Bilgilerini Güncelle' : 'Sınıf Kodunu Oluştur'}
                    </span>
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      1 Hesap = 1 Sınıf
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Her öğretmen hesabı yalnızca 1 sınıf oluşturabilir. Sınıf adı ve öğrenci hedefini dilediğiniz an güncelleyebilirsiniz.
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Sınıf Adı / Şube:</label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="Örn: 4-A Sınıfı"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Beklenen Öğrenci Sayısı:</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={studentTargetCount}
                      onChange={(e) => setStudentTargetCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    {canCancel && onCancel && (
                      <button
                        type="button"
                        onClick={onCancel}
                        className="btn-3d-white flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold cursor-pointer"
                      >
                        Vazgeç
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-3d-indigo flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black cursor-pointer disabled:opacity-60"
                    >
                      <span>
                        {loading
                          ? 'Kaydediliyor...'
                          : currentUser.classId
                          ? 'Sınıf Bilgilerini Güncelle'
                          : 'Sınıf Kodunu Oluştur'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3c. VELİ: Sınıf Kodu ile Katılma */}
            {selectedRole === 'parent' && (
              <form onSubmit={handleParentSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    Öğretmenin Verdiği 6 Haneli Sınıf Kodu:
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    placeholder="Örn: ABC482"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-base font-mono uppercase tracking-widest text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 text-center font-black focus:bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Öğrencinin Adı Soyadı:</label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Örn: Ali Yılmaz"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Veli Adı (İsteğe Bağlı):</label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Örn: Fatma Yılmaz"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 text-xs text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Veli Olarak Katılma
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Öğretmeninizin WhatsApp grubundan verdiği sınıf kodunu girerek çocuğunuzu sınıfa bağlayabilirsiniz.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {canCancel && onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="btn-3d-white flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold cursor-pointer"
                    >
                      Vazgeç
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-3d-emerald flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black cursor-pointer disabled:opacity-60"
                  >
                    <span>{loading ? 'Bağlanıyor...' : isParentUser ? 'Sınıfı Güncelle' : 'Sınıfa Katıl'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
