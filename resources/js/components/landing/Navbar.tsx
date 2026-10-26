import React, { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { Menu, X, User, Package, LogOut, ChevronDown, ShoppingCart } from 'lucide-react';
import CustomerAuthModal from '@/components/auth/CustomerAuthModal';
import { PageProps } from '@/types';

export interface NavbarProps {
  isDark?: boolean;
}

export default function Navbar({ isDark = false }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const { url, props } = usePage<PageProps>();
  const customer = props.auth?.customer;

  useEffect(() => {
    const handleScroll = () => {
      setIsMobileMenuOpen((prev) => (prev ? false : prev));
      setIsProfileDropdownOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsCustomerModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    router.post('/customer/logout');
    setIsProfileDropdownOpen(false);
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out flex justify-center"
      >
        <div
          className={`relative backdrop-blur-2xl backdrop-saturate-150 w-full max-w-full rounded-none flex flex-col transition-colors duration-500 ease-in-out ${
            isMobileMenuOpen
              ? `shadow-2xl rounded-b-[2rem] border-b ${
                  isDark ? 'bg-zinc-900/85 border-white/12' : 'bg-white/85 border-black/12'
                }`
              : `border-b ${
                  isDark ? 'bg-zinc-950/72 border-white/10' : 'bg-white/72 border-black/10'
                }`
          }`}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between w-full max-w-[1440px] mx-auto shrink-0 h-24 px-4 sm:px-5 lg:px-6"
          >
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <img
                src="/assets/img/Logo Black.svg"
                alt="SkyLens Logo"
                className={`h-8 sm:h-10 w-auto object-contain ${isDark ? 'hidden' : 'block'}`}
              />
              <img
                src="/assets/img/Logo White.svg"
                alt="SkyLens Logo"
                className={`h-8 sm:h-10 w-auto object-contain ${isDark ? 'block' : 'hidden'}`}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-7 lg:gap-9 text-sm font-semibold absolute left-1/2 -translate-x-1/2 transition-all duration-500">
              <Link
                href="/"
                className={`transition-colors ${
                  url === '/'
                    ? 'text-brand-500 font-bold'
                    : isDark
                    ? 'text-white/70 hover:text-brand-400'
                    : 'text-black/70 hover:text-brand-500'
                }`}
              >
                Beranda
              </Link>
              <Link
                href="/katalog"
                className={`transition-colors ${
                  url.startsWith('/katalog')
                    ? 'text-brand-500 font-bold'
                    : isDark
                    ? 'text-white/70 hover:text-brand-400'
                    : 'text-black/70 hover:text-brand-500'
                }`}
              >
                Katalog
              </Link>
              <Link
                href="/tentang-kami"
                className={`transition-colors ${
                  url.startsWith('/tentang-kami')
                    ? 'text-brand-500 font-bold'
                    : isDark
                    ? 'text-white/70 hover:text-brand-400'
                    : 'text-black/70 hover:text-brand-500'
                }`}
              >
                Tentang Kami
              </Link>
            </nav>

            {/* Customer Authentication CTA (Right) */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              {customer ? (
                <div className="flex items-center gap-2.5">
                  {/* Cart Icon Button */}
                  <Link
                    href="/keranjang"
                    title="Keranjang Belanja"
                    className={`relative p-2.5 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                      url === '/keranjang'
                        ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/20'
                        : isDark
                        ? 'bg-white/10 border-white/15 text-white hover:bg-white/15 hover:text-brand-400'
                        : 'bg-black/5 border-black/10 text-black hover:bg-black/10 hover:text-brand-500'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {(customer.cart_count ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-md animate-in zoom-in-50">
                        {customer.cart_count! > 99 ? '99+' : customer.cart_count}
                      </span>
                    )}
                  </Link>

                  {/* Logged-in Customer Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className={`flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs sm:text-sm font-semibold transition-all ${
                        isDark
                          ? 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                          : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">
                        {customer.nama_lengkap.charAt(0).toUpperCase()}
                      </div>
                      <span className="max-w-[120px] truncate">{customer.nama_lengkap}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-black/50" />
                    </button>

                    {/* Dropdown Menu */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-2xl border border-black/10 rounded-2xl shadow-2xl p-2 z-50 text-black animate-in fade-in duration-200">
                        <div className="px-3 py-2 border-b border-black/5 mb-1">
                          <p className="text-xs font-bold text-black truncate">{customer.nama_lengkap}</p>
                          <p className="text-[11px] text-black/50">{customer.no_hp}</p>
                        </div>

                        <Link
                          href="/keranjang"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-brand-50 hover:text-brand-600 transition-colors w-full"
                        >
                          <span className="flex items-center gap-2.5">
                            <ShoppingCart className="w-4 h-4 text-brand-500" />
                            Keranjang Belanja
                          </span>
                          {(customer.cart_count ?? 0) > 0 && (
                            <span className="bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {customer.cart_count}
                            </span>
                          )}
                        </Link>

                        <Link
                          href="/riwayat-sewa"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-brand-50 hover:text-brand-600 transition-colors w-full"
                        >
                          <Package className="w-4 h-4 text-brand-500" />
                          Riwayat Sewa Saya
                        </Link>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors w-full text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Keluar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Guest Action Buttons */
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openAuth('login')}
                    className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-full transition-colors cursor-pointer ${
                      isDark ? 'text-white hover:text-brand-400' : 'text-black/80 hover:text-black'
                    }`}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth('signup')}
                    className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-500/20 transition-all cursor-pointer"
                  >
                    Daftar
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="md:hidden flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'text-white' : 'text-black'
                }`}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Collapsible Drawer */}
          {isMobileMenuOpen && (
            <div className="md:hidden p-5 pt-2 border-t border-black/5 flex flex-col gap-3">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold transition-colors ${
                  url === '/' ? 'text-brand-500' : 'text-black/80'
                }`}
              >
                Beranda
              </Link>
              <Link
                href="/katalog"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold transition-colors ${
                  url.startsWith('/katalog') ? 'text-brand-500' : 'text-black/80'
                }`}
              >
                Katalog Peralatan
              </Link>
              <Link
                href="/tentang-kami"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold transition-colors ${
                  url.startsWith('/tentang-kami') ? 'text-brand-500' : 'text-black/80'
                }`}
              >
                Tentang Kami
              </Link>

              <div className="h-px bg-black/10 my-2" />

              {customer ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5 py-1">
                    <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">
                      {customer.nama_lengkap.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-black">{customer.nama_lengkap}</p>
                      <p className="text-[11px] text-black/50">{customer.no_hp}</p>
                    </div>
                  </div>
                  <Link
                    href="/keranjang"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2 text-xs font-bold text-black hover:text-brand-600 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-brand-500" /> Keranjang Belanja
                    </span>
                    {(customer.cart_count ?? 0) > 0 && (
                      <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {customer.cart_count}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/riwayat-sewa"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-xs font-bold text-brand-600"
                  >
                    <Package className="w-4 h-4" /> Riwayat Sewa Saya
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 py-2 text-xs font-bold text-red-600 text-left"
                  >
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => openAuth('login')}
                    className="w-full py-2.5 rounded-full border border-black/15 font-bold text-xs text-center"
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth('signup')}
                    className="w-full py-2.5 rounded-full bg-brand-500 text-white font-bold text-xs text-center shadow-md"
                  >
                    Daftar Akun Customer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isCustomerModalOpen}
        initialMode={authMode}
        onClose={() => setIsCustomerModalOpen(false)}
      />
    </>
  );
}
