import React from 'react';
import { UserProfile } from '../types';
import { signOutUser } from '../lib/firebase';
import {
  Check,
  Mail,
  HelpCircle,
  Settings,
  LogOut,
  ShieldAlert,
  GraduationCap,
  User,
  RefreshCw,
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
  onOpenInbox?: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenClassSetup,
  onSignOut,
  onSwitchRole,
  onSelectClass,
  onOpenParentGuide,
  onOpenInbox,
  unreadCount = 0,
}) => {
  const isSuperAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';
  const isStudentOnly = !isSuperAdmin && !isTeacher && (currentUser?.role === 'student' || currentUser?.userType === 'student');
  const isParent = !isSuperAdmin && !isTeacher && !isStudentOnly;

  return (
    <header className="flex-shrink-0 z-40 px-2.5 sm:px-4 pt-2 sm:pt-2.5 pb-1 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto w-full select-none">
      {/* Frosted Glass Top Bar */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between select-none"
        style={{
          background: 'rgba(255, 255, 255, 0.20)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Üstteki hafif parlama efekti */}
        <div
          className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.25), transparent)',
          }}
        />

        {/* Sol Taraf: Uygulama Logosu */}
        <div className="relative z-10 flex items-center flex-shrink-0">
          <img
            src="/logo-header.png"
            alt="Haftalık Ekran Süresi"
            className="h-7 sm:h-8 w-auto max-w-[110px] sm:max-w-[130px] object-contain select-none transition-transform hover:scale-105 drop-shadow-2xs"
            draggable={false}
          />
        </div>

        {/* Orta Alan: Logo ile İlk Buton (Mesaj) Arasında Ortalanmış Veli / Rol Başlığı */}
        <div className="relative z-10 flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
          {isParent && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-md hover:bg-white/90 border border-white/80 text-emerald-800 shadow-2xs transition-colors">
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.8]" />
              <span className="font-bold text-xs sm:text-sm tracking-tight text-emerald-800">Veli</span>
              {currentUser?.className && (
                <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-700 ml-0.5">
                  ({currentUser.className})
                </span>
              )}
            </div>
          )}

          {isSuperAdmin && (
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
              <span>Yönetici</span>
              {currentUser?.institutionName && (
                <span className="hidden sm:inline-block text-[11px] text-rose-600/80 ml-1">
                  ({currentUser.institutionName})
                </span>
              )}
            </div>
          )}

          {isTeacher && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs sm:text-sm font-bold shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                <span>Öğretmen</span>
                {currentUser?.className && (
                  <span className="hidden sm:inline-block text-[11px] text-indigo-600/80 ml-1">
                    ({currentUser.className})
                  </span>
                )}
              </div>
              {currentUser?.institutionAdminCode && (
                <div className="inline-flex items-center gap-1">
                  {onSelectClass && (
                    <button
                      type="button"
                      onClick={onSelectClass}
                      title="Farklı bir sınıf seç"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-2.5 h-2.5 text-slate-500" />
                      <span>Sınıf</span>
                    </button>
                  )}
                  {onSwitchRole && (
                    <button
                      type="button"
                      onClick={() => onSwitchRole('admin')}
                      title="Yönetici paneline dön"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer active:scale-95"
                    >
                      <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                      <span>Admin</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {isStudentOnly && (
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs sm:text-sm font-bold shadow-2xs">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600" />
              <span>Öğrenci</span>
            </div>
          )}
        </div>

        {/* Sağ Taraf: Kapsül İçinde 3 Buton (Mesaj, Rehber, Ayarlar) ve Dışında Çıkış Butonu */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Kapsül: 3 İkon (Buzlu cam kapsül) */}
          <div className="flex items-center gap-3 sm:gap-3.5 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-white/60 hover:bg-white/75 border border-white/80 shadow-2xs backdrop-blur-md">
            {/* 1. Mesajlar / Bildirimler */}
            {onOpenInbox && (
              <button
                type="button"
                id="btn-header-inbox"
                onClick={onOpenInbox}
                title="Mesajlar ve Bildirimler"
                className="relative text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer active:scale-95 flex items-center justify-center p-0.5"
              >
                <Mail className="w-4 h-4" strokeWidth={1.9} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
            )}

            {/* 2. Uygulama Rehberi (Nasıl Kullanılır?) */}
            {onOpenParentGuide && (
              <button
                type="button"
                id="btn-header-parent-guide"
                onClick={onOpenParentGuide}
                title="Uygulama Rehberi (Nasıl Kullanılır?)"
                className="text-slate-700 hover:text-emerald-600 transition-colors cursor-pointer active:scale-95 flex items-center justify-center p-0.5"
              >
                <HelpCircle className="w-4 h-4" strokeWidth={1.9} />
              </button>
            )}

            {/* 3. Ayarlar */}
            {onOpenClassSetup && (
              <button
                type="button"
                id="btn-open-class-settings"
                onClick={onOpenClassSetup}
                title="Sınıf ve Profil Ayarları"
                className="text-slate-700 hover:text-slate-900 transition-colors cursor-pointer active:scale-95 flex items-center justify-center p-0.5"
              >
                <Settings className="w-4 h-4" strokeWidth={1.9} />
              </button>
            )}
          </div>

          {/* 4. Çıkış Yap Butonu (Kapsülün hemen sağında) */}
          {currentUser && (
            <button
              type="button"
              id="btn-signout"
              onClick={() => {
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
    </header>
  );
};
