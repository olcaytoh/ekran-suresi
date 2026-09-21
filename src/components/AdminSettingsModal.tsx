import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  createInstitution,
  updateInstitutionName,
  regenerateInstitutionCode,
} from '../lib/firebase';
import {
  Building2,
  KeyRound,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  X,
  School,
} from 'lucide-react';

interface AdminSettingsModalProps {
  currentUser: UserProfile;
  onCompleted: () => void;
  onCancel: () => void;
  isDemo?: boolean;
  onDemoProfileUpdate?: (updates: Partial<UserProfile>) => void;
}

function generateDemoCode(prefix: string): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  currentUser,
  onCompleted,
  onCancel,
  isDemo = false,
  onDemoProfileUpdate,
}) => {
  const [institutionName, setInstitutionName] = useState(
    currentUser.institutionName || 'AKÇAKOCA İLKOKULU'
  );
  const [institutionCode, setInstitutionCode] = useState<string | null>(
    currentUser.institutionCode || null
  );
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCopyCode = () => {
    if (!institutionCode) return;
    navigator.clipboard.writeText(institutionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Kurum Kodu Oluştur veya Yeni Kod Üret
  const handleGenerateInstitutionCode = async () => {
    if (!institutionName.trim()) {
      setError('Lütfen önce bir okul / kurum adı giriniz.');
      return;
    }

    try {
      setGeneratingCode(true);
      setError(null);
      setSuccessMsg(null);

      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        const newCode = generateDemoCode('KRM');
        setInstitutionCode(newCode);
        onDemoProfileUpdate?.({
          institutionName: institutionName.trim(),
          institutionCode: newCode,
          institutionId: currentUser.institutionId || 'demo-institution-1',
          role: 'admin',
          userType: 'teacher',
        });
        setSuccessMsg(`Yeni Kurum Kodu başarıyla oluşturuldu: ${newCode}`);
        return;
      }

      if (currentUser.institutionId) {
        // Mevcut kurum için yeni kod üret
        const newCode = await regenerateInstitutionCode(
          currentUser.institutionId,
          currentUser.uid
        );
        setInstitutionCode(newCode);
        setSuccessMsg(`Kurum kodunuz güncellendi: ${newCode}`);
      } else {
        // Henüz kurum kaydı yoksa yeni kurum ve kod oluştur
        const inst = await createInstitution(
          currentUser.uid,
          currentUser.displayName || 'Yönetici',
          currentUser.email || '',
          institutionName.trim()
        );
        setInstitutionCode(inst.code);
        setSuccessMsg(`Kurum oluşturuldu! Kurum Kodunuz: ${inst.code}`);
      }
    } catch (err: any) {
      console.error('Generate institution code error:', err);
      setError(err.message || 'Kurum kodu oluşturulurken bir hata oluştu.');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Kurum Adını Kaydet
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = institutionName.trim();
    if (!trimmedName) {
      setError('Lütfen geçerli bir okul / kurum adı girin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      if (isDemo) {
        await new Promise((r) => setTimeout(r, 300));
        onDemoProfileUpdate?.({
          institutionName: trimmedName,
          institutionCode: institutionCode || currentUser.institutionCode || 'KRM-1071',
          role: 'admin',
        });
        setSuccessMsg('Kurum ayarlarınız başarıyla kaydedildi.');
        setTimeout(() => onCompleted(), 1000);
        return;
      }

      if (currentUser.institutionId) {
        await updateInstitutionName(currentUser.institutionId, currentUser.uid, trimmedName);
        setSuccessMsg('Kurum adı başarıyla güncellendi.');
        setTimeout(() => onCompleted(), 1000);
      } else {
        const inst = await createInstitution(
          currentUser.uid,
          currentUser.displayName || 'Yönetici',
          currentUser.email || '',
          trimmedName
        );
        setInstitutionCode(inst.code);
        setSuccessMsg(`Kurum oluşturuldu! Kurum Kodunuz: ${inst.code}`);
        setTimeout(() => onCompleted(), 1200);
      }
    } catch (err: any) {
      console.error('Save institution settings error:', err);
      setError(err.message || 'Ayarlar kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                Yönetici Ayarları
              </h2>
              <span className="text-[11px] font-bold text-rose-700 inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Kurum Sahibi / Admin
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            title="Kapat"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Geri bildirim mesajları */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Okul / Kurum Adı */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-rose-600" />
              Okul / Kurum Adı:
            </label>
            <input
              type="text"
              id="input-admin-institution-name"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Örn: Atatürk İlkokulu, Bilim Koleji..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none transition-all"
              required
            />
          </div>

          {/* Kurum Kodu Alanı (Sadece Kurum Kodu Oluştur ve Yönet) */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                Öğretmen Katılım Kodu
              </span>
              {institutionCode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200/70 text-rose-900">
                  Aktif Kod
                </span>
              )}
            </div>

            {institutionCode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2 rounded-xl border border-rose-200">
                  <span className="text-lg font-mono font-black text-rose-800 tracking-wider">
                    {institutionCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    Öğretmenler bu kodu girerek okulunuza bağlanır.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateInstitutionCode}
                    disabled={generatingCode}
                    title="Yeni Kurum Kodu Oluştur"
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${generatingCode ? 'animate-spin' : ''}`} />
                    <span>Yeni Kod Üret</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-center py-2">
                <p className="text-xs text-slate-600 font-medium">
                  Öğretmenlerinizin okulunuza bağlanabilmesi için kurum kodu oluşturun.
                </p>
                <button
                  type="button"
                  id="btn-generate-institution-code"
                  onClick={handleGenerateInstitutionCode}
                  disabled={generatingCode}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 cursor-pointer disabled:opacity-60 transition-all"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{generatingCode ? 'Oluşturuluyor...' : 'Kurum Kodu Oluştur'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Kapat
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
