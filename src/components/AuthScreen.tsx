import React, { useState } from 'react';
import { signInWithGoogle, signInAsGuest } from '../lib/firebase';
import {
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  Clock,
  School,
  Check,
  Copy,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface AuthScreenProps {
  onSuccess?: () => void;
  onDemoLogin?: (role: 'teacher' | 'parent' | 'admin') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onDemoLogin }) => {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Giriş yapılıyor...');
  const [error, setError] = useState<string | null>(null);
  const [promptWarning, setPromptWarning] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);

  // Remember previously chosen role from localStorage if any
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'parent' | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pendingUserRole');
      if (stored === 'teacher' || stored === 'parent') return stored;
    }
    return null;
  });

  const handleSelectRole = (role: 'teacher' | 'parent') => {
    setSelectedRole(role);
    setPromptWarning(false);
    setError(null);
    localStorage.setItem('pendingUserRole', role);
  };

  const handleGoogleLogin = async () => {
    if (!selectedRole) {
      setPromptWarning(true);
      setError('Lütfen önce yukarıdaki Öğretmen veya Veli butonuna dokunarak rolünüzü seçin.');
      return;
    }

    try {
      setLoading(true);
      setLoadingText(
        selectedRole === 'teacher'
          ? 'Öğretmen olarak Google ile giriş yapılıyor...'
          : 'Veli olarak Google ile giriş yapılıyor...'
      );
      setError(null);
      setPromptWarning(false);
      localStorage.setItem('pendingUserRole', selectedRole);
      const user = await signInWithGoogle();
      if (!user) {
        // User closed or dismissed the popup
        return;
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        console.info('Google Sign-in popup was dismissed by user.');
        return;
      }
      console.error('Google Sign-in failed:', err);
      if (
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain')
      ) {
        setUnauthorizedDomain(typeof window !== 'undefined' ? window.location.hostname : 'run.app');
        setError(null);
      } else if (
        err?.code === 'auth/admin-restricted-operation' ||
        err?.message?.includes('admin-restricted-operation')
      ) {
        setError(
          'Firebase Authentication ayarlarında "Google" sağlayıcısı henüz aktif edilmemiş veya yeni kullanıcı kaydı (Sign-up) sınırlandırılmış. Firebase Console > Authentication > Sign-in method sekmesinden Google sağlayıcısını etkinleştirin.'
        );
      } else if (err.code === 'auth/popup-blocked') {
        setError('Tarayıcınız Google giriş penceresini engelledi. Lütfen açılır pencerelere izin verin veya Test Girişi butonuna dokunun.');
      } else {
        setError(err.message || 'Google ile giriş yapılırken bir sorun oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestTestLogin = async () => {
    const role = selectedRole || 'teacher';
    try {
      setLoading(true);
      setLoadingText(`${role === 'teacher' ? 'Öğretmen' : 'Veli'} test girişi yapılıyor...`);
      setError(null);
      localStorage.setItem('pendingUserRole', role);
      if (role === 'teacher') {
        await signInAsGuest('Olcayto (Öğretmen - Yönetici)');
      } else {
        await signInAsGuest('Fatma Yılmaz (Öğrenci: Ali Yılmaz)');
      }
    } catch (err: any) {
      console.warn('Firebase guest test login failed, falling back to local demo login:', err);
      if (onDemoLogin) {
        // Smoothly fall back to demo mode so user is never blocked
        onDemoLogin(role);
        return;
      }
      if (
        err?.code === 'auth/admin-restricted-operation' ||
        err?.message?.includes('admin-restricted-operation')
      ) {
        setError(
          'Firebase Console üzerinde "Anonymous (Anonim)" veya "Google" sağlayıcısı kapalı olduğu için giriş yapılamadı. Lütfen Firebase Console > Authentication > Sign-in method bölümünden giriş yöntemini açın.'
        );
      } else {
        setError(err.message || 'Giriş yapılamadı.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (!unauthorizedDomain) return;
    navigator.clipboard.writeText(unauthorizedDomain);
    setDomainCopied(true);
    setTimeout(() => setDomainCopied(false), 2500);
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col items-center justify-center p-2 bg-[#767694] relative overflow-hidden select-none">
      {/* Background soft ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#6b6b88] via-[#757593] to-[#585872] pointer-events-none" />

      {/* Main Container constrained to exact giris.png aspect ratio & fits viewport */}
      <div className="relative z-10 w-full max-w-[390px] sm:max-w-[430px] aspect-[1536/2752] max-h-[96vh] flex items-center justify-center">
        {/* The Base Design Image: giris.png */}
        <img
          src="/giris.png"
          alt="Giriş Ekranı"
          className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)] rounded-[2rem] pointer-events-none"
          draggable={false}
          referrerPolicy="no-referrer"
        />

        {/* 1. ÖĞRETMEN GİRİŞİ BUTONU (Sol Üst Kart Butonu)
            Exact Coordinates on giris.png:
            Top: 51.0%, Left: 13.5%, Width: 34.0%, Height: 18.3% */}
        <button
          type="button"
          id="btn-login-teacher"
          onClick={() => handleSelectRole('teacher')}
          disabled={loading}
          className={`absolute z-20 cursor-pointer rounded-2xl sm:rounded-3xl transition-all duration-200 active:scale-95 focus:outline-hidden ${
            selectedRole === 'teacher'
              ? 'ring-4 ring-indigo-500 bg-indigo-600/15 border-2 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.65)]'
              : promptWarning && !selectedRole
              ? 'ring-4 ring-amber-400 animate-pulse bg-amber-400/10'
              : 'hover:bg-black/5'
          }`}
          style={{
            top: '51.0%',
            left: '13.5%',
            width: '34.0%',
            height: '18.3%',
          }}
          title="Öğretmen Rolünü Seç"
          aria-label="Öğretmen Girişi"
        >
          {selectedRole === 'teacher' && (
            <div className="absolute top-2 right-2 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 shadow-md animate-in zoom-in-75">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Seçildi</span>
            </div>
          )}
          <span className="sr-only">Öğretmen Girişi</span>
        </button>

        {/* 2. VELİ GİRİŞİ BUTONU (Sağ Üst Kart Butonu)
            Exact Coordinates on giris.png:
            Top: 51.0%, Left: 52.5%, Width: 34.0%, Height: 18.3% */}
        <button
          type="button"
          id="btn-login-parent"
          onClick={() => handleSelectRole('parent')}
          disabled={loading}
          className={`absolute z-20 cursor-pointer rounded-2xl sm:rounded-3xl transition-all duration-200 active:scale-95 focus:outline-hidden ${
            selectedRole === 'parent'
              ? 'ring-4 ring-emerald-500 bg-emerald-600/15 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.65)]'
              : promptWarning && !selectedRole
              ? 'ring-4 ring-amber-400 animate-pulse bg-amber-400/10'
              : 'hover:bg-black/5'
          }`}
          style={{
            top: '51.0%',
            left: '52.5%',
            width: '34.0%',
            height: '18.3%',
          }}
          title="Veli Rolünü Seç"
          aria-label="Veli Girişi"
        >
          {selectedRole === 'parent' && (
            <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 shadow-md animate-in zoom-in-75">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Seçildi</span>
            </div>
          )}
          <span className="sr-only">Veli Girişi</span>
        </button>

        {/* 3. GOOGLE İLE GİRİŞ YAP BUTONU (Alt Hap Buton)
            Exact Coordinates on giris.png:
            Top: 71.4%, Left: 13.5%, Width: 73.0%, Height: 7.6% */}
        <button
          type="button"
          id="btn-login-google"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`absolute z-20 cursor-pointer rounded-full transition-all duration-200 active:scale-98 focus:outline-hidden ${
            selectedRole
              ? 'ring-4 ring-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.7)] bg-sky-500/15'
              : 'hover:bg-black/5'
          }`}
          style={{
            top: '71.4%',
            left: '13.5%',
            width: '73.0%',
            height: '7.6%',
          }}
          title={
            selectedRole
              ? `Google ile (${selectedRole === 'teacher' ? 'Öğretmen' : 'Veli'}) Girişi Yap`
              : 'Önce yukarıdan Öğretmen veya Veli seçin'
          }
          aria-label="Google ile Giriş Yap"
        >
          <span className="sr-only">Google ile giriş yap</span>
        </button>

        {/* 4. Alt Boşluktaki Bilgilendirme Alanı (Aşağı kayma yapmaz, kartın alt içine tam sığar)
            Top: 80.0% to 95.0%, Left: 13.0%, Width: 74.0% */}
        <div
          className="absolute z-20 pointer-events-none flex flex-col items-center justify-center text-center px-1.5"
          style={{
            top: '80.0%',
            left: '13.0%',
            width: '74.0%',
            height: '15.5%',
          }}
        >
          {/* 4 Küçük Bilgi & Admin Butonu - buton.png çerçeveleri ile */}
          <div className="grid grid-cols-4 gap-1 w-full mb-1">
            <div className="relative aspect-[1264/848] w-full flex items-center justify-center select-none">
              <img
                src="/buton.png"
                alt="14 Kademe"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-xs"
                draggable={false}
                referrerPolicy="no-referrer"
              />
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-0.5">
                <Clock className="w-2.5 h-2.5 text-emerald-700 mb-0.5" />
                <span className="text-[7.5px] sm:text-[8.5px] font-black text-slate-800 leading-tight">14 Kademe</span>
                <span className="text-[6px] sm:text-[6.5px] font-bold text-slate-600">30 dk Adım</span>
              </div>
            </div>

            <div className="relative aspect-[1264/848] w-full flex items-center justify-center select-none">
              <img
                src="/buton.png"
                alt="Canlı Sınıf"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-xs"
                draggable={false}
                referrerPolicy="no-referrer"
              />
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-0.5">
                <School className="w-2.5 h-2.5 text-indigo-700 mb-0.5" />
                <span className="text-[7.5px] sm:text-[8.5px] font-black text-slate-800 leading-tight">Canlı Sınıf</span>
                <span className="text-[6px] sm:text-[6.5px] font-bold text-slate-600">Veli Takibi</span>
              </div>
            </div>

            <div className="relative aspect-[1264/848] w-full flex items-center justify-center select-none">
              <img
                src="/buton.png"
                alt="Dengeli Süre"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-xs"
                draggable={false}
                referrerPolicy="no-referrer"
              />
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-amber-700 mb-0.5" />
                <span className="text-[7.5px] sm:text-[8.5px] font-black text-slate-800 leading-tight">Dengeli</span>
                <span className="text-[6px] sm:text-[6.5px] font-bold text-slate-600">4 Renk</span>
              </div>
            </div>

            {/* ADMİN BUTONU (Aynı stil ve tasarımda) */}
            <button
              type="button"
              id="btn-admin-access"
              onClick={() => {
                if (onDemoLogin) {
                  onDemoLogin('admin');
                } else {
                  handleGuestTestLogin();
                }
              }}
              title="Admin / Süper Yönetici Modu"
              className="relative aspect-[1264/848] w-full flex items-center justify-center select-none pointer-events-auto cursor-pointer active:scale-95 transition-transform group"
            >
              <img
                src="/buton.png"
                alt="Admin"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-xs group-hover:brightness-105"
                draggable={false}
                referrerPolicy="no-referrer"
              />
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-0.5">
                <ShieldAlert className="w-2.5 h-2.5 text-rose-600 mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[7.5px] sm:text-[8.5px] font-black text-rose-700 leading-tight">Admin</span>
                <span className="text-[6px] sm:text-[6.5px] font-bold text-rose-500">Yönetim</span>
              </div>
            </button>
          </div>

          {/* Google Play Denetçi / Test Girişi Butonu */}
          <div className="flex flex-col items-center gap-1 w-full pointer-events-auto mt-0.5">
            {/* Google Denetçisi / Şifresiz İnceleme Butonu */}
            <button
              type="button"
              id="btn-demo-reviewer-login"
              onClick={() => {
                if (onDemoLogin) {
                  onDemoLogin(selectedRole || 'teacher');
                } else {
                  handleGuestTestLogin();
                }
              }}
              className="px-3 py-1 bg-white/95 hover:bg-white text-indigo-700 hover:text-indigo-900 border border-indigo-200 hover:border-indigo-400 rounded-full text-[9px] sm:text-[10px] font-black shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>🧪 Giriş Yapmadan İncele / Test Et ({selectedRole === 'parent' ? 'Veli' : 'Öğretmen'})</span>
              <ArrowRight className="w-3 h-3 text-indigo-600" />
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-xs rounded-[2rem] flex flex-col items-center justify-center gap-3 p-4">
            <div className="bg-white/95 rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-2.5 max-w-[260px] text-center border border-slate-100">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-800">{loadingText}</p>
            </div>
          </div>
        )}

        {/* Error / Prompt Notification */}
        {error && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl shadow-lg flex flex-col gap-2 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-left leading-snug">{error}</div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Test Login fallback if popup was blocked */}
            <div className="pt-1 border-t border-rose-200/80 flex justify-end">
              <button
                type="button"
                onClick={handleGuestTestLogin}
                className="text-[11px] font-black text-indigo-700 hover:underline cursor-pointer"
              >
                Test Olarak Doğrudan Giriş Yap ({selectedRole === 'parent' ? 'Veli' : 'Öğretmen'}) →
              </button>
            </div>
          </div>
        )}
        {/* Unauthorized Domain Guide Card */}
        {unauthorizedDomain && (
          <div className="absolute top-2 left-2 right-2 bottom-2 z-50 bg-white/95 backdrop-blur-md border-2 border-amber-400 p-4 rounded-[1.8rem] shadow-2xl flex flex-col justify-between text-xs animate-in fade-in zoom-in-95">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Firebase Yetkili Etki Alanı Gerekli
                </div>
                <button
                  type="button"
                  onClick={() => setUnauthorizedDomain(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-600 leading-snug text-left">
                Firebase güvenliği gereği, web tarayıcısından veya önizlemeden Google ile giriş yapabilmek için bu adresin Firebase Console'a eklenmesi gerekir:
              </p>

              {/* Hostname with copy button */}
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300/80 rounded-xl p-2">
                <code className="text-[10.5px] font-mono text-indigo-900 flex-1 truncate select-all font-semibold">
                  {unauthorizedDomain}
                </code>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex-shrink-0"
                >
                  {domainCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Kopyala
                    </>
                  )}
                </button>
              </div>

              {/* 3 Step Instructions */}
              <div className="text-[10.5px] text-slate-700 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/70 flex flex-col gap-1 text-left">
                <span className="font-black text-amber-950">Firebase'e nasıl eklenir? (30 sn)</span>
                <span className="leading-tight">1. <b>Firebase Console</b> &gt; Authentication &gt; <b>Settings (Ayarlar)</b> sekmesini açın.</span>
                <span className="leading-tight">2. <b>Authorized domains (Yetkili etki alanları)</b> bölümünde <b>Add domain</b> butonuna tıklayın.</span>
                <span className="leading-tight">3. Yukarıdan kopyaladığınız adresi yapıştırıp kaydedin.</span>
                <span className="text-[9.5px] text-slate-500 font-medium mt-0.5">
                  *(Not: Android APK uygulamasında bu kısıtlama yoktur, telefonunuzda Google girişi doğrudan çalışır.)*
                </span>
              </div>
            </div>

            {/* Direct Demo Login Button */}
            <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setUnauthorizedDomain(null);
                  if (onDemoLogin) {
                    onDemoLogin(selectedRole || 'teacher');
                  } else {
                    handleGuestTestLogin();
                  }
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Önizlemede Hemen Giriş Yap ({selectedRole === 'parent' ? 'Veli' : 'Öğretmen'})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
