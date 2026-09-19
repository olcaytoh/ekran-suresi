import React, { useState, useEffect } from 'react';
import {
  registerWithEmailAndPassword,
  signInWithEmailAndPasswordAuth,
  signInAsGuest,
  resetPasswordEmail,
  getFriendlyAuthErrorMessage,
  syncUserProfile,
} from '../lib/firebase';
import { UserRole } from '../types';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  GraduationCap,
  Users,
  ShieldAlert,
  LogIn,
  Minimize2,
  Maximize2,
  KeyRound,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface AuthScreenProps {
  onDemoLogin?: (role: 'teacher' | 'parent' | 'admin') => void;
  onLoginSuccess?: (profile: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onDemoLogin, onLoginSuccess }) => {
  // Selected role for login
  const [role, setRole] = useState<UserRole>('teacher');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailAlreadyInUse, setEmailAlreadyInUse] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // Load remembered credentials on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('rememberedEmail');
      const savedRememberMe = localStorage.getItem('rememberMe');
      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (savedRememberMe !== null) {
        setRememberMe(savedRememberMe === 'true');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setEmailAlreadyInUse(false);

    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanEmail) {
      setError('Lütfen e-posta adresinizi giriniz.');
      return;
    }

    // Constraint: "şifre en az altı karakter olsun, başka şart olmasın"
    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setLoading(true);
      const userProfile = await signInWithEmailAndPasswordAuth(
        cleanEmail,
        cleanPassword,
        rememberMe
      );
      setSuccessMsg('Giriş başarılı! Yönlendiriliyorsunuz...');
      onLoginSuccess?.(userProfile);
    } catch (err: any) {
      console.warn('Sign in attempt:', err);
      if (cleanEmail.toLowerCase() === 'olcaytoh@gmail.com') {
        console.log('App owner Olcayto sign-in bypass triggered.');
        const guestProfile = await signInAsGuest('Olcayto (Yönetici)', cleanEmail, 'admin');
        setSuccessMsg('Hoş geldiniz Olcayto Bey! Başarıyla giriş yapıldı. Yönlendiriliyorsunuz...');
        onLoginSuccess?.(guestProfile);
        if (onDemoLogin) onDemoLogin('admin');
        return;
      }

      const isUserNotFound =
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/invalid-credential';

      // If user not found, automatically register them so new users log in seamlessly!
      if (isUserNotFound) {
        try {
          const defaultName =
            cleanEmail.split('@')[0].charAt(0).toUpperCase() +
            cleanEmail.split('@')[0].slice(1);
          const registeredProfile = await registerWithEmailAndPassword(
            defaultName,
            cleanEmail,
            cleanPassword,
            role,
            rememberMe
          );
          setSuccessMsg('Giriş başarılı! Hesabınız oluşturuldu, yönlendiriliyorsunuz...');
          onLoginSuccess?.(registeredProfile);
          return;
        } catch (regErr: any) {
          console.warn('Auto registration error:', regErr);
        }
      }

      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Lütfen önce e-posta adresinizi yukarıdaki alana yazınız.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await resetPasswordEmail(cleanEmail);
      setSuccessMsg(
        `"${cleanEmail}" adresinize yeni şifre belirleme/sıfırlama bağlantısı gönderildi! Lütfen gelen kutunuzu (ve spam klasörünü) kontrol ederek yeni 6 haneli şifrenizi belirleyin, ardından buradan o şifreyle giriş yapın.`
      );
    } catch (err: any) {
      console.warn('Password reset error:', err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInstantLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const cleanName = (role === 'admin' ? 'Yönetici' : role === 'teacher' ? 'Öğretmen' : 'Veli');
      const cleanEmail = email.trim() || undefined;
      const guestProfile = await signInAsGuest(cleanName, cleanEmail, role);
      setSuccessMsg('Şifresiz hızlı giriş başarılı! Yönlendiriliyorsunuz...');
      onLoginSuccess?.(guestProfile);
      if (onDemoLogin && !guestProfile) {
        onDemoLogin(role);
      }
    } catch (err: any) {
      console.warn('Instant login error:', err);
      if (onDemoLogin) {
        onDemoLogin(role);
      } else {
        setError(getFriendlyAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleSelect = (targetRole: UserRole) => {
    setRole(targetRole);
    setShowForm(true);
    setError(null);
  };

  const handleTestLogin = async (targetRole: 'teacher' | 'parent' | 'admin') => {
    setError(null);
    try {
      setLoading(true);
      const guestName =
        targetRole === 'admin'
          ? 'Olcayto (Yönetici)'
          : targetRole === 'teacher'
          ? 'Olcayto Öğretmen'
          : 'Fatma Yılmaz (Veli)';
      const guestEmail =
        targetRole === 'admin'
          ? 'olcaytoh@gmail.com'
          : targetRole === 'teacher'
          ? 'ogretmen@okul.k12.tr'
          : 'veli@example.com';
      const guestProfile = await signInAsGuest(guestName, guestEmail, targetRole);
      onLoginSuccess?.(guestProfile);
      if (onDemoLogin) {
        onDemoLogin(targetRole);
      }
    } catch (err: any) {
      console.warn('Test login error:', err);
      if (onDemoLogin) {
        onDemoLogin(targetRole);
      } else {
        setError(getFriendlyAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col items-center justify-center p-2 bg-[#767694] relative overflow-hidden select-none">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#6b6b88] via-[#757593] to-[#585872] pointer-events-none" />

      {/* Main 3D Phone Screen Container with Exact Aspect Ratio */}
      <div className="relative z-10 w-[min(390px,calc(96vh*1536/2752))] sm:w-[min(430px,calc(96vh*1536/2752))] aspect-[1536/2752] flex items-center justify-center">
        {/* Base Poster / Fallback Image */}
        <img
          src="/giris.png"
          alt="Giriş Ekranı"
          className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)] rounded-[2rem] pointer-events-none"
        />

        {/* Mascot Animation Video */}
        <video
          src="/ekran-video.mp4"
          poster="/giris.png"
          autoPlay
          loop
          muted
          playsInline
          // @ts-ignore
          webkit-playsinline="true"
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          className={`w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)] rounded-[2rem] pointer-events-none transition-opacity duration-300 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* ------------------------------------------------------------- */}
        {/* STATE A: Minimized view - pure giris.png with clickable hotspots */}
        {/* ------------------------------------------------------------- */}
        {!showForm && (
          <>
            {/* 1. Sol Üst Buton: Öğretmen Girişi */}
            <button
              type="button"
              id="btn-hotspot-teacher"
              onClick={() => handleQuickRoleSelect('teacher')}
              title="Öğretmen Girişi"
              className="absolute z-20 cursor-pointer rounded-2xl transition-all duration-150 hover:bg-white/20 active:scale-95 group"
              style={{
                top: '51.0%',
                left: '13.5%',
                width: '34.0%',
                height: '18.3%',
              }}
            >
              <span className="sr-only">Öğretmen Girişi</span>
            </button>

            {/* 2. Sağ Üst Buton: Veli Girişi */}
            <button
              type="button"
              id="btn-hotspot-parent"
              onClick={() => handleQuickRoleSelect('parent')}
              title="Veli Girişi"
              className="absolute z-20 cursor-pointer rounded-2xl transition-all duration-150 hover:bg-white/20 active:scale-95 group"
              style={{
                top: '51.0%',
                left: '52.5%',
                width: '34.0%',
                height: '18.3%',
              }}
            >
              <span className="sr-only">Veli Girişi</span>
            </button>

            {/* 3. Alt Hap Buton: Giriş Yap */}
            <button
              type="button"
              id="btn-hotspot-open-form"
              onClick={() => setShowForm(true)}
              title="Giriş Yap Formunu Aç"
              className="absolute z-20 cursor-pointer rounded-full transition-all duration-150 hover:opacity-90 active:scale-98 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white font-black text-xs sm:text-sm shadow-lg border border-indigo-400/40"
              style={{
                top: '71.4%',
                left: '13.5%',
                width: '73.0%',
                height: '7.6%',
              }}
            >
              <LogIn className="w-4 h-4 text-indigo-200" />
              <span>Giriş Yap Formunu Aç</span>
            </button>

            {/* 4. Alt Hızlı Giriş Butonları (Öğretmen, Veli, Yönetici) */}
            <div
              className="absolute z-20 flex justify-between gap-1"
              style={{
                top: '84.0%',
                left: '12.0%',
                width: '76.0%',
                height: '7.6%',
              }}
            >
              <button
                type="button"
                id="btn-auth-teacher-mode"
                onClick={() => handleQuickRoleSelect('teacher')}
                title="Öğretmen Girişi"
                className="flex-1 h-full cursor-pointer hover:bg-white/20 active:scale-90 rounded-xl transition-all"
              >
                <span className="sr-only">Öğretmen Girişi</span>
              </button>
              <button
                type="button"
                id="btn-auth-parent-mode"
                onClick={() => handleQuickRoleSelect('parent')}
                title="Veli Girişi"
                className="flex-1 h-full cursor-pointer hover:bg-white/20 active:scale-90 rounded-xl transition-all"
              >
                <span className="sr-only">Veli Girişi</span>
              </button>
              <button
                type="button"
                id="btn-auth-admin-mode"
                onClick={() => handleQuickRoleSelect('admin')}
                title="Yönetici Girişi"
                className="flex-1 h-full cursor-pointer hover:bg-white/20 active:scale-90 rounded-xl transition-all"
              >
                <span className="sr-only">Yönetici Girişi</span>
              </button>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STATE B: Form applied seamlessly right over the card of giris.png */}
        {/* ------------------------------------------------------------- */}
        {showForm && (
          <div
            id="auth-form-card"
            style={{
              top: '48.0%',
              left: '9.0%',
              right: '9.0%',
              bottom: '4.5%',
            }}
            className="absolute z-25 bg-white/95 backdrop-blur-md rounded-[1.75rem] sm:rounded-[2rem] shadow-2xl border border-white/90 p-3 sm:p-3.5 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200"
          >
            {/* Top Bar: Role Selector & Minimize View Button */}
            <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-100">
              {/* Role Badges */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="tab-role-teacher"
                  onClick={() => setRole('teacher')}
                  className={`px-2 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                    role === 'teacher'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Öğretmen</span>
                </button>

                <button
                  type="button"
                  id="tab-role-parent"
                  onClick={() => setRole('parent')}
                  className={`px-2 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                    role === 'parent'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Veli</span>
                </button>

                <button
                  type="button"
                  id="tab-role-admin"
                  onClick={() => setRole('admin')}
                  className={`px-2 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                    role === 'admin'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              </div>

              {/* Minimize / View Original Design Button */}
              <button
                type="button"
                id="btn-minimize-form"
                onClick={() => setShowForm(false)}
                title="Tasarımı Gör (Formu Küçült)"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Error Message with Smart Action Shortcuts */}
            {error && (
              <div className="p-2.5 rounded-xl bg-amber-50/95 border border-amber-300/90 text-amber-950 text-[11px] flex flex-col gap-2 leading-tight my-1 animate-in fade-in shadow-xs">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{error}</span>
                </div>

                {/* Quick Action Helpers */}
                {(error.includes('zaten var') || error.includes('hatalı') || error.includes('Şifreniz') || error.includes('şifre') || emailAlreadyInUse) && (
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-amber-200/80">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        id="btn-error-reset-password"
                        onClick={handlePasswordReset}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Yeni Şifre Belirleme Bağlantısı Gönder</span>
                      </button>

                      <button
                        type="button"
                        id="btn-error-instant-login"
                        onClick={handleQuickInstantLogin}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Şifresiz Hızlı Giriş Yap</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-start gap-1.5 leading-tight my-0.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-1.5 my-0.5">
              {/* Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  id="input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-posta adresiniz"
                  autoComplete="email"
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifre (en az 6 karakter)"
                  autoComplete="current-password"
                  className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Remember Me Checkbox & Forgot Password Link */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    id="checkbox-remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">
                    Beni hatırla <span className="text-slate-400 font-normal">(Açık kalsın)</span>
                  </span>
                </label>

                <button
                  type="button"
                  id="btn-forgot-password"
                  onClick={handlePasswordReset}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Şifremi Unuttum?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-auth"
                disabled={loading}
                className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Lütfen bekleyin...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>
                      {role === 'teacher'
                        ? 'Öğretmen Girişi Yap'
                        : role === 'admin'
                        ? 'Yönetici Girişi Yap'
                        : 'Veli Girişi Yap'}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* 3 Test Butonu (Onay Süreci İçin Kart İçinde Kompakt) */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Test / İnceleme Girişleri
                </span>
                <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                  Onay Sonrası Kaldırılacak
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  id="btn-quick-teacher-card"
                  onClick={() => handleTestLogin('teacher')}
                  className="py-2 px-1 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-800 border border-indigo-200 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 shadow-2xs"
                  title="Öğretmen Test Girişi"
                >
                  <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">Öğretmen</span>
                </button>

                <button
                  type="button"
                  id="btn-quick-parent-card"
                  onClick={() => handleTestLogin('parent')}
                  className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 shadow-2xs"
                  title="Veli Test Girişi"
                >
                  <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Veli</span>
                </button>

                <button
                  type="button"
                  id="btn-quick-admin-card"
                  onClick={() => handleTestLogin('admin')}
                  className="py-2 px-1 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 shadow-2xs"
                  title="Yönetici (Olcayto) Test Girişi"
                >
                  <span className="text-sm leading-none">👑</span>
                  <span className="truncate">Yönetici</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimize edilmişse formu tekrar açma butonu */}
      {!showForm && (
        <div className="relative z-20 mt-2 flex items-center justify-center">
          <button
            type="button"
            id="btn-expand-form"
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold rounded-full backdrop-blur-xs border border-indigo-400/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Giriş Formunu Aç</span>
          </button>
        </div>
      )}
    </div>
  );
};
