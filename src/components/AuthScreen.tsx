import React, { useState, useEffect, useRef } from 'react';
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
  UserPlus,
  User,
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
  // Mode: login or register
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Selected role for login/register
  const [role, setRole] = useState<UserRole>('teacher');

  // Form states
  const [fullName, setFullName] = useState('');
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
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guarantee autoplay without black screen or play overlay
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('x5-playsinline', '');

      const startPlayback = () => {
        if (video) {
          video.muted = true;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Browser may defer playback until first touch
            });
          }
        }
      };

      startPlayback();

      // One-time touch/click fallback for mobile browsers
      const handleUserInteraction = () => {
        startPlayback();
        window.removeEventListener('touchstart', handleUserInteraction);
        window.removeEventListener('touchend', handleUserInteraction);
        window.removeEventListener('click', handleUserInteraction);
      };

      window.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });
      window.addEventListener('touchend', handleUserInteraction, { once: true, passive: true });
      window.addEventListener('click', handleUserInteraction, { once: true });

      return () => {
        window.removeEventListener('touchstart', handleUserInteraction);
        window.removeEventListener('touchend', handleUserInteraction);
        window.removeEventListener('click', handleUserInteraction);
      };
    }
  }, []);

  // Load remembered credentials on mount (do not prefill email box so it starts empty)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRememberMe = localStorage.getItem('rememberMe');
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

    if (mode === 'register') {
      const cleanName = fullName.trim() || cleanEmail.split('@')[0];
      try {
        setLoading(true);
        const userProfile = await registerWithEmailAndPassword(
          cleanName,
          cleanEmail,
          cleanPassword,
          role,
          rememberMe
        );
        setSuccessMsg(
          role === 'teacher'
            ? 'Öğretmen hesabınız başarıyla oluşturuldu! Yönlendiriliyorsunuz...'
            : role === 'admin'
            ? 'Yönetici hesabınız başarıyla oluşturuldu! Yönlendiriliyorsunuz...'
            : 'Veli hesabınız başarıyla oluşturuldu! Yönlendiriliyorsunuz...'
        );
        onLoginSuccess?.(userProfile);
      } catch (err: any) {
        console.warn('Registration error:', err);
        const isEmailInUse =
          err?.code === 'auth/email-already-in-use' ||
          err?.message?.includes('email-already-in-use');

        if (isEmailInUse) {
          setEmailAlreadyInUse(true);
          setError(`"${cleanEmail}" adresiyle zaten kayıtlı bir hesap var. "Giriş Yap" sekmesine geçerek şifrenizle giriş yapabilirsiniz.`);
        } else {
          setError(getFriendlyAuthErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
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
    <div className="fixed inset-0 w-full h-full min-h-screen overflow-y-auto overflow-x-hidden select-none bg-gradient-to-b from-[#64a6d4] via-[#5c98c8] to-[#eedcd0] m-0 p-0">
      {/* Fullscreen Video (ekrana ilk ekran-video.mp4 gelir, siyah play ekranı kesinlikle gelmez) */}
      <video
        ref={videoRef}
        src="/ekran-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        // @ts-ignore
        webkit-playsinline="true"
        // @ts-ignore
        x5-playsinline="true"
        preload="auto"
        controls={false}
        disablePictureInPicture
        // @ts-ignore
        disableRemotePlayback
        onLoadedData={() => setVideoReady(true)}
        onCanPlay={() => setVideoReady(true)}
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* 3. Form & Buttons Layer: Positioned over the video's gray board without white frame */}
      <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-end px-3.5 sm:px-6 pt-16 pb-4 sm:pb-8">
        {/* Spacer to keep the cute mascot visible in the upper section */}
        <div className="flex-1 w-full max-w-sm sm:max-w-md min-h-[46vh] pointer-events-none" />

        {/* Buttons and Form aligned right over the gray board */}
        <div
          id="auth-form-card"
          className="w-full max-w-sm sm:max-w-md flex flex-col gap-2 animate-in fade-in duration-300 pointer-events-auto"
        >
          {/* Role Badges (Öğretmen, Veli, Yönetici) */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              id="tab-role-teacher"
              onClick={() => setRole('teacher')}
              className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                role === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                  : 'bg-white/85 hover:bg-white text-slate-800 border border-slate-300/80 shadow-xs backdrop-blur-xs'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Öğretmen</span>
            </button>

            <button
              type="button"
              id="tab-role-parent"
              onClick={() => setRole('parent')}
              className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                role === 'parent'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                  : 'bg-white/85 hover:bg-white text-slate-800 border border-slate-300/80 shadow-xs backdrop-blur-xs'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Veli</span>
            </button>

            <button
              type="button"
              id="tab-role-admin"
              onClick={() => setRole('admin')}
              className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                role === 'admin'
                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300'
                  : 'bg-white/85 hover:bg-white text-slate-800 border border-slate-300/80 shadow-xs backdrop-blur-xs'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Yönetici</span>
            </button>
          </div>

          {/* Mode Switcher: Giriş Yap | Üye Ol */}
          <div className="flex bg-black/15 backdrop-blur-xs p-1 rounded-2xl border border-white/20">
            <button
              type="button"
              id="tab-sub-login"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'text-slate-800 hover:text-slate-950 font-bold'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Giriş Yap</span>
            </button>

            <button
              type="button"
              id="tab-sub-register"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-800 hover:text-slate-950 font-bold'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Üye Ol</span>
            </button>
          </div>

          {/* Error Message with Smart Action Shortcuts */}
          {error && (
            <div className="p-2.5 rounded-xl bg-amber-50/95 border border-amber-300 text-amber-950 text-[11px] flex flex-col gap-2 leading-tight animate-in fade-in shadow-md">
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
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-start gap-1.5 leading-tight animate-in fade-in shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-1.5">
            {/* Ad Soyad (Only in register mode) */}
            {mode === 'register' && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  className="w-full pl-9 pr-3 py-2 bg-white/95 focus:bg-white border border-slate-300/90 rounded-xl text-xs sm:text-sm font-bold text-slate-900 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresiniz"
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2 bg-white/95 focus:bg-white border border-slate-300/90 rounded-xl text-xs sm:text-sm font-bold text-slate-900 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre (en az 6 karakter)"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="w-full pl-9 pr-9 py-2 bg-white/95 focus:bg-white border border-slate-300/90 rounded-xl text-xs sm:text-sm font-bold text-slate-900 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                tabIndex={-1}
                title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me Checkbox & Forgot Password Link */}
            <div className="flex items-center justify-between pt-0.5 px-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  id="checkbox-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[11px] font-black text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                  Beni hatırla <span className="text-slate-600 font-medium">(Açık kalsın)</span>
                </span>
              </label>

              {mode === 'login' && (
                <button
                  type="button"
                  id="btn-forgot-password"
                  onClick={handlePasswordReset}
                  className="text-[11px] font-black text-indigo-700 hover:text-indigo-950 hover:underline cursor-pointer drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
                >
                  Şifremi Unuttum?
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-auth"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Lütfen bekleyin...</span>
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {role === 'teacher'
                      ? 'Öğretmen Olarak Üye Ol'
                      : role === 'admin'
                      ? 'Yönetici Olarak Üye Ol'
                      : 'Veli Olarak Üye Ol'}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
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

          {/* Test / İnceleme Giriş Butonları (All buttons on the gray board, slight downward shift allowed) */}
          <div className="pt-1 flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Test / İnceleme Girişleri
              </span>
              <span className="text-[9px] text-slate-700 bg-white/75 px-1.5 py-0.5 rounded-md font-bold shadow-2xs">
                Hızlı Giriş
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                id="btn-quick-teacher-card"
                onClick={() => handleTestLogin('teacher')}
                className="py-2 px-1 bg-white/90 hover:bg-white active:scale-95 text-indigo-900 border border-indigo-200/90 rounded-xl text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 shadow-xs"
                title="Öğretmen Test Girişi"
              >
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate">Öğretmen</span>
              </button>

              <button
                type="button"
                id="btn-quick-parent-card"
                onClick={() => handleTestLogin('parent')}
                className="py-2 px-1 bg-white/90 hover:bg-white active:scale-95 text-emerald-900 border border-emerald-200/90 rounded-xl text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 shadow-xs"
                title="Veli Test Girişi"
              >
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Veli</span>
              </button>

              <button
                type="button"
                id="btn-quick-admin-card"
                onClick={() => handleTestLogin('admin')}
                className="py-2 px-1 bg-white/90 hover:bg-white active:scale-95 text-amber-950 border border-amber-300/90 rounded-xl text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 shadow-xs"
                title="Yönetici (Olcayto) Test Girişi"
              >
                <span className="text-sm leading-none">👑</span>
                <span className="truncate">Yönetici</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
