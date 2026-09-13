import React, { useState } from 'react';
import { UserProfile } from '../types';
import { signOutUser } from '../lib/firebase';
import {
  Users,
  LogOut,
  GraduationCap,
  KeyRound,
  Settings,
  School,
  Copy,
  Check,
  ShieldAlert,
  Building2,
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
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isAdmin,
  memberCount,
  onOpenClassSetup,
  onSignOut,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedInst, setCopiedInst] = useState(false);
  const isTeacher = isAdmin || currentUser?.role === 'teacher' || currentUser?.userType === 'teacher';
  const isSuperAdmin = currentUser?.role === 'admin';
  const stage = currentUser?.currentWeekStage ?? 0;
  const isRed = stage >= 14;
  const mascotImg = stage >= 13 ? '/keu.png' : stage >= 8 ? '/kedu.png' : '/kedd.png';

  const handleCopyCode = () => {
    if (!currentUser?.classCode) return;
    navigator.clipboard.writeText(currentUser.classCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInstCode = () => {
    if (!currentUser?.institutionCode) return;
    navigator.clipboard.writeText(currentUser.institutionCode);
    setCopiedInst(true);
    setTimeout(() => setCopiedInst(false), 2000);
  };

  const className = currentUser?.className || '2-C Sınıfı';

  return (
    <header className="flex-shrink-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* Left: Mascot, Title & Clean Class Pill (Strictly Single Line) */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-50 shadow-2xs">
            <img
              src={mascotImg}
              alt="Mascot"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isRed ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight whitespace-nowrap">
              Ekran Süresi
            </h1>

            {/* Sınıf & Rol Rozeti (Tek, düzenli ve sade) */}
            {isTeacher ? (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white shadow-2xs whitespace-nowrap">
                  <School className="w-3 h-3 text-indigo-300" />
                  <span>{className}</span>
                </span>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                    <ShieldAlert className="w-3 h-3 text-rose-600" />
                    <span>Admin</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                    <GraduationCap className="w-3 h-3 text-indigo-600" />
                    <span>Öğretmen</span>
                  </span>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black bg-slate-800 text-white shadow-2xs whitespace-nowrap">
                <School className="w-3 h-3 text-emerald-300" />
                <span>{className}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Streamlined Actions (Single Line, No Stacking) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Admin veya Öğretmen için: Kurum Kodu */}
          {currentUser?.institutionCode && (
            <button
              type="button"
              onClick={handleCopyInstCode}
              title="Kurum kodunu kopyalamak için tıklayın"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-black bg-rose-950 text-rose-200 border border-rose-800 hover:bg-rose-900 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Building2 className="w-3 h-3 text-rose-400 flex-shrink-0" />
              <span className="font-mono">{currentUser.institutionCode}</span>
              {copiedInst ? (
                <Check className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-rose-300 flex-shrink-0" />
              )}
            </button>
          )}

          {/* Öğretmen için: Tek satırda şık sınıf kodu ve üye sayısı */}
          {isTeacher && currentUser?.classCode && (
            <button
              type="button"
              onClick={handleCopyCode}
              title="Sınıf kodunu kopyalamak için tıklayın"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-900 text-white border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="font-mono">{currentUser.classCode}</span>
              <span className="text-[10px] font-bold text-slate-300 pl-0.5 border-l border-slate-600">
                {memberCount} üye
              </span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              ) : (
                <Copy className="w-3 h-3 text-slate-300 flex-shrink-0" />
              )}
            </button>
          )}

          {/* Öğrenci/Veli için: İsteğe bağlı sade üye sayısı (mobilde yer kaplamaz) */}
          {!isTeacher && memberCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
              <Users className="w-3 h-3 text-slate-500" />
              <span>{memberCount} Öğrenci</span>
            </span>
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
