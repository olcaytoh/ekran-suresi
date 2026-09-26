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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto shadow-2xl relative overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.75)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        }}
      >
        {/* Specular gloss highlight */}
        <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-3xl" />
        
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-200/60">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-rose-600 shadow-xs"
              style={{
                background: 'rgba(255, 241, 242, 0.8)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
              }}
            >
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
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Geri bildirim mesajları */}
        {error && (
          <div
            className="relative z-10 p-3 rounded-2xl text-xs font-semibold text-rose-700 flex items-start gap-2 shadow-xs"
            style={{
              background: 'rgba(255, 241, 242, 0.85)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="relative z-10 p-3 rounded-2xl text-xs font-semibold text-emerald-700 flex items-start gap-2 shadow-xs"
            style={{
              background: 'rgba(236, 253, 245, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveSettings} className="relative z-10 space-y-4">
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
              className="w-full px-3.5 py-2.5 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all placeholder:text-slate-400"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(203, 213, 225, 0.8)',
              }}
              required
            />
          </div>

          {/* Kurum Kodu Alanı (Sadece Kurum Kodu Oluştur ve Yönet) */}
          <div
            className="p-3.5 rounded-2xl space-y-2.5"
            style={{
              background: 'rgba(255, 241, 242, 0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                Öğretmen Katılım Kodu
              </span>
              {institutionCode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200/80 text-rose-900 border border-rose-300/60">
                  Aktif Kod
                </span>
              )}
            </div>

            {institutionCode ? (
              <div className="space-y-2">
                <div
                  className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                  }}
                >
                  <span className="text-lg font-mono font-black text-rose-800 tracking-wider">
                    {institutionCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
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
                  <p className="text-[10.5px] text-slate-600 font-medium">
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
                <p className="text-xs text-slate-700 font-medium">
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
              className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-extrabold bg-slate-200/70 hover:bg-slate-300/80 text-slate-800 transition-colors cursor-pointer border border-slate-300/50"
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
