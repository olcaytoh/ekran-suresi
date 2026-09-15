import React, { useState } from 'react';
import { UserProfile, ClassroomInfo } from '../types';
import {
  updateStudentName,
  signOutUser,
  forgetAndClearAllDeviceData,
  setUserRole,
  verifyAdminCodeAndUpgrade,
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
} from 'lucide-react';

interface ParentClassroomViewProps {
  userProfile: UserProfile | null;
  classroom: ClassroomInfo | null;
  onOpenClassSetup: () => void;
  onSwitchToTeacher?: () => void;
  onSwitchRole?: (role: 'admin' | 'teacher') => void;
  onUpgradeToAdminWithCode?: (code: string) => Promise<void>;
  isTeacher?: boolean;
  isSuperAdmin?: boolean;
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
  isTeacher = false,
  isSuperAdmin = false,
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
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-3 sm:p-3.5 border border-amber-200/90 flex items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-amber-950">
                Kurum Yöneticisi misiniz?
              </div>
              <div className="text-[11px] text-amber-800/90 truncate">
                Admin kodunu girerek kurum yönetici paneline geçebilirsiniz.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAdminCodeInput('');
              setAdminCodeError(null);
              setAdminCodeSuccess(null);
              setShowAdminCodeModal(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-2xs flex-shrink-0 cursor-pointer transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Moduna Geç</span>
          </button>
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

      {/* 3. Student Name Editing Card (Only for Parent / Student) */}
      {!isTeacher && !isSuperAdmin && (
        <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs">
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

