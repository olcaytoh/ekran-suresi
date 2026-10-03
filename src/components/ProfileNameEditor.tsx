import React from 'react';
import { UserRound } from 'lucide-react';

interface ProfileNameFieldsProps {
  /** Öğretmen / yönetici: tek "Ad Soyad" alanı */
  fullName: string;
  onFullNameChange: (value: string) => void;
  accentRingClass?: string;
}

/**
 * Ayarlar pencerelerindeki "Ad Soyad" alanı.
 * Kendi kaydet düğmesi yoktur: değer, pencerenin "Değişiklikleri Kaydet" düğmesiyle kaydedilir.
 */
export const ProfileNameFields: React.FC<ProfileNameFieldsProps> = ({
  fullName,
  onFullNameChange,
  accentRingClass = 'focus:ring-indigo-500',
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
      <UserRound className="w-3.5 h-3.5 text-indigo-600" />
      Adınız Soyadınız:
    </label>
    <input
      type="text"
      id="input-profile-full-name"
      value={fullName}
      onChange={(e) => onFullNameChange(e.target.value)}
      placeholder="Örn: Ayşe Demir"
      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 ${accentRingClass} focus:bg-white focus:outline-none placeholder:text-slate-400`}
      required
    />
  </div>
);