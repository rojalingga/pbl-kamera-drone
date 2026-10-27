import React, { useState, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
}

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [isSubmittingSignUp, setIsSubmittingSignUp] = useState(false);

  const { post, processing: isSubmittingLogin, errors: backendErrors } = useForm({
    username: '',
    password: '',
  });

  // Helper to completely reset all input fields and error states
  const resetAllForms = () => {
    setLoginIdentifier('');
    setLoginPassword('');
    setLoginErrors({});
    setSignUpData({
      email: '',
      password: '',
      confirmPassword: '',
    });
    setSignUpErrors({});
    setSignUpSuccess(false);
    setShowPassword(false);
  };

  // Sync mode and reset forms whenever modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetAllForms();
    }
  }, [isOpen, initialMode]);

  const handleClose = () => {
    resetAllForms();
    onClose();
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to remove field error completely when user fixes a field
  const clearLoginError = (key: string) => {
    setLoginErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearSignUpError = (key: string) => {
    setSignUpErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Login Validation
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!loginIdentifier.trim()) {
      errs.identifier = 'Email wajib diisi.';
    }
    if (!loginPassword) {
      errs.password = 'Password wajib diisi.';
    }

    setLoginErrors(errs);
    if (Object.keys(errs).length > 0) return;

    router.post(
      '/post-login',
      {
        username: loginIdentifier,
        password: loginPassword,
      },
      {
        onSuccess: () => {
          handleClose();
          router.visit('/admin/dashboard');
        },
        onError: (errs) => {
          setLoginErrors(errs);
        },
      }
    );
  };

  // Sign Up Validation
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!signUpData.email.trim()) {
      errs.email = 'Email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpData.email.trim())) {
      errs.email = 'Format email tidak valid.';
    }
    if (!signUpData.password) {
      errs.password = 'Password wajib diisi.';
    } else if (signUpData.password.length < 6) {
      errs.password = 'Password minimal 6 karakter.';
    }
    if (!signUpData.confirmPassword) {
      errs.confirmPassword = 'Konfirmasi password wajib diisi.';
    } else if (signUpData.password !== signUpData.confirmPassword) {
      errs.confirmPassword = 'Password tidak cocok.';
    }

    setSignUpErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmittingSignUp(true);
    setTimeout(() => {
      setIsSubmittingSignUp(false);
      setSignUpSuccess(true);
    }, 500);
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    resetAllForms();
  };

  const loginErrorList = Object.values(loginErrors).filter(Boolean);
  const signUpErrorList = Object.values(signUpErrors).filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Modal Card — Max-height + scrollable content prevents clipping & layout distortion */}
      <div className="relative max-w-5xl w-full mx-auto bg-white border border-black/10 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[calc(100vh-2rem)] sm:max-h-[92vh] lg:h-[620px] min-h-[620px] my-auto">
        
        {/* Close Button (X) */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup Modal"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/5 hover:bg-black/15 flex items-center justify-center text-black/60 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column — Form Content */}
        <div className="lg:col-span-6 xl:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between h-full overflow-y-auto max-h-[calc(100vh-3rem)] sm:max-h-[92vh] lg:max-h-full">
          <div>
            {/* Header / Logo */}
            <div className="flex items-center justify-between mb-6">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleClose();
                }}
              >
                <img
                  src="/assets/img/Logo Black.svg"
                  alt="SkyLens Logo"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </a>
            </div>

            {/* Mode-dependent Title & Description */}
            {mode === 'login' ? (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight mb-1.5">
                  Selamat Datang Kembali 👋
                </h1>
                <p className="text-xs sm:text-sm text-black/60 leading-relaxed">
                  Masuk untuk mengelola penyewaan peralatan dan kebutuhan produksi Anda.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight mb-1.5">
                  Daftar Akun 👋
                </h1>
                <p className="text-xs sm:text-sm text-black/60 leading-relaxed">
                  Buat akun untuk mulai menyewa peralatan dan mengelola kebutuhan produksi Anda.
                </p>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Login Errors Display */}
                {(loginErrorList.length > 0 || (backendErrors && Object.keys(backendErrors).length > 0)) && (
                  <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <div className="space-y-0.5">
                      {loginErrorList.map((err, idx) => (
                        <p key={idx}>{err}</p>
                      ))}
                      {backendErrors &&
                        Object.values(backendErrors).map((err, idx) => (
                          <p key={`be-${idx}`}>{err}</p>
                        ))}
                    </div>
                  </div>
                )}

                {/* Single Identifier Field: Email atau Username */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-black mb-1.5 block">
                    Email
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan email Anda"
                    value={loginIdentifier}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLoginIdentifier(val);
                      if (val.trim()) {
                        clearLoginError('identifier');
                      }
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all duration-200 ${
                      Boolean(loginErrors.identifier) ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                    }`}
                    autoComplete="username"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-black block">
                      Password
                    </label>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-xs font-semibold text-brand-500 hover:text-black transition-colors"
                    >
                      Lupa Password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan password Anda"
                      value={loginPassword}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLoginPassword(val);
                        if (val) {
                          clearLoginError('password');
                        }
                      }}
                      className={`w-full px-4 py-2.5 pr-11 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all duration-200 ${
                        Boolean(loginErrors.password) ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                      }`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={isSubmittingLogin}
                  className="w-full py-3.5 px-6 rounded-full bg-brand-500 hover:bg-black text-white font-semibold text-sm shadow-md shadow-brand-500/15 transition-all duration-200 disabled:opacity-60 cursor-pointer mt-2"
                >
                  {isSubmittingLogin ? 'Memproses...' : 'Masuk'}
                </button>

                {/* Account Switcher Link positioned directly below submit button */}
                <p className="text-center text-xs text-black/60 pt-2">
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-brand-500 hover:text-black transition-colors cursor-pointer"
                  >
                    Daftar
                  </button>
                </p>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Sign Up Errors Display */}
                {signUpErrorList.length > 0 && (
                  <div className="p-2.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <div className="space-y-0.5">
                      {signUpErrorList.map((err, idx) => (
                        <p key={idx}>{err}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Notification */}
                {signUpSuccess && (
                  <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <p className="font-bold">Pendaftaran berhasil divalidasi!</p>
                      <p className="text-emerald-700 mt-0.5">Silakan lanjut ke menu Masuk.</p>
                    </div>
                  </div>
                )}

                {/* 1. Email */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-black mb-1.5 block">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Masukkan email Anda"
                    value={signUpData.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignUpData((prev) => ({ ...prev, email: val }));
                      if (val.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
                        clearSignUpError('email');
                      }
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all duration-200 ${
                      Boolean(signUpErrors.email) ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                    }`}
                    autoComplete="email"
                  />
                </div>

                {/* 2. Password */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-black mb-1.5 block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan password Anda"
                      value={signUpData.password}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSignUpData((prev) => ({ ...prev, password: val }));
                        if (val && val.length >= 6) {
                          clearSignUpError('password');
                        }
                      }}
                      className={`w-full px-4 py-2.5 pr-11 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all duration-200 ${
                        Boolean(signUpErrors.password) ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Konfirmasi Password */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-black mb-1.5 block">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ulangi password Anda"
                      value={signUpData.confirmPassword}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSignUpData((prev) => ({ ...prev, confirmPassword: val }));
                        if (val === signUpData.password) {
                          clearSignUpError('confirmPassword');
                        }
                      }}
                      className={`w-full px-4 py-2.5 pr-11 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all duration-200 ${
                        Boolean(signUpErrors.confirmPassword) ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                      }`}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={isSubmittingSignUp}
                  className="w-full py-3.5 px-6 rounded-full bg-brand-500 hover:bg-black text-white font-semibold text-sm shadow-md shadow-brand-500/15 transition-all duration-200 disabled:opacity-60 cursor-pointer mt-2"
                >
                  {isSubmittingSignUp ? 'Memproses...' : 'Daftar'}
                </button>

                {/* Account Switcher Link positioned directly below submit button */}
                <p className="text-center text-xs text-black/60 pt-2">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-brand-500 hover:text-black transition-colors cursor-pointer"
                  >
                    Masuk
                  </button>
                </p>
              </form>
            )}
          </div>

          <div />
        </div>

        {/* Right Column — Visual Image Area */}
        <div className="lg:col-span-6 xl:col-span-6 relative hidden lg:block p-3 shrink-0 h-full max-h-[620px]">
          <div className="w-full h-full rounded-2xl overflow-hidden relative shadow-inner">
            <img
              src={mode === 'login' ? '/assets/img/Masuk.jpg' : '/assets/img/Daftar.jpg'}
              alt={mode === 'login' ? 'SkyLens Masuk' : 'SkyLens Daftar'}
              className="w-full h-full object-cover shrink-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
            
            {/* Bottom visual overlay content */}
            <div className="absolute bottom-6 left-6 right-6 text-white p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                {mode === 'login'
                  ? '"Peralatan kamera, lensa, dan drone berkualitas profesional untuk setiap kebutuhan produksi Anda."'
                  : '"Bergabung bersama kami dan nikmati kemudahan sewa peralatan produksi profesional secara cepat dan praktis."'}
              </p>
              <p className="text-[11px] text-white/70 mt-1.5 font-medium">— SkyLens Rental</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
