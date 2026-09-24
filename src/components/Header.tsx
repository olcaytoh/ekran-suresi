import React from 'react';
import { UserProfile } from '../types';
import { signOutUser } from '../lib/firebase';
import {
  Users,
  LogOut,
  GraduationCap,
  Settings,
  School,
  ShieldAlert,
  HeartHandshake,
  User,
  HelpCircle,
  RefreshCw,
  Bell,
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
  isAdmin,
  memberCount,
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
    <header className="flex-shrink-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-1 sm:py-1.5 flex items-center justify-between gap-2 min-h-[48px] sm:min-h-[52px]">
        {/* Sol Taraf: Logo */}
        <div className="flex items-center flex-shrink-0">
          <img
            src="/logo-header.png"
            alt="Logo"
            className="h-10 sm:h-12 w-auto max-w-[85px] sm:max-w-[105px] object-contain block select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Orta Taraf: Soldaki Logo ile Sağdaki Butonlar (Mesajlar İkonu) Arasında Tam Ortalanmış Başlık */}
        <div className="flex-1 flex items-center justify-center px-1 min-w-0">
          {isSuperAdmin && (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-rose-600 text-white shadow-2xs whitespace-nowrap">
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
                <span>Yönetici</span>
              </span>
              {currentUser?.institutionName && (
                <span className="hidden sm:inline-block text-[10px] font-bold text-slate-500 truncate max-w-[150px] mt-0.5">
                  {currentUser.institutionName}
                </span>
              )}
            </div>
          )}

          {isTeacher && (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-indigo-600 text-white shadow-2xs whitespace-nowrap">
                  <GraduationCap className="w-3.5 h-3.5 text-white" />
                  <span>Öğretmen</span>
                </span>
                {currentUser?.className && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-2xs whitespace-nowrap">
                    <School className="w-3 h-3 text-indigo-300" />
                    <span>{currentUser.className}</span>
                  </span>
                )}
              </div>
              {/* Admin yetkisine sahip kullanıcı öğretmen modundaysa sınıf değiştirme ve yönetici paneline dönme butonları */}
              {currentUser?.institutionAdminCode && (
                <div className="inline-flex items-center gap-1 mt-0.5 flex-wrap justify-center">
                  {onSelectClass && (
                    <button
                      type="button"
                      onClick={onSelectClass}
                      title="Farklı bir sınıf seç"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap"
                    >
                      <RefreshCw className="w-2.5 h-2.5 text-slate-600" />
                      <span>Sınıf Değiştir</span>
                    </button>
                  )}
                  {onSwitchRole && (
                    <button
                      type="button"
                      onClick={() => onSwitchRole('admin')}
                      title="Yönetici paneline geri dön"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap"
                    >
                      <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                      <span>Yönetici Paneli</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {isParent && (
            <div className="flex items-center gap-1.5 justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-emerald-600 text-white shadow-2xs whitespace-nowrap">
                <HeartHandshake className="w-3.5 h-3.5 text-white" />
                <span>Veli</span>
              </span>
              {currentUser?.className && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold bg-slate-800 text-white shadow-2xs whitespace-nowrap">
                  <School className="w-3 h-3 text-emerald-300" />
                  <span>{currentUser.className}</span>
                </span>
              )}
            </div>
          )}

          {isStudentOnly && (
            <div className="flex items-center gap-1.5 justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-sky-600 text-white shadow-2xs whitespace-nowrap">
                <User className="w-3.5 h-3.5 text-white" />
                <span>Öğrenci</span>
              </span>
            </div>
          )}
        </div>

        {/* Sağ Taraf: Aksiyonlar & Bilgiler */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Sınıf üye sayısı (mobilde gizli, masaüstünde görünür) */}
          {!isSuperAdmin && memberCount > 0 && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
              <Users className="w-3 h-3 text-slate-500" />
              <span>{memberCount} Öğrenci</span>
            </span>
          )}

          {/* Gelen Kutusu / Bildirimler Butonu */}
          {onOpenInbox && (
            <button
              type="button"
              id="btn-header-inbox"
              onClick={onOpenInbox}
              title="Mesajlar ve Bildirimler"
              className="relative w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer active:scale-95 shadow-2xs"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Veli Bilgilendirme Rehberi Butonu */}
          {!isTeacher && !isSuperAdmin && onOpenParentGuide && (
            <button
              type="button"
              id="btn-header-parent-guide"
              onClick={onOpenParentGuide}
              title="Uygulama Rehberi (Nasıl ve Ne Amaçla Kullanılır?)"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Nasıl Kullanılır?</span>
            </button>
          )}

          {/* Sınıf / Profil Ayarları Butonu */}
          {onOpenClassSetup && (
            <button
              type="button"
              id="btn-open-class-settings"
              onClick={onOpenClassSetup}
              title="Sınıf ve Rol Ayarları"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Çıkış Yap Butonu */}
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
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
