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
} from 'lucide-react';

interface ParentClassroomViewProps {
  userProfile: UserProfile | null;
  classroom: ClassroomInfo | null;
  onOpenClassSetup: () => void;
  onSwitchToTeacher?: () => void;
  isTeacher?: boolean;
  onSignOut?: () => void;
}

export const ParentClassroomView: React.FC<ParentClassroomViewProps> = ({
  userProfile,
  classroom,
  onOpenClassSetup,
  onSwitchToTeacher,
  isTeacher = false,
  onSignOut,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(userProfile?.studentName || userProfile?.displayName || '');
  const [savingName, setSavingName] = useState(false);

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

  return (
    <div className="flex-1 flex flex-col justify-between gap-2.5">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
          <School className="w-4 h-4 text-emerald-600" />
          <span>Sınıfım & Öğrenci Bilgileri</span>
        </h3>

        <button
          type="button"
          onClick={onOpenClassSetup}
          className="text-xs font-black text-sky-600 hover:text-sky-700 underline cursor-pointer"
        >
          Sınıfı Değiştir
        </button>
      </div>

      {/* 2. Classroom Status Card */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 flex-shrink-0">
              <School className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  {userProfile?.className || classroom?.className || 'Bağlı Sınıf Yok'}
                </h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Canlı Senkronize
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-0.5">
                Öğretmen: {classroom?.teacherName || 'Sınıf Öğretmeni'}
              </p>
              {(userProfile?.institutionName || classroom?.institutionName) && (
                <p className="text-[11px] text-rose-700 font-bold mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-rose-500" />
                  <span>Kurum: {userProfile?.institutionName || classroom?.institutionName}</span>
                </p>
              )}
            </div>
          </div>

          {userProfile?.classCode && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block">Sınıf Kodu</span>
              <span className="text-xs font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                {userProfile.classCode}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Student Name Editing Card */}
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

      {/* 4. Action Buttons */}
      <div className="flex items-center gap-2">
        {isTeacher && onSwitchToTeacher && (
          <button
            type="button"
            onClick={onSwitchToTeacher}
            className="btn-3d-palette-primary flex-1 py-2 sm:py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Öğretmen Paneline Geç</span>
          </button>
        )}

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
          className="btn-3d-white px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-black text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer ml-auto active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </div>
  );
};
