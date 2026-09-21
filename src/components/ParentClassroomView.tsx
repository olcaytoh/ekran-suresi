import React, { useState } from 'react';
import { UserProfile, ClassroomInfo } from '../types';
import {
  updateStudentName,
  signOutUser,
  forgetAndClearAllDeviceData,
  setUserRole,
  verifyAdminCodeAndUpgrade,
  joinInstitutionWithCode,
  joinClassroomWithCode,
} from '../lib/firebase';
import {
  School,
  ShieldCheck,
  KeyRound,
  User,
  Edit2,
  Check,
  LogOut,
  Sparkles,
  GraduationCap,
  Building2,
  UserX,
  AlertTriangle,
  Copy,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';

interface ParentClassroomViewProps {
  userProfile: UserProfile | null;
  classroom: ClassroomInfo | null;
  onOpenClassSetup: () => void;
  onSwitchToTeacher?: () => void;
  onSwitchRole?: (role: 'admin' | 'teacher') => void;
  onUpgradeToAdminWithCode?: (code: string) => Promise<void>;
  onProfileUpdated?: (updates: Partial<UserProfile>) => void;
  isTeacher?: boolean;
  isSuperAdmin?: boolean;
  isDemo?: boolean;
  onSignOut?: () => void;
  onForgetAccount?: () => void;
}

export const ParentClassroomView: React.FC<ParentClassroomViewProps> = ({
  userProfile,
  classroom,
  onOpenClassSetup,
  onSwitchToTeacher,
  onSwitchRole,
  onUpgradeToAdminWithCode,
  onProfileUpdated,
  isTeacher = false,
  isSuperAdmin = false,
  isDemo = false,
  onSignOut,
  onForgetAccount,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(userProfile?.studentName || userProfile?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [showForgetModal, setShowForgetModal] = useState(false);
  const [isForgetting, setIsForgetting] = useState(false);
  const [isSettingTeacher, setIsSettingTeacher] = useState(false);

  // Admin Kodu Doğrulama Modalı State'leri
  const [showAdminCodeModal, setShowAdminCodeModal] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [adminCodeError, setAdminCodeError] = useState<string | null>(null);
  const [adminCodeSuccess, setAdminCodeSuccess] = useState<string | null>(null);
  const [isVerifyingAdminCode, setIsVerifyingAdminCode] = useState(false);

  // TEACHER: Kurum Kodu ile Kuruma Bağlanma
  const [teacherInstCodeInput, setTeacherInstCodeInput] = useState('');
  const [isJoiningInst, setIsJoiningInst] = useState(false);
  const [showChangeInst, setShowChangeInst] = useState(!userProfile?.institutionId);
  const [teacherInstFeedback, setTeacherInstFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedTeacherClassCode, setCopiedTeacherClassCode] = useState(false);

  const handleTeacherJoinInstitution = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = teacherInstCodeInput.trim().toUpperCase();
    if (!raw) {
      setTeacherInstFeedback({ type: 'error', text: 'Lütfen geçerli bir Kurum Kodu giriniz (Örn: KRM-1071).' });
      return;
    }

    if (!raw.startsWith('KRM-') && raw.length === 6 && !raw.includes('-')) {
      setTeacherInstFeedback({
        type: 'error',
        text: 'Girdiğiniz kod bir Sınıf Koduna benziyor. Kurum kodları "KRM-XXXX" biçimindedir. Okul yöneticinizden aldığınız Kurum Kodunu giriniz.',
      });
      return;
    }

    try {
      setIsJoiningInst(true);
      setTeacherInstFeedback(null);

      if (isDemo || !userProfile?.uid) {
        onProfileUpdated?.({
          institutionId: 'inst_demo',
          institutionCode: raw,
          institutionName: 'AKÇAKOCA İLKOKULU',
        });
        setTeacherInstFeedback({
          type: 'success',
          text: `AKÇAKOCA İLKOKULU (${raw}) kurumuna başarıyla bağlandınız!`,
        });
        setShowChangeInst(false);
        setTeacherInstCodeInput('');
        return;
      }

      const inst = await joinInstitutionWithCode(userProfile.uid, raw);
      onProfileUpdated?.({
        institutionId: inst.id,
        institutionCode: inst.code,
        institutionName: inst.name,
      });
      setTeacherInstFeedback({
        type: 'success',
        text: `"${inst.name}" (${inst.code}) kurumuna başarıyla bağlandınız! Sınıfınız artık yöneticinin kurum listesinde görünecektir.`,
      });
      setShowChangeInst(false);
      setTeacherInstCodeInput('');
    } catch (err: any) {
      console.error('Error joining institution:', err);
      setTeacherInstFeedback({
        type: 'error',
        text: err.message || 'Kurum bulunamadı. Lütfen kurum kodunu doğru girdiğinizden emin olun.',
      });
    } finally {
      setIsJoiningInst(false);
    }
  };

  const handleCopyTeacherClassCode = () => {
    const code = userProfile?.classCode || classroom?.code;
    if (!code) return;
    const msg = `Sayın Velilerimiz,\n${userProfile?.className || classroom?.name || 'Sınıfımız'} Dijital Ekran Süresi Takip Sistemimize katılmak için Sınıf Kodumuz: ${code}\n\nUygulamada "Sınıfım" bölümünden bu 6 haneli Sınıf Kodunu ve öğrencinizin adını girerek sınıfımıza bağlanabilirsiniz.`;
    navigator.clipboard.writeText(msg);
    setCopiedTeacherClassCode(true);
    setTimeout(() => setCopiedTeacherClassCode(false), 2500);
  };

  // PARENT: Sınıf Kodu ile Sınıfa Bağlanma
  const [parentClassCodeInput, setParentClassCodeInput] = useState('');
  const [parentStudentNameInput, setParentStudentNameInput] = useState(
    userProfile?.studentName || userProfile?.displayName || ''
  );
  const [parentNameInput, setParentNameInput] = useState(userProfile?.parentName || '');
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [showChangeClass, setShowChangeClass] = useState(!userProfile?.classId && !classroom?.id);
  const [parentClassFeedback, setParentClassFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleParentJoinClass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawCode = parentClassCodeInput.trim().toUpperCase();
    const trimmedStudent = parentStudentNameInput.trim();
    const trimmedParent = parentNameInput.trim();

    if (!rawCode) {
      setParentClassFeedback({ type: 'error', text: 'Lütfen öğretmeninizden aldığınız 6 haneli Sınıf Kodunu giriniz.' });
      return;
    }

    if (rawCode.startsWith('KRM-')) {
      setParentClassFeedback({
        type: 'error',
        text: 'Girdiğiniz kod bir Kurum Kodudur. Veliler öğretmenlerinden aldıkları 6 haneli Sınıf Kodunu (Örn: ABC123) girmelidir.',
      });
      return;
    }

    if (!trimmedStudent) {
      setParentClassFeedback({ type: 'error', text: 'Lütfen öğrencinin adını ve soyadını giriniz.' });
      return;
    }

    try {
      setIsJoiningClass(true);
      setParentClassFeedback(null);

      if (isDemo || !userProfile?.uid) {
        onProfileUpdated?.({
          classId: 'class_demo_' + rawCode,
          classCode: rawCode,
          className: '1-A Sınıfı',
          studentName: trimmedStudent,
          parentName: trimmedParent || undefined,
          displayName: trimmedStudent + (trimmedParent ? ` (${trimmedParent})` : ''),
          role: 'parent',
          userType: 'parent',
        });
        setParentClassFeedback({
          type: 'success',
          text: `"${rawCode}" kodlu sınıfa başarıyla bağlandınız!`,
        });
        setShowChangeClass(false);
        setParentClassCodeInput('');
        return;
      }

      const joinedClass = await joinClassroomWithCode(userProfile.uid, rawCode, trimmedStudent, trimmedParent);
      onProfileUpdated?.({
        classId: joinedClass.id,
        classCode: joinedClass.code,
        className: joinedClass.name,
        studentName: trimmedStudent,
        parentName: trimmedParent || undefined,
        displayName: trimmedStudent + (trimmedParent ? ` (${trimmedParent})` : ''),
        institutionId: joinedClass.institutionId,
        institutionCode: joinedClass.institutionCode,
        institutionName: joinedClass.institutionName,
        role: 'parent',
        userType: 'parent',
      });
      setParentClassFeedback({
        type: 'success',
        text: `"${joinedClass.name}" sınıfına başarıyla bağlandınız!`,
      });
      setShowChangeClass(false);
      setParentClassCodeInput('');
    } catch (err: any) {
      console.error('Error joining classroom:', err);
      setParentClassFeedback({
        type: 'error',
        text: err.message || 'Sınıf bulunamadı. Lütfen sınıf kodunu doğru girdiğinizden emin olun.',
      });
    } finally {
      setIsJoiningClass(false);
    }
  };

  const handleSaveName = async () => {
    if (!userProfile?.uid || !nameVal.trim()) return;
    try {
      setSavingName(true);
      await updateStudentName(userProfile.uid, nameVal.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update student name:', err);
    } finally {
      setSavingName(false);
    }
  };

  const handleVerifyAndSubmitAdminCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = adminCodeInput.trim().toUpperCase();
    if (!cleaned) {
      setAdminCodeError('Lütfen kurumunuzun Admin Kodunu giriniz.');
      return;
    }
    setAdminCodeError(null);
    setIsVerifyingAdminCode(true);
    try {
      if (onUpgradeToAdminWithCode) {
        await onUpgradeToAdminWithCode(cleaned);
      } else if (userProfile?.uid) {
        await verifyAdminCodeAndUpgrade(userProfile.uid, cleaned, userProfile.institutionId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pendingUserRole', 'admin');
          window.location.reload();
        }
      }
      setAdminCodeSuccess('Yönetici yetkisi başarıyla doğrulandı! Admin paneline geçiliyor...');
      setTimeout(() => {
        setShowAdminCodeModal(false);
      }, 700);
    } catch (err: any) {
      setAdminCodeError(err.message || 'Girdiğiniz Admin Kodu hatalı. Lütfen kurum yöneticinizden aldığınız kodu kontrol edin.');
    } finally {
      setIsVerifyingAdminCode(false);
    }
  };

  const handleSetAsTeacher = async () => {
    if (onSwitchRole) {
      onSwitchRole('teacher');
      return;
    }
    if (!userProfile?.uid) return;
    try {
      setIsSettingTeacher(true);
      await setUserRole(userProfile.uid, 'teacher');
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingUserRole', 'teacher');
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch to teacher:', err);
    } finally {
      setIsSettingTeacher(false);
    }
  };

  const handleConfirmForget = async () => {
    try {
      setIsForgetting(true);
      if (onForgetAccount) {
        await onForgetAccount();
      } else {
        await forgetAndClearAllDeviceData();
      }
    } catch (err) {
      console.error('Error forgetting account:', err);
      await forgetAndClearAllDeviceData().catch(() => {});
    } finally {
      setIsForgetting(false);
      setShowForgetModal(false);
    }
  };

  const roleLabel = isSuperAdmin
    ? 'Kurum Yöneticisi (Admin)'
    : isTeacher
    ? 'Öğretmen'
    : 'Veli / Öğrenci';

  return (
    <div className="flex-1 flex flex-col justify-between gap-3">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            {isSuperAdmin ? (
              <Building2 className="w-4 h-4 text-rose-600" />
            ) : isTeacher ? (
              <GraduationCap className="w-4 h-4 text-indigo-600" />
            ) : (
              <School className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
              {isSuperAdmin ? 'Kurum & Profil Ayarları' : isTeacher ? 'Sınıfım & Öğretmen Profili' : 'Sınıfım & Öğrenci Bilgileri'}
            </h3>
            <span className="text-[10px] font-bold text-slate-500">{roleLabel}</span>
          </div>
        </div>

        {!isSuperAdmin && (
          <button
            type="button"
            onClick={onOpenClassSetup}
            className="text-xs font-black text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
          >
            {isTeacher ? 'Sınıfı Düzenle' : 'Sınıfı Değiştir'}
          </button>
        )}
      </div>

      {/* Yalnızca Öğretmen için Admin Moduna Geçiş (Admin Kodu Doğrulamasıyla - Velilere Kesinlikle Gösterilmez) */}
      {isTeacher && !isSuperAdmin && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 rounded-2xl p-3 sm:p-3.5 border border-amber-200/90 flex items-center justify-between gap-2.5 shadow-2xs flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-amber-950">
                Kurum Yöneticisi misiniz?
              </div>
              <div className="text-[11px] text-amber-800/90 truncate">
                {userProfile?.institutionAdminCode
                  ? 'Yönetici yetkiniz kayıtlıdır. Tek tıkla dönebilir veya admin kodunuzu doğrulayabilirsiniz.'
                  : 'Admin kodunu girerek kurum yönetici paneline geçebilirsiniz.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {userProfile?.institutionAdminCode && onSwitchRole && (
              <button
                type="button"
                id="btn-direct-return-admin"
                onClick={() => onSwitchRole('admin')}
                className="btn-3d-rose px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Kayıtlı Admin yetkinizle doğrudan yönetici paneline dönün"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Yönetici Paneline Dön</span>
              </button>
            )}
            <button
              type="button"
              id="btn-open-admin-code-modal"
              onClick={() => {
                setAdminCodeInput(userProfile?.institutionAdminCode || '');
                setAdminCodeError(null);
                setAdminCodeSuccess(null);
                setShowAdminCodeModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-2xs flex-shrink-0 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{userProfile?.institutionAdminCode ? 'Kodu Doğrula / Değiştir' : 'Admin Kodunu Gir'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Yönetici için Öğretmen Moduna Geçiş */}
      {isSuperAdmin && (
        <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-200 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div className="text-xs text-indigo-950 font-medium">
              <strong className="font-bold">Öğretmen Modu:</strong> Sınıfınızı ve öğrenci listenizi öğretmen gözüyle yönetebilirsiniz.
            </div>
          </div>
          <button
            type="button"
            disabled={isSettingTeacher}
            onClick={handleSetAsTeacher}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-2xs flex-shrink-0 cursor-pointer disabled:opacity-50 transition-all"
          >
            {isSettingTeacher ? 'Geçiliyor...' : 'Öğretmen Moduna Geç'}
          </button>
        </div>
      )}

      {/* 2. Status Card */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border flex-shrink-0 ${
                isSuperAdmin
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : isTeacher
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              {isSuperAdmin ? <Building2 className="w-6 h-6" /> : <School className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  {isSuperAdmin
                    ? userProfile?.institutionName || 'Kurum Yöneticisi'
                    : userProfile?.className || classroom?.name || 'Bağlı Sınıf Yok'}
                </h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Aktif
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-0.5">
                {isSuperAdmin
                  ? `Yönetici: ${userProfile?.displayName || userProfile?.email || 'Yönetici'}`
                  : `Öğretmen: ${classroom?.teacherName || userProfile?.displayName || 'Sınıf Öğretmeni'}`}
              </p>

              {(userProfile?.institutionName || classroom?.institutionName) && (
                <p className="text-[11px] text-rose-700 font-bold mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-rose-500" />
                  <span>Kurum: {userProfile?.institutionName || classroom?.institutionName}</span>
                </p>
              )}
            </div>
          </div>

          {(userProfile?.classCode || classroom?.code) && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block">Sınıf Kodu</span>
              <span className="text-xs font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                {userProfile?.classCode || classroom?.code}
              </span>
            </div>
          )}

          {isSuperAdmin && userProfile?.institutionCode && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block">Kurum Kodu</span>
              <span className="text-xs font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                {userProfile.institutionCode}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* ÖĞRETMEN: KURUMA BAĞLANMA (KURUM KODU GİR) & SINIF KODU PAYLAŞIMI */}
      {/* ============================================================== */}
      {isTeacher && !isSuperAdmin && (
        <div className="space-y-3">
          {/* 1. Kuruma Bağlanma Kartı */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-rose-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight flex items-center gap-1.5">
                    <span>Kuruma Bağlan</span>
                    {userProfile?.institutionName && (
                      <span className="text-[9.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Kuruma Bağlı
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Okul yöneticinizden aldığınız Kurum Kodu ile kurumunuza bağlanın.
                  </p>
                </div>
              </div>

              {userProfile?.institutionId && (
                <button
                  type="button"
                  onClick={() => setShowChangeInst(!showChangeInst)}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  {showChangeInst ? 'Kapat' : 'Kodu Değiştir'}
                </button>
              )}
            </div>

            {/* Mevcut Kurum Bilgisi (Varsa) */}
            {userProfile?.institutionName && !showChangeInst && (
              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-bold text-rose-500 block uppercase tracking-wider">
                    Bağlı Olduğunuz Okul / Kurum
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {userProfile.institutionName}
                  </span>
                  {userProfile.institutionCode && (
                    <span className="text-xs font-mono font-bold text-rose-800 ml-2 bg-rose-100/80 px-2 py-0.5 rounded-md">
                      {userProfile.institutionCode}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangeInst(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer active:scale-95 transition-all shadow-2xs"
                >
                  Farklı Kuruma Bağlan
                </button>
              </div>
            )}

            {/* Kurum Kodu Giriş Formu */}
            {(!userProfile?.institutionId || showChangeInst) && (
              <form onSubmit={handleTeacherJoinInstitution} className="space-y-2.5 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="input-teacher-institution-code"
                      value={teacherInstCodeInput}
                      onChange={(e) => setTeacherInstCodeInput(e.target.value.toUpperCase())}
                      placeholder="Örn: KRM-1071"
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-black tracking-wider uppercase rounded-2xl border border-rose-200 bg-rose-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                    />
                    <KeyRound className="w-4 h-4 text-rose-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    id="btn-teacher-join-inst"
                    disabled={isJoiningInst || !teacherInstCodeInput.trim()}
                    className="btn-3d-rose px-4 py-2.5 rounded-2xl text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isJoiningInst ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Bağlanıyor...</span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Kuruma Bağlan</span>
                      </>
                    )}
                  </button>
                </div>

                {teacherInstFeedback && (
                  <div
                    className={`text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 ${
                      teacherInstFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{teacherInstFeedback.text}</span>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* 2. Sınıf Kodu & Velileri Davet Etme Kartı */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                  <School className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    Sınıf Kodunuz &amp; Veli Katılımı
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Velileriniz bu kodu &quot;Sınıfım&quot; sekmesinden girerek sınıfınıza katılırlar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenClassSetup}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
              >
                {userProfile?.classCode || classroom?.code ? 'Sınıfı Düzenle' : 'Sınıf Aç'}
              </button>
            </div>

            {(userProfile?.classCode || classroom?.code) ? (
              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                    {userProfile?.className || classroom?.name || 'Sınıfınız'}
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-indigo-900 tracking-wider">
                    {userProfile?.classCode || classroom?.code}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-copy-teacher-class-code"
                  onClick={handleCopyTeacherClassCode}
                  className="btn-3d-palette-primary px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Veliler için sınıf davetini kopyala"
                >
                  {copiedTeacherClassCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      <span>Davet Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Veliler İçin Kodu Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  Henüz bir sınıfınız tanımlı değil. Hemen bir sınıf oluşturup velilerinizle paylaşabileceğiniz sınıf kodunu alın.
                </p>
                <button
                  type="button"
                  onClick={onOpenClassSetup}
                  className="btn-3d-palette-primary px-4 py-2 rounded-2xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Sınıfımı Oluştur</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VELİ / ÖĞRENCİ: SINIF KODU İLE SINIF VE KURUMA BAĞLANMA */}
      {/* ============================================================== */}
      {!isTeacher && !isSuperAdmin && (
        <div className="space-y-3">
          {/* 1. Sınıfa Bağlanma Kartı (Sınıf Kodu Gir) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-emerald-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight flex items-center gap-1.5">
                    <span>Sınıfa Bağlan (Sınıf Kodu)</span>
                    {(userProfile?.className || classroom?.name) && (
                      <span className="text-[9.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Sınıfa Bağlı
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Öğretmeninizden aldığınız 6 haneli Sınıf Kodu ile sınıfınıza bağlanın.
                  </p>
                </div>
              </div>

              {(userProfile?.classId || classroom?.id) && (
                <button
                  type="button"
                  onClick={() => setShowChangeClass(!showChangeClass)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  {showChangeClass ? 'Kapat' : 'Sınıfı Değiştir'}
                </button>
              )}
            </div>

            {/* Mevcut Bağlı Sınıf Özeti (Varsa) */}
            {(userProfile?.classId || classroom?.id) && !showChangeClass && (
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">
                    Bağlı Olduğunuz Sınıf
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {userProfile?.className || classroom?.name || 'Sınıf'}
                  </span>
                  {(userProfile?.classCode || classroom?.code) && (
                    <span className="text-xs font-mono font-bold text-emerald-800 ml-2 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {userProfile?.classCode || classroom?.code}
                    </span>
                  )}
                  {(userProfile?.institutionName || classroom?.institutionName) && (
                    <div className="text-[11px] text-slate-600 font-bold mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-rose-500" />
                      <span>{userProfile?.institutionName || classroom?.institutionName}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangeClass(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer active:scale-95 transition-all shadow-2xs"
                >
                  Farklı Sınıfa Bağlan
                </button>
              </div>
            )}

            {/* Sınıf Kodu ve Öğrenci Bilgisi Giriş Formu */}
            {(!userProfile?.classId && !classroom?.id || showChangeClass) && (
              <form onSubmit={handleParentJoinClass} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Sınıf Kodu (6 Hane) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="input-parent-class-code"
                        value={parentClassCodeInput}
                        onChange={(e) => setParentClassCodeInput(e.target.value.toUpperCase())}
                        placeholder="Örn: ABC123"
                        maxLength={8}
                        className="w-full px-3 py-2 text-xs font-mono font-black tracking-wider uppercase rounded-xl border border-emerald-200 bg-emerald-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                      />
                      <KeyRound className="w-3.5 h-3.5 text-emerald-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Öğrenci Adı ve Soyadı *
                    </label>
                    <input
                      type="text"
                      id="input-parent-student-name"
                      value={parentStudentNameInput}
                      onChange={(e) => setParentStudentNameInput(e.target.value)}
                      placeholder="Örn: Ali Yılmaz"
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Veli Adı (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      id="input-parent-parent-name"
                      value={parentNameInput}
                      onChange={(e) => setParentNameInput(e.target.value)}
                      placeholder="Örn: Ayşe Yılmaz"
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <p className="text-[11px] text-slate-500">
                    Sınıf kodunu girdiğinizde okulunuza ve öğretmeninize otomatik bağlanırsınız.
                  </p>
                  <button
                    type="submit"
                    id="btn-parent-join-class"
                    disabled={isJoiningClass || !parentClassCodeInput.trim() || !parentStudentNameInput.trim()}
                    className="btn-3d-palette-primary px-4 py-2 rounded-2xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isJoiningClass ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sınıfa Bağlanılıyor...</span>
                      </>
                    ) : (
                      <>
                        <School className="w-3.5 h-3.5" />
                        <span>Sınıfa Bağlan</span>
                      </>
                    )}
                  </button>
                </div>

                {parentClassFeedback && (
                  <div
                    className={`text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 ${
                      parentClassFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{parentClassFeedback.text}</span>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* 2. Öğrenci Adı ve Soyadı Kartı (Öğrenci profil bilgisi güncelleme) */}
          <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Öğrenci Adı ve Soyadı
              </span>

              {!isEditingName && (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Düzenle</span>
                </button>
              )}
            </div>

            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  placeholder="Öğrenci adı girin"
                  className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName || !nameVal.trim()}
                  className="btn-3d-cyan px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Kaydet</span>
                </button>
              </div>
            ) : (
              <div className="text-sm font-black text-slate-900 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                {userProfile?.studentName || userProfile?.displayName || 'Öğrenci Adı Belirtilmedi'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Oturum ve Cihaz Güvenliği (Hesabı Unut & Çıkış Yap) */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            Oturum ve Hesap Güvenliği
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {userProfile?.email || userProfile?.displayName || 'Aktif Oturum'}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Ortak veya paylaşılan bir cihaz kullanıyorsanız, hesabınızı ve kayıtlı verileri bu cihazdan güvenle temizlemek için <span className="font-bold text-rose-600">"Hesabı Unut"</span> seçeneğini kullanabilirsiniz.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Standart Çıkış Butonu */}
          <button
            type="button"
            id="btn-classroom-signout"
            onClick={() => {
              if (onSignOut) {
                onSignOut();
              } else {
                signOutUser();
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer active:scale-95 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Çıkış Yap (Oturumu Kapat)</span>
          </button>

          {/* HESABI UNUT BUTONU (Tüm hesaplar için kalıcı oturum temizleme) */}
          <button
            type="button"
            id="btn-forget-account"
            onClick={() => setShowForgetModal(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer active:scale-95 transition-all shadow-2xs"
          >
            <UserX className="w-4 h-4 text-rose-600" />
            <span>Hesabı Unut (Bu Cihazdan Kaldır)</span>
          </button>
        </div>
      </div>

      {/* 5. Teacher Switch Button if relevant */}
      {isTeacher && onSwitchToTeacher && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onSwitchToTeacher}
            className="btn-3d-palette-primary w-full py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Öğretmen Paneline Dön</span>
          </button>
        </div>
      )}

      {/* HESABI UNUT ONAY MODALI */}
      {showForgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <UserX className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900">
                Hesabı Bu Cihazdan Unut?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bu cihazda kayıtlı tüm oturum bilgileriniz, tercih edilen rolünüz ve yerel verileriniz tamamen silinecektir. Tekrar girmek için hesap bilgilerinizi yeniden girmeniz gerekecek.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Unutulacak Hesap:
              </div>
              <div className="font-mono text-xs text-indigo-700 font-bold truncate">
                {userProfile?.email || userProfile?.displayName || 'Mevcut Hesap'}
              </div>
              <div className="text-[10px] text-slate-400">
                Rol: {roleLabel}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForgetModal(false)}
                disabled={isForgetting}
                className="btn-3d-white py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmForget}
                disabled={isForgetting}
                className="py-2.5 px-4 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>{isForgetting ? 'Siliniyor & Unutuluyor...' : 'Evet, Hesabı Unut'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Kodu Doğrulama Modalı */}
      {showAdminCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-slate-900">
                  Kurum Admin Doğrulaması
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Yönetici (Admin) paneline geçiş yapmak için lütfen kurumunuza ait <strong className="text-amber-900 font-bold">Admin Kodunu</strong> giriniz.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyAndSubmitAdminCode} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Kurum Admin Kodu (ADM-XXXX)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminCodeInput}
                    onChange={(e) => {
                      setAdminCodeInput(e.target.value.toUpperCase());
                      setAdminCodeError(null);
                    }}
                    placeholder="Örn: ADM-2090"
                    autoFocus
                    disabled={isVerifyingAdminCode}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 disabled:opacity-50"
                  />
                  {adminCodeInput && (
                    <button
                      type="button"
                      onClick={() => setAdminCodeInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      Temizle
                    </button>
                  )}
                </div>
                {userProfile?.institutionCode && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Bağlı Kurum: <span className="font-bold text-slate-700">{userProfile.institutionName || userProfile.institutionCode}</span> ({userProfile.institutionCode})
                  </p>
                )}
              </div>

              {adminCodeError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold">{adminCodeError}</span>
                </div>
              )}

              {adminCodeSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold">{adminCodeSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isVerifyingAdminCode}
                  onClick={() => setShowAdminCodeModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingAdminCode || !adminCodeInput.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  {isVerifyingAdminCode ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Doğrulanıyor...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Doğrula ve Admin Ol</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

