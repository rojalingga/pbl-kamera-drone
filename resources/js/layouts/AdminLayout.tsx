import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
  LayoutDashboard,
  Layers,
  ShoppingBag,
  CircleDollarSign,
  Boxes,
  FileBarChart,
  Settings,
  Menu as MenuIcon,
  X,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Camera,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  active?: boolean;
  badge?: string;
  children?: { title: string; href: string }[];
}

export default function AdminLayout({
  children,
  title = 'Admin Panel',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { auth, flash, appName } = usePage<PageProps>().props;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentPath = window.location.pathname;

  const navigation: { group: string; items: NavItem[] }[] = [
    {
      group: 'Utama',
      items: [
        {
          title: 'Dashboard',
          href: '/admin/dashboard',
          icon: LayoutDashboard,
          active: currentPath.includes('/admin/dashboard'),
        },
      ],
    },
    {
      group: 'Master & Inventori',
      items: [
        {
          title: 'Master Barang',
          href: '/admin/master-data/barang',
          icon: Camera,
          active: currentPath.includes('/master-data/barang'),
        },
        {
          title: 'Kategori & Merk',
          href: '/admin/master-data/kategori',
          icon: Layers,
          active: currentPath.includes('/master-data/kategori') || currentPath.includes('/master-data/merk'),
        },
        {
          title: 'Riwayat Stok',
          href: '/admin/inventori/riwayat-stok',
          icon: Boxes,
          active: currentPath.includes('/inventori/riwayat-stok'),
        },
      ],
    },
    {
      group: 'Operasional & Keuangan',
      items: [
        {
          title: 'Transaksi Sewa',
          href: '/admin/transaksi/sewa',
          icon: ShoppingBag,
          active: currentPath.includes('/transaksi/sewa'),
          badge: 'Aktif',
        },
        {
          title: 'Kas & Keuangan',
          href: '/admin/keuangan/pemasukan',
          icon: CircleDollarSign,
          active: currentPath.includes('/keuangan'),
        },
        {
          title: 'Laporan',
          href: '/admin/laporan/sewa',
          icon: FileBarChart,
          active: currentPath.includes('/laporan'),
        },
      ],
    },
    {
      group: 'Sistem',
      items: [
        {
          title: 'Pengaturan & Akses',
          href: '/admin/pengaturan/pengguna',
          icon: Settings,
          active: currentPath.includes('/pengaturan'),
        },
      ],
    },
  ];

  const handleLogout = () => {
    router.post('/admin/logout');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1">

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >

          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
            <Link href="/admin/dashboard" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  AeroLens <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  Rental & Management
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {navigation.map((group, idx) => (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {group.group}
                </p>
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                          item.active
                            ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                              item.active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                            }`}
                          />
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 ring-2 ring-indigo-500/30">
                <AvatarImage src={auth?.user?.avatar} />
                <AvatarFallback>{auth?.user?.name?.slice(0, 2) || 'AD'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {auth?.user?.name || 'Administrator'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {auth?.user?.email || 'admin@rental.test'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          <header className="h-16 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base lg:text-lg font-semibold text-white tracking-tight">
                  {title}
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Sistem Informasi Rental Kamera & Drone Pro
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kamera, sewa, customer..."
                  className="bg-slate-800/50 border border-slate-700/60 text-xs text-slate-200 placeholder-slate-400 pl-9 pr-4 py-2 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={auth?.user?.avatar} />
                      <AvatarFallback className="bg-indigo-600/30 text-indigo-300 text-xs">
                        {auth?.user?.name?.slice(0, 2) || 'AD'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-slate-300 hidden sm:inline-block">
                      {auth?.user?.name || 'Admin'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-200">
                  <DropdownMenuLabel>
                    <p className="font-semibold text-sm">{auth?.user?.name || 'Admin'}</p>
                    <p className="text-xs text-slate-400 font-normal">{auth?.user?.username || 'admin'}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer">
                    <UserIcon className="w-4 h-4 mr-2 text-indigo-400" /> Profil Saya
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer">
                    <Settings className="w-4 h-4 mr-2 text-indigo-400" /> Pengaturan Sistem
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="focus:bg-red-500/20 text-red-400 focus:text-red-300 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {flash?.success && (
            <div className="mx-4 lg:mx-8 mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{flash.success}</span>
            </div>
          )}
          {flash?.error && (
            <div className="mx-4 lg:mx-8 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{flash.error}</span>
            </div>
          )}

          <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
