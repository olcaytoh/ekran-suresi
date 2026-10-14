import React, { useState } from 'react';
import { UserProfile } from '../types';
import { signOutUser } from '../lib/firebase';
import { isSoundEnabled, toggleSound, playTapSound } from '../lib/soundUtils';
import {
  HelpCircle,
  Settings,
  LogOut,
  ShieldAlert,
  GraduationCap,
  User,
  RefreshCw,
  ArrowLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile | null;
  activeTab: 'tracker' | 'admin';
  setActiveTab: (tab: 'tracker' | 'admin') => void;
  isAdmin: boolean;
  memberCount: number;
  currentWeekLabel: string;
  onOpenClassSetup?: () => void;
  onSignOut?: () => void;
  onSwitchRole?: (role: 'admin' | 'teacher') => void;
  onSelectClass?: () => void;
  onOpenParentGuide?: () => void;
  isImpersonatingParent?: boolean;
  onExitParentImpersonation?: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenClassSetup,
  onSignOut,
  onSwitchRole,
  onSelectClass,
  onOpenParentGuide,
  isImpersonatingParent = false,
  onExitParentImpersonation,
  canGoBack = false,
  onGoBack,
}) => {
  const isSuperAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';
  const isStudentOnly = !isSuperAdmin && !isTeacher && (currentUser?.role === 'student' || currentUser?.userType === 'student');
  const isParent = !isSuperAdmin && !isTeacher && !isStudentOnly;

  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  // Veli Adı Belirleme: En üstte sadece isim olsun, "(Veli)" veya parantez içindeki ekler temizlensin
  const rawParentName =
    currentUser?.parentName ||
    (currentUser?.displayName?.includes('(')
      ? currentUser.displayName.replace(/\s*\([^)]*veli[^)]*\)/gi, '').trim()
      : undefined) ||
    currentUser?.displayName ||
    'Değerli Velimiz';

  const cleanParentName = rawParentName
    .replace(/\s*\([^)]*veli[^)]*\)/gi, '')
    .replace(/\s*\(veli\)/gi, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim() || 'Değerli Velimiz';

  // Öğretmen Adı: Üstte "Sayın", altta isim ve soyisim ("Öğretmen" ifadesi olmadan)
  let rawTeacherName =
    currentUser?.displayName
      ?.replace(/^Sayın\s+/i, '')
      ?.replace(/\s*Öğretmen\s*$/i, '')
      ?.replace(/\s*\(Öğretmen\)\s*$/i, '')
      ?.replace(/\s*\([^)]*\)/g, '')
      ?.trim() || '';

  if (!rawTeacherName) {
    rawTeacherName = 'Öğretmen';
  }
  const teacherDisplayName = rawTeacherName;

  // Yönetici Adı: Üstte "Yönetici", altında isim ve soyisim
  let rawAdminName =
    currentUser?.displayName
      ?.replace(/\s*\([^)]*yönetici[^)]*\)/gi, '')
      ?.replace(/\s*\([^)]*\)/g, '')
      ?.trim() || '';

  if (!rawAdminName) {
    rawAdminName = 'Yönetici';
  }
  const adminDisplayName = rawAdminName;

  return (
    <header className="flex-shrink-0 z-40 px-2.5 sm:px-4 pt-2 sm:pt-2.5 pb-1 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto w-full select-none flex flex-col gap-1.5">
      {/* Frosted Glass Top Bar */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between select-none"
        style={{
          backgroundImage: 'radial-gradient(140% 140% at 0% 0%, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 55%), radial-gradient(140% 140% at 100% 100%, rgba(94,234,212,0.50) 0%, rgba(94,234,212,0) 55%), linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.75)',
          boxShadow:
            '0 8px 32px rgba(31, 38, 135, 0.15), 0 0 16px rgba(168, 85, 247, 0.18), 0 0 16px rgba(45, 212, 191, 0.16), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Üstteki hafif parlama efekti */}
        <div
          className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.25), transparent)',
          }}
        />

        {/* Sol Taraf: Geri Butonu (varsa) ve Uygulama Logosu */}
        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {canGoBack && onGoBack && (
            <button
              type="button"
              id="btn-header-back"
              onClick={() => {
                playTapSound();
                onGoBack();
              }}
              title="Bir önceki ekrana dön"
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-white/75 hover:bg-white text-slate-900 border border-white/90 shadow-xs text-[11px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-indigo-700 stroke-[2.5]" />
              <span>Geri</span>
            </button>
          )}
          <img
            src="/logo-header.png"
            alt="Haftalık Ekran Süresi"
            className="h-[35px] sm:h-10 w-auto max-w-[116px] sm:max-w-[155px] object-contain select-none transition-transform hover:scale-105 drop-shadow-2xs"
            draggable={false}
          />
        </div>

        {/* Orta Alan: Logo ile İlk Buton (Mesaj) Arasında Ortalanmış Veli / Rol Başlığı */}
        <div className="relative z-10 flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
          {isParent && !isImpersonatingParent && (
            <div className="flex flex-col items-center justify-center text-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-2xl bg-white/65 backdrop-blur-md border border-white/75 shadow-[0_4px_14px_rgba(0,0,0,0.12)] max-w-full">
              <span className="text-[9.5px] sm:text-[10px] font-black text-indigo-700 tracking-wider uppercase leading-none">
                Merhaba
              </span>
              <span className="text-[11px] sm:text-xs font-black text-slate-900 tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                {cleanParentName}
              </span>
            </div>
          )}

          {isSuperAdmin && (
            <div className="flex flex-col items-center justify-center text-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-2xl bg-white/65 backdrop-blur-md border border-white/75 shadow-[0_4px_14px_rgba(0,0,0,0.12)] max-w-full">
              <div className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10px] font-black text-rose-700 tracking-wider uppercase leading-none">
                <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                <span>Yönetici</span>
              </div>
              <span className="text-[11px] sm:text-xs font-black text-slate-900 tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                {adminDisplayName}
              </span>
            </div>
          )}

          {isTeacher && !currentUser?.institutionAdminCode && (
            <div className="flex flex-col items-center justify-center text-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-2xl bg-white/65 backdrop-blur-md border border-white/75 shadow-[0_4px_14px_rgba(0,0,0,0.12)] max-w-full">
              <span className="text-[9.5px] sm:text-[10px] font-black text-indigo-700 tracking-wider uppercase leading-none">
                Sayın
              </span>
              <span className="text-[11px] sm:text-xs font-black text-slate-900 tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                {teacherDisplayName}
              </span>
            </div>
          )}

          {isStudentOnly && (
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs sm:text-sm font-bold shadow-2xs">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600" />
              <span>Öğrenci</span>
            </div>
          )}
        </div>

        {/* Sağ Taraf: Kapsül İçinde 4 Buton (Mesaj, Rehber, Ses, Ayarlar) ve Dışında Çıkış Butonu */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Kapsül: 4 İkon (Buzlu cam kapsül) */}
          <div className="flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/60 hover:bg-white/75 border border-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur-md">
            {/* 2. Uygulama Rehberi (Nasıl Kullanılır?) */}
            {onOpenParentGuide && (
              <button
                type="button"
                id="btn-header-parent-guide"
                onClick={() => {
                  playTapSound();
                  onOpenParentGuide();
                }}
                title="Uygulama Rehberi (Nasıl Kullanılır?)"
                className="text-slate-700 hover:text-emerald-600 transition-colors cursor-pointer active:scale-95 flex items-center justify-center p-0.5"
              >
                <HelpCircle className="w-4 h-4" strokeWidth={1.9} />
              </button>
            )}

            {/* 3. Dokunma Sesi Aç / Kapat */}
            <button
              type="button"
              id="btn-header-toggle-sound"
              onClick={() => {
                const nowOn = toggleSound();
                setSoundOn(nowOn);
              }}
              title={soundOn ? 'Dokunma Sesini Kapat' : 'Dokunma Sesini Aç'}
              className="text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer active:scale-95 flex items-center justify-center p-0.5"
            >
              {soundOn ? (
                <Volume2 className="w-4 h-4 text-indigo-600" strokeWidth={1.9} />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" strokeWidth={1.9} />
              )}
            </button>

            {/* 4. Ayarlar */}
            {onOpenClassSetup && (
              <button
                type="button"
                id="btn-open-class-settings"
                onClick={() => {
                  playTapSound();
                  onOpenClassSetup();
                }}
                title="Sınıf ve Profil Ayarları"
                className="text-slate-700 hover:text-slate-900 transition-colors cursor-pointer active:scale-95 flex items-center justify-center p-0.5"
              >
                <Settings className="w-4 h-4" strokeWidth={1.9} />
              </button>
            )}
          </div>

          {/* 5. Çıkış Yap Butonu (Kapsülün hemen sağında) */}
          {currentUser && (
            <button
              type="button"
              id="btn-signout"
              onClick={() => {
                playTapSound();
                if (onSignOut) {
                  onSignOut();
                } else {
                  signOutUser();
                }
              }}
              title="Çıkış Yap"
              className="text-slate-700 hover:text-rose-600 hover:bg-white/40 rounded-xl p-1 sm:p-1.5 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.9} />
            </button>
          )}
        </div>
      </div>

      {/* Üstteki çerçevenin hemen altına yanyana sığacak şekilde uzun bir şekilde yayılmış Veli Görünümü ve Öğretmen Paneli butonları */}
      {isImpersonatingParent && onExitParentImpersonation && (
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200 select-none">
          {/* 1. Veli Görünümü Kartı (Öğrenci / Veli Adı) */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-2xl border backdrop-blur-md min-w-0 overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              borderColor: 'rgba(255, 255, 255, 0.90)',
              boxShadow:
                '0 4px 14px rgba(31, 38, 135, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
            }}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-black text-indigo-700 uppercase tracking-wider block leading-none">
                Veli Görünümü
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 truncate block mt-0.5 leading-tight [font-family:inherit]">
                {currentUser?.studentName || cleanParentName}
              </span>
            </div>
          </div>

          {/* 2. Öğretmen Paneli Butonu */}
          <button
            type="button"
            id="btn-return-to-teacher-account"
            onClick={() => {
              playTapSound();
              onExitParentImpersonation?.();
            }}
            title="Öğretmen paneline geri dön"
            className="flex items-center justify-center gap-2 px-3 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md border border-indigo-400/90 transition-all cursor-pointer min-w-0"
            style={{
              boxShadow:
                '0 4px 16px rgba(79, 70, 229, 0.40), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
            }}
          >
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5] flex-shrink-0" />
            <span className="truncate">Öğretmen Paneli</span>
          </button>
        </div>
      )}

      {/* Öğretmen Modunda Kurum Admini: Üstteki çerçevenin hemen altına yanyana sığacak şekilde uzun bir şekilde yayılmış */}
      {!isImpersonatingParent && isTeacher && currentUser?.institutionAdminCode && (
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200 select-none">
          {/* 1. Öğretmen Bilgisi Kartı (Sayın [İsim]) */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-2xl border backdrop-blur-md min-w-0 overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              borderColor: 'rgba(255, 255, 255, 0.90)',
              boxShadow:
                '0 4px 14px rgba(31, 38, 135, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
            }}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <GraduationCap className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-700 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-black text-indigo-700 uppercase tracking-wider block leading-none">
                Sayın
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 truncate block mt-0.5 leading-tight [font-family:inherit]">
                {teacherDisplayName}
              </span>
            </div>
          </div>

          {/* 2. Sınıf ve Admin Butonları (Yanyana eşit genişlikte yayılmış) */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 items-center">
            {onSelectClass && (
              <button
                type="button"
                id="btn-header-select-class"
                onClick={() => {
                  playTapSound();
                  onSelectClass();
                }}
                title="Farklı bir sınıf seç"
                className="w-full h-full min-h-[36px] sm:min-h-[40px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-2xl text-xs font-black bg-white/80 hover:bg-white text-slate-800 border border-slate-300 shadow-xs active:scale-95 transition-all cursor-pointer min-w-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="truncate">Sınıf</span>
              </button>
            )}
            {onSwitchRole && (
              <button
                type="button"
                id="btn-header-switch-admin"
                onClick={() => {
                  playTapSound();
                  onSwitchRole('admin');
                }}
                title="Yönetici paneline dön"
                className="w-full h-full min-h-[36px] sm:min-h-[40px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md border border-rose-400/90 transition-all cursor-pointer min-w-0"
                style={{
                  boxShadow:
                    '0 4px 14px rgba(225, 29, 72, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
                }}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="truncate">Admin</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};