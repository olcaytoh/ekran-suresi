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
  onLoginSuccess?: (profile: any, isNewRegistration?: boolean) => void;
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
        onLoginSuccess?.(userProfile, true);
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
      onLoginSuccess?.(userProfile, false);
    } catch (err: any) {
      console.warn('Sign in attempt:', err);
      if (cleanEmail.toLowerCase() === 'olcaytoh@gmail.com') {
        console.log('App owner Olcayto sign-in bypass triggered.');
        const guestProfile = await signInAsGuest('Olcayto (Yönetici)', cleanEmail, 'admin');
        setSuccessMsg('Hoş geldiniz Olcayto Bey! Başarıyla giriş yapıldı. Yönlendiriliyorsunuz...');
        onLoginSuccess?.(guestProfile, false);
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
          onLoginSuccess?.(registeredProfile, true);
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
      onLoginSuccess?.(guestProfile, false);
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
      onLoginSuccess?.(guestProfile, false);
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
        poster="/ekran-poster.jpg"
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
        style={{ backgroundColor: 'transparent' }}
      />

      {/* 3. Form & Buttons Layer: Arka panoya tam oturtulmuş, kenarları ferah ve pano sınırları belirgin form */}
      <div
        className={`relative z-10 min-h-screen w-full flex flex-col items-center justify-end px-10 sm:px-14 transition-all duration-200 ${
          mode === 'register' ? 'pb-[3vh] sm:pb-[4vh]' : 'pb-[3.5vh] sm:pb-[4.5vh]'
        }`}
      >
        {/* Buttons and Form vertically positioned to fill and balance the background board */}
        <div
          id="auth-form-card"
          className={`w-full max-w-[340px] sm:max-w-[370px] flex flex-col animate-in fade-in duration-300 pointer-events-auto transition-all ${
            mode === 'login' ? 'gap-2.5 sm:gap-3' : 'gap-2 sm:gap-2.5'
          }`}
        >
          {/* Role Badges (Öğretmen, Veli, Yönetici) - "Sınıfım" panosundaki renkli parlayan cam kart stili */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              id="tab-role-teacher"
              onClick={() => setRole('teacher')}
              className={`py-1.5 px-1 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer h-8 border-2 backdrop-blur-md ${
                role === 'teacher'
                  ? 'bg-indigo-600/85 text-white border-indigo-300 shadow-[0_0_16px_rgba(79,70,229,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]'
                  : 'bg-gradient-to-br from-indigo-200/60 via-sky-100/50 to-white/40 hover:from-indigo-200/75 text-indigo-950 border-indigo-300/70 shadow-[0_0_14px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.5)]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none truncate">Öğretmen</span>
            </button>

            <button
              type="button"
              id="tab-role-parent"
              onClick={() => setRole('parent')}
              className={`py-1.5 px-1 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer h-8 border-2 backdrop-blur-md ${
                role === 'parent'
                  ? 'bg-emerald-600/85 text-white border-emerald-300 shadow-[0_0_16px_rgba(5,150,105,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]'
                  : 'bg-gradient-to-br from-emerald-200/60 via-teal-100/50 to-white/40 hover:from-emerald-200/75 text-emerald-950 border-emerald-300/70 shadow-[0_0_14px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.5)]'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none truncate">Veli</span>
            </button>

            <button
              type="button"
              id="tab-role-admin"
              onClick={() => setRole('admin')}
              className={`py-1.5 px-1 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer h-8 border-2 backdrop-blur-md ${
                role === 'admin'
                  ? 'bg-rose-600/85 text-white border-rose-300 shadow-[0_0_16px_rgba(225,29,72,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]'
                  : 'bg-gradient-to-br from-amber-200/60 via-rose-100/50 to-white/40 hover:from-amber-200/75 text-rose-950 border-amber-300/70 shadow-[0_0_14px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.5)]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none truncate">Yönetici</span>
            </button>
          </div>

          {/* Mode Switcher: Giriş Yap | Üye Ol */}
          <div className="flex bg-gradient-to-br from-white/40 via-white/25 to-white/40 backdrop-blur-sm p-1 rounded-2xl border border-white/60 shadow-md">
            <button
              type="button"
              id="tab-sub-login"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? `bg-white ${role === 'parent' ? 'text-emerald-700' : role === 'admin' ? 'text-rose-700' : 'text-indigo-700'} shadow-md`
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
                  ? `${role === 'parent' ? 'bg-emerald-600' : role === 'admin' ? 'bg-rose-600' : 'bg-indigo-600'} text-white shadow-md`
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
          <form onSubmit={handleSubmit} className={mode === 'register' ? 'space-y-1 sm:space-y-1.5' : 'space-y-1.5'}>
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
                  className={`w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white/95 focus:bg-white border border-slate-300/90 rounded-xl text-xs sm:text-sm font-bold text-slate-900 shadow-xs focus:outline-hidden focus:ring-2 ${
                    role === 'parent' ? 'focus:ring-emerald-500' : role === 'admin' ? 'focus:ring-rose-500' : 'focus:ring-indigo-500'
                  } transition-all placeholder:text-slate-400 placeholder:font-medium`}
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
                className={`w-full pl-9 pr-3 bg-white/95 focus:bg-white border border-slate-300/90 rounded-xl font-bold text-slate-900 shadow-xs focus:outline-hidden focus:ring-2 ${
                  role === 'parent' ? 'focus:ring-emerald-500' : role === 'admin' ? 'focus:ring-rose-500' : 'focus:ring-indigo-500'
                } transition-all placeholder:text-slate-400 placeholder:font-medium text-xs sm:text-sm ${
                  mode === 'register' ? 'py-1.5 sm:py-2' : 'py-2'
                }`}
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
                className={`w-full pl-9 pr-9 bg-white/95 focus:bg-white border border-slate-300/90 rounded-xl font-bold text-slate-900 shadow-xs focus:outline-hidden focus:ring-2 ${
                  role === 'parent' ? 'focus:ring-emerald-500' : role === 'admin' ? 'focus:ring-rose-500' : 'focus:ring-indigo-500'
                } transition-all placeholder:text-slate-400 placeholder:font-medium text-xs sm:text-sm ${
                  mode === 'register' ? 'py-1.5 sm:py-2' : 'py-2'
                }`}
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
            <div className="flex items-center justify-between pt-0.5 px-0.5 gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                <input
                  id="checkbox-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={`w-3.5 h-3.5 rounded border-slate-300 ${
                    role === 'parent'
                      ? 'text-emerald-600 focus:ring-emerald-500'
                      : role === 'admin'
                      ? 'text-rose-600 focus:ring-rose-500'
                      : 'text-indigo-600 focus:ring-indigo-500'
                  } cursor-pointer`}
                />
                <span className="text-[11px] font-black text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] whitespace-nowrap">
                  Beni hatırla
                </span>
              </label>

              {mode === 'login' && (
                <button
                  type="button"
                  id="btn-forgot-password"
                  onClick={handlePasswordReset}
                  className={`text-[11px] font-black ${
                    role === 'parent'
                      ? 'text-emerald-700 hover:text-emerald-950'
                      : role === 'admin'
                      ? 'text-rose-700 hover:text-rose-950'
                      : 'text-indigo-700 hover:text-indigo-950'
                  } hover:underline cursor-pointer drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] whitespace-nowrap shrink-0`}
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
              className={`w-full active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 ${
                mode === 'register' ? 'py-1.5 sm:py-2 px-4 mt-0.5' : 'py-2 px-4 mt-1'
              } ${
                role === 'parent'
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 border-2 border-emerald-300 shadow-[0_0_18px_rgba(5,150,105,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]'
                  : role === 'admin'
                  ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 hover:from-rose-700 hover:to-red-900 border-2 border-rose-300 shadow-[0_0_18px_rgba(225,29,72,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 border-2 border-indigo-300 shadow-[0_0_18px_rgba(79,70,229,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]'
              }`}
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

          {/* Test / İnceleme Giriş Butonları */}
          <div className="pt-0.5 flex flex-col gap-0.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9.5px] font-black text-slate-800 uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Test / İnceleme Girişleri
              </span>
              <span className="text-[8.5px] text-slate-700 bg-white/75 px-1.5 py-0.5 rounded-md font-bold shadow-2xs">
                Hızlı Giriş
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                id="btn-quick-teacher-card"
                onClick={() => handleTestLogin('teacher')}
                className="py-1 px-1 bg-gradient-to-br from-indigo-200/60 via-sky-100/50 to-white/40 hover:from-indigo-200/75 backdrop-blur-md active:scale-95 text-indigo-950 border-2 border-indigo-300/70 rounded-2xl text-[10.5px] font-black cursor-pointer transition-all flex flex-row items-center justify-center gap-1 shadow-[0_0_14px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] h-7"
                title="Öğretmen Test Girişi"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate leading-none">Öğretmen</span>
              </button>

              <button
                type="button"
                id="btn-quick-parent-card"
                onClick={() => handleTestLogin('parent')}
                className="py-1 px-1 bg-gradient-to-br from-emerald-200/60 via-teal-100/50 to-white/40 hover:from-emerald-200/75 backdrop-blur-md active:scale-95 text-emerald-950 border-2 border-emerald-300/70 rounded-2xl text-[10.5px] font-black cursor-pointer transition-all flex flex-row items-center justify-center gap-1 shadow-[0_0_14px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] h-7"
                title="Veli Test Girişi"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate leading-none">Veli</span>
              </button>

              <button
                type="button"
                id="btn-quick-admin-card"
                onClick={() => handleTestLogin('admin')}
                className="py-1 px-1 bg-gradient-to-br from-amber-200/60 via-rose-100/50 to-white/40 hover:from-amber-200/75 backdrop-blur-md active:scale-95 text-rose-950 border-2 border-amber-300/70 rounded-2xl text-[10.5px] font-black cursor-pointer transition-all flex flex-row items-center justify-center gap-1 shadow-[0_0_14px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] h-7"
                title="Yönetici (Olcayto) Test Girişi"
              >
                <span className="text-xs leading-none">👑</span>
                <span className="truncate leading-none">Yönetici</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};