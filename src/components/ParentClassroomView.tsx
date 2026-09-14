import React, { useState } from 'react';
import { UserProfile, ClassroomInfo } from '../types';
import { updateStudentName, signOutUser } from '../lib/firebase';
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

  const handleConfirmForget = async () => {
    try {
      setIsForgetting(true);
      if (onForgetAccount) {
        await onForgetAccount();
      } else {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        await signOutUser();
      }
    } catch (err) {
      console.error('Error forgetting account:', err);
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

        <button
          type="button"
          onClick={onOpenClassSetup}
          className="text-xs font-black text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
        >
          {isSuperAdmin ? 'Kurum Ayarları' : isTeacher ? 'Sınıfı Düzenle' : 'Sınıfı Değiştir'}
        </button>
      </div>

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
                <span>{isForgetting ? 'Unutuluyor...' : 'Evet, Hesabı Unut'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

