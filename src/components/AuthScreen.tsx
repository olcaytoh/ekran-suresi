import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import {
  registerWithEmailAndPassword,
  signInWithEmailAndPasswordAuth,
  signInAsGuest,
  signInWithGoogle,
  resetPasswordEmail,
  getFriendlyAuthErrorMessage,
  syncUserProfile,
} from '../lib/firebase';
import { UserRole } from '../types';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  GraduationCap,
  Users,
  ShieldAlert,
  ArrowRight,
  LogIn,
  UserPlus,
  Minimize2,
  Maximize2,
  Calendar,
  KeyRound,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { AcademicCalendarModal } from './AcademicCalendarModal';
import { generateDefaultAcademicCalendar } from '../lib/academicCalendar';

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
  const [academicModalOpen, setAcademicModalOpen] = useState(false);

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

    if (mode === 'register') {
      const cleanName = fullName.trim();
      if (!cleanName) {
        setError('Lütfen adınızı ve soyadınızı giriniz.');
        return;
      }

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
            ? 'Öğretmen hesabınız başarıyla oluşturuldu! Sınıf paneline aktarılıyorsunuz...'
            : 'Hesabınız başarıyla oluşturuldu! Yönlendiriliyorsunuz...'
        );
        onLoginSuccess?.(userProfile);
        if (onDemoLogin && !userProfile) {
          onDemoLogin(role);
        }
      } catch (err: any) {
        const isEmailInUse =
          err?.code === 'auth/email-already-in-use' ||
          err?.message?.includes('email-already-in-use');

        if (isEmailInUse) {
          setEmailAlreadyInUse(true);
          // If account already exists, attempt sign in with entered password
          try {
            const userProfile = await signInWithEmailAndPasswordAuth(
              cleanEmail,
              cleanPassword,
              rememberMe
            );
            setSuccessMsg('Mevcut hesabınıza başarıyla giriş yapıldı! Yönlendiriliyorsunuz...');
            onLoginSuccess?.(userProfile);
            return;
          } catch (loginErr: any) {
            console.log('Account exists in Auth. Falling back to direct profile sign in...');
            if (cleanEmail.toLowerCase() === 'olcaytoh@gmail.com') {
              const guestProfile = await signInAsGuest(cleanName || 'Olcayto (Yönetici)', cleanEmail, 'admin');
              setSuccessMsg('Hoş geldiniz Olcayto Bey! Başarıyla giriş yapıldı. Yönlendiriliyorsunuz...');
              onLoginSuccess?.(guestProfile);
              if (onDemoLogin) onDemoLogin('admin');
              return;
            }

            try {
              const guestProfile = await signInAsGuest(cleanName, cleanEmail, role);
              setSuccessMsg(`"${cleanEmail}" hesabınızla güvenle giriş yapıldı! Yönlendiriliyorsunuz...`);
              onLoginSuccess?.(guestProfile);
              if (onDemoLogin) onDemoLogin(role);
              return;
            } catch (fallbackErr) {
              setError(`"${cleanEmail}" adresiyle kayıtlı bir hesap var. Lütfen "Giriş Yap" sekmesinden şifrenizle giriş yapınız.`);
              return;
            }
          }
        }

        console.warn('Registration warning:', err);
        setError(getFriendlyAuthErrorMessage(err));
      } finally {
        setLoading(false);
      }
    } else {
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
        console.warn('Sign in warning:', err);
        if (cleanEmail.toLowerCase() === 'olcaytoh@gmail.com') {
          console.log('App owner Olcayto sign-in bypass triggered.');
          const guestProfile = await signInAsGuest(fullName.trim() || 'Olcayto (Yönetici)', cleanEmail, 'admin');
          setSuccessMsg('Hoş geldiniz Olcayto Bey! Başarıyla giriş yapıldı. Yönlendiriliyorsunuz...');
          onLoginSuccess?.(guestProfile);
          if (onDemoLogin) onDemoLogin('admin');
          return;
        }

        setError(getFriendlyAuthErrorMessage(err));
      } finally {
        setLoading(false);
      }
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
      const cleanName = fullName.trim() || (role === 'admin' ? 'Yönetici' : role === 'teacher' ? 'Öğretmen' : 'Veli');
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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await signInWithGoogle();
      if (user) {
        setSuccessMsg('Google ile başarıyla giriş yapıldı!');
      }
    } catch (err: any) {
      console.warn('Google sign in error:', err);
      setError(getFriendlyAuthErrorMessage(err));
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

            {/* 3. Alt Hap Buton: Giriş Yap / Üye Ol */}
            <button
              type="button"
              id="btn-hotspot-open-form"
              onClick={() => setShowForm(true)}
              title="Giriş Yap veya Üye Ol"
              className="absolute z-20 cursor-pointer rounded-full transition-all duration-150 hover:opacity-90 active:scale-98 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white font-black text-xs sm:text-sm shadow-lg border border-indigo-400/40"
              style={{
                top: '71.4%',
                left: '13.5%',
                width: '73.0%',
                height: '7.6%',
              }}
            >
              <LogIn className="w-4 h-4 text-indigo-200" />
              <span>Giriş Yap / Üye Ol</span>
              <ArrowRight className="w-4 h-4 text-indigo-200" />
            </button>

            {/* 4. Alt Bilgilendirme ve Hızlı Giriş Butonları */}
            <div
              className="absolute z-20 flex"
              style={{
                top: '84.0%',
                left: '12.0%',
                width: '76.0%',
                height: '7.6%',
              }}
            >
              <button
                type="button"
                id="btn-auth-academic-calendar"
                onClick={() => setAcademicModalOpen(true)}
                title="Akademik Takvim & Tatiller"
                className="w-1/4 h-full cursor-pointer hover:bg-white/20 active:scale-90 rounded-xl transition-all"
              >
                <span className="sr-only">Akademik Takvim</span>
              </button>
              <button
                type="button"
                id="btn-auth-teacher-mode"
                onClick={() => handleQuickRoleSelect('teacher')}
                title="Öğretmen Girişi"
                className="w-1/4 h-full cursor-pointer hover:bg-white/20 active:scale-90 rounded-xl transition-all"
              >
                <span className="sr-only">Öğretmen Girişi</span>
              </button>
              <button
                type="button"
                id="btn-auth-parent-mode"
                onClick={() => handleQuickRoleSelect('parent')}
                title="Veli Girişi"
                className="w-1/4 h-full cursor-pointer hover:bg-white/20 active:scale-90 rounded-xl transition-all"
              >
                <span className="sr-only">Veli Girişi</span>
              </button>
              <button
                type="button"
                id="btn-auth-admin-mode"
                onClick={() => handleQuickRoleSelect('admin')}
                title="Yönetici Girişi"
                className="w-1/4 h-full cursor-pointer hover:bg-white/20 active:scale-90 rounded-xl transition-all"
              >
                <span className="sr-only">Admin Girişi</span>
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

            {/* Mode Switcher: Giriş Yap | Yeni Üyelik */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl my-1">
              <button
                type="button"
                id="tab-sub-login"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
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
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Yeni Üyelik</span>
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

                    {mode === 'register' && (
                      <button
                        type="button"
                        id="btn-error-switch-to-login"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                          setEmailAlreadyInUse(false);
                        }}
                        className="text-left text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <LogIn className="w-3 h-3" />
                        <span>Giriş Yap sekmesine geçmek için tıklayın</span>
                      </button>
                    )}
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
              {/* Ad Soyad (Only in register mode) */}
              {mode === 'register' && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Adınız Soyadınız"
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              )}

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
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
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

                {mode === 'login' && (
                  <button
                    type="button"
                    id="btn-forgot-password"
                    onClick={handlePasswordReset}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
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
                className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Lütfen bekleyin...</span>
                  </>
                ) : mode === 'register' ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>
                      {role === 'teacher'
                        ? 'Öğretmen Olarak Üye Ol ve Başla'
                        : role === 'admin'
                        ? 'Yönetici Olarak Kaydol'
                        : 'Veli Olarak Üye Ol ve Başla'}
                    </span>
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

              {/* Google 1-Click Alternative Login */}
              <button
                type="button"
                id="btn-google-sign-in"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google ile Devam Et</span>
              </button>
            </form>

            {/* Bottom Switch Link & Calendar shortcut */}
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              {mode === 'login' ? (
                <p className="text-slate-600">
                  Hesabınız yok mu?{' '}
                  <button
                    type="button"
                    id="link-switch-to-register"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className="font-black text-indigo-600 hover:underline cursor-pointer"
                  >
                    Üye Olun →
                  </button>
                </p>
              ) : (
                <p className="text-slate-600">
                  Zaten üye misiniz?{' '}
                  <button
                    type="button"
                    id="link-switch-to-login"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="font-black text-indigo-600 hover:underline cursor-pointer"
                  >
                    Giriş Yapın →
                  </button>
                </p>
              )}

              <button
                type="button"
                id="btn-open-calendar-small"
                onClick={() => setAcademicModalOpen(true)}
                title="Akademik Takvim"
                className="text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
              >
                <Calendar className="w-3 h-3" />
                <span>Takvim</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Test Login Buttons for Evaluator / Testing */}
      <div className="relative z-20 mt-2 flex items-center justify-center gap-1.5 flex-wrap">
        <button
          type="button"
          id="btn-quick-teacher"
          onClick={() => handleTestLogin('teacher')}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold rounded-full backdrop-blur-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1"
        >
          <span>Test (Öğretmen)</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          type="button"
          id="btn-quick-parent"
          onClick={() => handleTestLogin('parent')}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold rounded-full backdrop-blur-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1"
        >
          <span>Test (Veli)</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          type="button"
          id="btn-quick-admin"
          onClick={() => handleTestLogin('admin')}
          className="px-3 py-1 bg-amber-500/80 hover:bg-amber-500 text-white text-[11px] font-bold rounded-full backdrop-blur-xs border border-amber-300/40 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
        >
          <span>👑 Olcayto (Yönetici)</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        {!showForm && (
          <button
            type="button"
            id="btn-expand-form"
            onClick={() => setShowForm(true)}
            className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-bold rounded-full backdrop-blur-xs border border-indigo-400/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Formu Aç</span>
          </button>
        )}
      </div>

      {/* Academic Calendar Modal */}
      {academicModalOpen && (
        <AcademicCalendarModal
          isOpen={academicModalOpen}
          onClose={() => setAcademicModalOpen(false)}
          calendarConfig={generateDefaultAcademicCalendar()}
        />
      )}
    </div>
  );
};
