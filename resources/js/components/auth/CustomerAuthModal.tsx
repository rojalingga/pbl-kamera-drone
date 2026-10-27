import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { X, Eye, EyeOff, Lock, Phone, User, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const POLA_NO_HP = /^08[1-9][0-9]{7,10}$/;
const PESAN_NO_HP_TIDAK_VALID =
  'Format nomor WhatsApp / HP tidak valid. Harus diawali 08, contoh: 081234567890.';

export interface CustomerAuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CustomerAuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}: CustomerAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Login
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginGeneralError, setLoginGeneralError] = useState<string | null>(null);

  // Form Signup
  const [signUpName, setSignUpName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});
  const [signUpSuccessMessage, setSignUpSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLoginErrors({});
      setLoginGeneralError(null);
      setSignUpErrors({});
      setSignUpSuccessMessage(null);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    setLoginGeneralError(null);

    const errs: Record<string, string> = {};
    if (!loginPhone.trim()) {
      errs.no_hp = 'Nomor WhatsApp / HP wajib diisi.';
    } else if (!POLA_NO_HP.test(loginPhone.trim())) {
      errs.no_hp = PESAN_NO_HP_TIDAK_VALID;
    }
    if (!loginPassword) {
      errs.password = 'Password wajib diisi.';
    }

    if (Object.keys(errs).length > 0) {
      setLoginErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/customer/login', {
        no_hp: loginPhone.trim(),
        password: loginPassword,
      });

      if (response.data.status === 'success') {
        router.reload({
          onSuccess: () => {
            onClose();
            if (onSuccess) onSuccess();
          },
        });
      }
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors;

      if (serverErrors) {
        const formatted: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(serverErrors as Record<string, string[]>)) {
          formatted[key] = msgs[0];
        }
        setLoginErrors(formatted);
      } else {
        setLoginGeneralError(
          err.response?.data?.message || 'Gagal masuk. Silakan coba kembali.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});
    setSignUpSuccessMessage(null);

    const errs: Record<string, string> = {};
    if (!signUpName.trim()) errs.nama_lengkap = 'Nama lengkap wajib diisi.';
    if (!signUpPhone.trim()) errs.no_hp = 'Nomor WhatsApp / HP wajib diisi.';
    else if (!POLA_NO_HP.test(signUpPhone.trim())) errs.no_hp = PESAN_NO_HP_TIDAK_VALID;
    if (!signUpPassword) errs.password = 'Password wajib diisi.';
    else if (signUpPassword.length < 6) errs.password = 'Password minimal 6 karakter.';
    if (!signUpConfirmPassword) errs.password_confirmation = 'Konfirmasi password wajib diisi.';
    else if (signUpPassword !== signUpConfirmPassword) errs.password_confirmation = 'Konfirmasi password tidak cocok.';

    if (Object.keys(errs).length > 0) {
      setSignUpErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/customer/register', {
        nama_lengkap: signUpName.trim(),
        no_hp: signUpPhone.trim(),
        password: signUpPassword,
        password_confirmation: signUpConfirmPassword,
      });

      if (response.data.status === 'success') {
        setSignUpSuccessMessage('Pendaftaran berhasil! Mengalihkan...');
        router.reload({
          onSuccess: () => {
            onClose();
            if (onSuccess) onSuccess();
          },
        });
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const formatted: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.response.data.errors as Record<string, string[]>)) {
          formatted[key] = msgs[0];
        }
        setSignUpErrors(formatted);
      } else {
        setSignUpErrors({
          general: err.response?.data?.message || 'Gagal mendaftar. Silakan coba kembali.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-md w-full bg-white/95 backdrop-blur-2xl border border-black/10 rounded-[32px] shadow-2xl overflow-hidden p-6 sm:p-8 my-auto transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/assets/img/Logo Black.svg"
            alt="SkyLens"
            className="h-9 w-auto object-contain mb-3"
          />
          <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            {mode === 'login' ? 'Masuk ke Akun Customer' : 'Daftar Akun Baru'}
          </h2>
          <p className="text-xs sm:text-sm text-black/60 mt-1 max-w-xs">
            {mode === 'login'
              ? 'Gunakan nomor WhatsApp Anda untuk melanjutkan sewa peralatan.'
              : 'Daftar mudah dengan WhatsApp dan mulai sewa kamera & drone impian.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex p-1 bg-black/5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLoginErrors({});
              setLoginGeneralError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              mode === 'login'
                ? 'bg-white text-black shadow-sm'
                : 'text-black/60 hover:text-black'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setSignUpErrors({});
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              mode === 'signup'
                ? 'bg-white text-black shadow-sm'
                : 'text-black/60 hover:text-black'
            }`}
          >
            Daftar
          </button>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginGeneralError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <p>{loginGeneralError}</p>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 mb-1.5 block">
                Nomor WhatsApp / HP
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={loginPhone}
                  onChange={(e) => {
                    setLoginPhone(e.target.value);
                    setLoginErrors((prev) => ({ ...prev, no_hp: '' }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${
                    loginErrors.no_hp ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                  }`}
                  autoComplete="tel"
                />
              </div>
              {loginErrors.no_hp && (
                <p className="text-[11px] text-red-500 mt-1">{loginErrors.no_hp}</p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password Anda"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  className={`w-full pl-10 pr-11 py-2.5 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${
                    loginErrors.password ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {loginErrors.password && (
                <p className="text-[11px] text-red-500 mt-1">{loginErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-4"
            >
              {loading ? 'Memproses...' : 'Masuk Sekarang'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
            {signUpErrors.general && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <p>{signUpErrors.general}</p>
              </div>
            )}
            {signUpSuccessMessage && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <p>{signUpSuccessMessage}</p>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 mb-1.5 block">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                <input
                  type="text"
                  placeholder="Contoh: Rian Pratama"
                  value={signUpName}
                  onChange={(e) => {
                    setSignUpName(e.target.value);
                    setSignUpErrors((prev) => ({ ...prev, nama_lengkap: '' }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${
                    signUpErrors.nama_lengkap ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                  }`}
                />
              </div>
              {signUpErrors.nama_lengkap && (
                <p className="text-[11px] text-red-500 mt-1">{signUpErrors.nama_lengkap}</p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 mb-1.5 block">
                Nomor WhatsApp / HP
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={signUpPhone}
                  onChange={(e) => {
                    setSignUpPhone(e.target.value);
                    setSignUpErrors((prev) => ({ ...prev, no_hp: '' }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${
                    signUpErrors.no_hp ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                  }`}
                />
              </div>
              {signUpErrors.no_hp && (
                <p className="text-[11px] text-red-500 mt-1">{signUpErrors.no_hp}</p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={signUpPassword}
                  onChange={(e) => {
                    setSignUpPassword(e.target.value);
                    setSignUpErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  className={`w-full pl-10 pr-11 py-2.5 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${
                    signUpErrors.password ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {signUpErrors.password && (
                <p className="text-[11px] text-red-500 mt-1">{signUpErrors.password}</p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 mb-1.5 block">
                Konfirmasi Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  value={signUpConfirmPassword}
                  onChange={(e) => {
                    setSignUpConfirmPassword(e.target.value);
                    setSignUpErrors((prev) => ({ ...prev, password_confirmation: '' }));
                  }}
                  className={`w-full pl-10 pr-11 py-2.5 rounded-xl border bg-white text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${
                    signUpErrors.password_confirmation ? 'border-red-400 bg-red-50/20' : 'border-black/15'
                  }`}
                />
              </div>
              {signUpErrors.password_confirmation && (
                <p className="text-[11px] text-red-500 mt-1">{signUpErrors.password_confirmation}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-4"
            >
              {loading ? 'Mendaftarkan...' : 'Daftar Akun'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-5 text-center text-xs text-black/50">
          Dengan melanjutkan, Anda menyetujui Syarat &amp; Ketentuan serta Kebijakan Rental SkyLens.
        </div>
      </div>
    </div>
  );
}
