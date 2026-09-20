import React, { useState } from 'react';
import { ShieldAlert, KeyRound, ArrowRight, X, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

interface AdminCodePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (adminCode: string) => Promise<void>;
  currentAdminCode?: string;
}

export const AdminCodePromptModal: React.FC<AdminCodePromptModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  currentAdminCode,
}) => {
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = adminCodeInput.trim().toUpperCase();

    if (!cleaned) {
      setError('Lütfen kurumunuza ait Admin Kodunu giriniz.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onVerify(cleaned);
      setSuccess('Admin kodu başarıyla doğrulandı! Yönetici paneline geçiliyor...');
      setTimeout(() => {
        setSuccess(null);
        setAdminCodeInput('');
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Geçersiz Admin Kodu! Yönetici yetkisi doğrulanamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setSuccess(null);
    setAdminCodeInput('');
    onClose();
  };

  return (
    <div
      id="modal-admin-code-prompt-overlay"
      className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="modal-admin-code-prompt"
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 relative"
      >
        {/* Kapat Butonu */}
        <button
          type="button"
          id="btn-close-admin-code-prompt"
          onClick={handleCancel}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Başlık */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Kurum Yönetici Moduna Dön
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Yönetici moduna geçebilmek için lütfen kurumunuza ait <span className="font-bold text-rose-700">Admin Kodunu (ADM-XXXX)</span> giriniz. Admin kodu girilmeden yönetici paneline geçilemez.
            </p>
          </div>
        </div>

        {/* Hata & Başarı Mesajları */}
        {error && (
          <div
            id="admin-prompt-error"
            className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div
            id="admin-prompt-success"
            className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2 animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="font-bold">{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                Kurum Admin Yetki Kodu:
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Zorunlu</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="input-prompt-admin-code"
                value={adminCodeInput}
                onChange={(e) => {
                  setAdminCodeInput(e.target.value.toUpperCase());
                  if (error) setError(null);
                }}
                placeholder="Örn: ADM-2090"
                maxLength={12}
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-base font-mono uppercase tracking-widest text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:bg-white text-center font-black"
                required
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Kurum yöneticisi oluştururken belirlenen <strong className="text-slate-700">ADM-</strong> ile başlayan koddur.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              id="btn-cancel-admin-prompt"
              onClick={handleCancel}
              disabled={loading}
              className="btn-3d-white flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              id="btn-submit-admin-prompt"
              disabled={loading || !adminCodeInput.trim()}
              className="btn-3d-rose flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Doğrulanıyor...' : 'Doğrula ve Yöneticiye Dön'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
