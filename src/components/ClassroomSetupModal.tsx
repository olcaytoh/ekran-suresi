import React, { useState } from 'react';
import { UserProfile, ClassroomInfo } from '../types';
import {
  createInstitution,
  joinInstitutionWithCode,
  createClassroom,
  joinClassroomWithCode,
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
} from 'lucide-react';

interface ClassroomSetupModalProps {
  currentUser: UserProfile;
  onCompleted: () => void;
  onCancel?: () => void;
  canCancel?: boolean;
}

export const ClassroomSetupModal: React.FC<ClassroomSetupModalProps> = ({
  currentUser,
  onCompleted,
  onCancel,
  canCancel = false,
}) => {
  // Determine initial role
  const initialRole: 'admin' | 'teacher' | 'parent' =
    currentUser.role === 'admin'
      ? 'admin'
      : currentUser.role === 'teacher' || currentUser.userType === 'teacher'
      ? 'teacher'
      : 'parent';

  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'parent'>(initialRole);

  // ADMIN: Kurum Oluşturma Alanları
  const [institutionName, setInstitutionName] = useState(currentUser.institutionName || 'Cumhuriyet İlkokulu');
  const [createdInstitutionCode, setCreatedInstitutionCode] = useState<string | null>(currentUser.institutionCode || null);

  // ÖĞRETMEN: 1. Kurum Kodu ile Bağlanma / 2. Kendi Sınıf Kodunu Oluşturma
  const [teacherInstitutionCode, setTeacherInstitutionCode] = useState(currentUser.institutionCode || '');
  const [connectedInstitutionName, setConnectedInstitutionName] = useState(currentUser.institutionName || '');
  const [isInstitutionConnected, setIsInstitutionConnected] = useState(!!currentUser.institutionId);
  const [className, setClassName] = useState(currentUser.className || '4-A Sınıfı');
  const [studentTargetCount, setStudentTargetCount] = useState<number>(25);

  // VELİ: Sınıf Kodu ile Katılma
  const [classCode, setClassCode] = useState(currentUser.classCode || '');
  const [studentName, setStudentName] = useState(currentUser.studentName || '');
  const [parentName, setParentName] = useState(currentUser.parentName || currentUser.displayName || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- 1. ADMIN: Kurum Kodu Oluştur ---
  const handleAdminCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim()) {
      setError('Lütfen bir kurum / okul adı girin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const inst = await createInstitution(
        currentUser.uid,
        currentUser.displayName || 'Admin',
        currentUser.email,
        institutionName.trim()
      );
      setCreatedInstitutionCode(inst.code);
      setSuccessMsg(`Kurum başarıyla oluşturuldu! Kurum Kodunuz: ${inst.code}`);
      setTimeout(() => {
        onCompleted();
      }, 1500);
    } catch (err: any) {
      console.error('Create institution error:', err);
      setError(err.message || 'Kurum oluşturulurken bir hata meydana geldi.');
    } finally {
      setLoading(false);
    }
  };

  // --- 2. ÖĞRETMEN: Kurum Kodunu Doğrulayıp Bağlanma ---
  const handleTeacherConnectInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherInstitutionCode.trim()) {
      setError('Lütfen yöneticinizden aldığınız Kurum Kodunu girin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const inst = await joinInstitutionWithCode(currentUser.uid, teacherInstitutionCode.trim());
      setConnectedInstitutionName(inst.name);
      setIsInstitutionConnected(true);
      setSuccessMsg(`Tebrikler! "${inst.name}" kurumuna bağlandınız. Şimdi sınıfınızı oluşturabilirsiniz.`);
    } catch (err: any) {
      console.error('Connect institution error:', err);
      setError(err.message || 'Kuruma bağlanırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // --- 3. ÖĞRETMEN: Kendi Sınıf Kodunu Oluşturma ---
  const handleTeacherCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setError('Lütfen bir sınıf adı girin (Örn: 4-A Sınıfı).');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const classroom = await createClassroom(
        currentUser.uid,
        currentUser.displayName || 'Öğretmen',
        currentUser.email,
        className.trim(),
        studentTargetCount,
        isInstitutionConnected
          ? {
              code: teacherInstitutionCode.trim().toUpperCase(),
              name: connectedInstitutionName,
            }
          : undefined
      );
      setSuccessMsg(`Sınıfınız başarıyla oluşturuldu! Sınıf Kodunuz: ${classroom.code}`);
      setTimeout(() => {
        onCompleted();
      }, 1500);
    } catch (err: any) {
      console.error('Create class error:', err);
      setError(err.message || 'Sınıf oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // --- 4. VELİ: Sınıf Kodu ile Katılma ---
  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const classroom = await joinClassroomWithCode(
        currentUser.uid,
        classCode.trim(),
        studentName.trim(),
        parentName.trim()
      );
      setSuccessMsg(`Tebrikler! "${classroom.name}" sınıfına başarıyla katıldınız.`);
      setTimeout(() => {
        onCompleted();
      }, 1200);
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
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
            {selectedRole === 'admin' ? (
              <Building2 className="w-6 h-6 text-rose-600" />
            ) : selectedRole === 'teacher' ? (
              <GraduationCap className="w-6 h-6 text-indigo-600" />
            ) : (
              <Users className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {selectedRole === 'admin'
              ? 'Kurum Yönetimi & Kurum Kodu'
              : selectedRole === 'teacher'
              ? 'Öğretmen: Kuruma Bağlan & Sınıf Aç'
              : 'Veli: Sınıf Kodu ile Katıl'}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {selectedRole === 'admin'
              ? 'Admin kurum kodunu oluşturur; öğretmen bu kod ile kuruma bağlanır.'
              : selectedRole === 'teacher'
              ? 'Öğretmen kurum kodunu girer, ardından kendi sınıf kodunu oluşturur.'
              : 'Veli, öğretmenden aldığı sınıf kodunu girerek katılır.'}
          </p>
        </div>

        {/* 3'lü Rol Seçim Butonları (Admin, Öğretmen, Veli) */}
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

        {/* ------------------------------------------------------------- */}
        {/* 1. ADMİN: KURUM KODU OLUŞTURMA AKIŞI                         */}
        {/* ------------------------------------------------------------- */}
        {selectedRole === 'admin' && (
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

            {createdInstitutionCode ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-1">
                <p className="text-xs font-bold text-rose-800">Mevcut Kurum Kodunuz:</p>
                <p className="text-xl font-mono font-black text-rose-700 tracking-wider">
                  {createdInstitutionCode}
                </p>
                <p className="text-[10px] text-rose-600">
                  Bu kodu öğretmenlerinizle paylaşın. Öğretmenler bu kodu girerek kuruma bağlanacaktır.
                </p>
              </div>
            ) : null}

            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3 text-xs text-rose-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                Admin Akışı Nasıl İşler?
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Admin butonuna basarak kurum kodunu oluşturursunuz. Bu kodu öğretmenlerinize iletirsiniz; öğretmenler bu kodla kuruma bağlanır ve kendi sınıflarını açar.
              </p>
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
                id="btn-create-institution"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 cursor-pointer disabled:opacity-60 transition-all"
              >
                <span>{loading ? 'Oluşturuluyor...' : 'Kurum Kodu Oluştur'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. ÖĞRETMEN: KURUM KODU İLE BAĞLAN + SINIF KODU OLUŞTUR        */}
        {/* ------------------------------------------------------------- */}
        {selectedRole === 'teacher' && (
          <div className="space-y-4">
            {/* Adım 1: Kurum Kodunu Girme & Kuruma Bağlanma */}
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

              {connectedInstitutionName ? (
                <p className="text-[11px] font-bold text-emerald-700">
                  Bağlı Kurum: {connectedInstitutionName}
                </p>
              ) : (
                <p className="text-[10px] text-slate-500">
                  Admin'inizin verdiği Kurum Kodunu yazarak kuruma dahil olun.
                </p>
              )}
            </div>

            {/* Adım 2: Kendi Sınıf Kodunu Oluşturma */}
            <form onSubmit={handleTeacherCreateClass} className="space-y-3">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <School className="w-4 h-4 text-indigo-600" />
                2. Adım: Kendi Sınıf Kodunu Oluştur
              </span>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Sınıf Adı / Şube:
                </label>
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
                <label className="text-xs font-bold text-slate-700">
                  Beklenen Öğrenci Sayısı:
                </label>
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
                  id="btn-create-class"
                  disabled={loading}
                  className="btn-3d-indigo flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black cursor-pointer disabled:opacity-60"
                >
                  <span>{loading ? 'Oluşturuluyor...' : 'Sınıf Kodunu Oluştur'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3. VELİ: SINIF KODU İLE KATILMA AKIŞI                         */}
        {/* ------------------------------------------------------------- */}
        {selectedRole === 'parent' && (
          <form onSubmit={handleParentSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                Öğretmenin Verdiği 6 Haneli Sınıf Kodu:
              </label>
              <input
                type="text"
                id="input-class-code"
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
                <label className="text-xs font-bold text-slate-800">
                  Öğrencinin Adı Soyadı:
                </label>
                <input
                  type="text"
                  id="input-student-name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Örn: Ali Yılmaz"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Veli Adı (İsteğe Bağlı):
                </label>
                <input
                  type="text"
                  id="input-parent-name"
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
                id="btn-join-class"
                disabled={loading}
                className="btn-3d-emerald flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black cursor-pointer disabled:opacity-60"
              >
                <span>{loading ? 'Bağlanıyor...' : 'Sınıfa Katıl'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
