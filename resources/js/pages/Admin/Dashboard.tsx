import React from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layout/AppLayout";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Camera,
  AlertTriangle,
  Globe,
  Store,
  Layers,
  Calendar,
  Clock,
  ArrowUpRight,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";

interface DashboardProps {
  stats: {
    total_pendapatan: number;
    total_pengeluaran: number;
    laba_bersih: number;
    sewa_aktif: number;
    sewa_bulan_ini: number;
    sewa_web_count: number;
    sewa_admin_count: number;
    total_barang: number;
    stok_kritis: number;
    unit_dalam_perawatan: number;
    piutang_belum: number;
  };
  chartKeuangan: {
    categories: string[];
    pemasukan: number[];
    pengeluaran: number[];
    laba: number[];
  };
  chartKategori: {
    labels: string[];
    series: number[];
  };
  chartAsalPesanan: {
    labels: string[];
    series: number[];
  };
  sewaTerbaru: Array<{
    id: string;
    no_sewa: string;
    customer: string;
    total_biaya: number;
    status_pembayaran: string;
    status_sewa: string;
    asal_pesanan: string;
    tgl_sewa: string;
    tgl_akhir_sewa: string;
    items_count: number;
  }>;
  topBarang: Array<{
    id: string;
    nama_barang: string;
    kategori: string;
    merk: string;
    stok: number;
    harga_sewa: number;
    total_tersewa: number;
    foto: string;
  }>;
  jatuhTempo: Array<{
    id: string;
    no_sewa: string;
    customer: string;
    no_hp: string;
    tgl_akhir: string;
    status_sewa: string;
  }>;
}

export default function Dashboard({
  stats,
  chartKeuangan,
  chartKategori,
  chartAsalPesanan,
  sewaTerbaru = [],
  topBarang = [],
  jatuhTempo = [],
}: DashboardProps) {
  const formatRupiah = (val: number) => {
    return "Rp" + Number(val || 0).toLocaleString("id-ID");
  };

  // ApexOptions: Keuangan (Bar & Line Chart)
  const chartKeuanganOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 330,
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#10b981", "#ef4444", "#f87201"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 4,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: [0, 0, 3],
      curve: "smooth",
    },
    xaxis: {
      categories: chartKeuangan?.categories || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#6b7280", fontSize: "11px", fontWeight: 500 },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#6b7280", fontSize: "11px" },
        formatter: (val) => {
          if (val >= 1000000) return (val / 1000000).toFixed(1) + " Jt";
          if (val >= 1000) return (val / 1000).toFixed(0) + " Rb";
          return String(val);
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val) => formatRupiah(val),
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      markers: { size: 5 },
    },
    grid: {
      borderColor: "#f3f4f6",
      strokeDashArray: 4,
    },
  };

  const chartKeuanganSeries = [
    {
      name: "Pemasukan",
      type: "column",
      data: chartKeuangan?.pemasukan || [],
    },
    {
      name: "Pengeluaran",
      type: "column",
      data: chartKeuangan?.pengeluaran || [],
    },
    {
      name: "Laba Bersih",
      type: "line",
      data: chartKeuangan?.laba || [],
    },
  ];

  // ApexOptions: Kategori Donut Chart
  const chartKategoriOptions: ApexOptions = {
    chart: {
      type: "donut",
      height: 260,
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#f87201", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"],
    labels: chartKategori?.labels || [],
    legend: {
      position: "bottom",
      fontSize: "12px",
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Unit",
              fontSize: "12px",
              fontWeight: 600,
              color: "#6b7280",
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
  };

  // ApexOptions: Asal Pesanan Donut Chart
  const chartAsalOptions: ApexOptions = {
    chart: {
      type: "donut",
      height: 220,
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#0284c7", "#f87201"],
    labels: chartAsalPesanan?.labels || ["Online Web", "Kasir Admin"],
    legend: {
      position: "bottom",
      fontSize: "11px",
    },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
        },
      },
    },
    stroke: { width: 2 },
  };

  return (
    <AppLayout>
      <Head title="Dashboard Ringkasan Operasional & Keuangan" />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              Dashboard Operasional &amp; Keuangan
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Ringkasan real-time performa persewaan kamera &amp; drone SkyLens Studio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif &amp; Terhubung
            </span>
          </div>
        </div>

        {/* 1. Baris KPI Metric Cards (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 1: Pendapatan Bulan Ini */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Pendapatan Bulan Ini
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                {formatRupiah(stats?.total_pendapatan || 0)}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    (stats?.laba_bersih || 0) >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Laba: {formatRupiah(stats?.laba_bersih || 0)}
                </span>
                <span className="text-gray-400">| bln berjalan</span>
              </div>
            </div>
          </div>

          {/* Card 2: Persewaan Aktif */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Sewa Aktif (Berjalan)
              </span>
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                  {stats?.sewa_aktif || 0}
                </h2>
                <span className="text-xs text-gray-500">transaksi</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" />
                  {stats?.unit_dalam_perawatan || 0} unit dlm servis
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Sewa Bulan Ini & Sumber Pesanan */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Sewa Bulan Ini
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                  {stats?.sewa_bulan_ini || 0}
                </h2>
                <span className="text-xs text-gray-500">pesanan</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="inline-flex items-center gap-1 text-sky-600 font-bold">
                  <Globe className="w-3 h-3" /> Web: {stats?.sewa_web_count || 0}
                </span>
                <span className="text-gray-300">/</span>
                <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 font-bold">
                  <Store className="w-3 h-3" /> Kasir: {stats?.sewa_admin_count || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Piutang Denda & Stok Kritis */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Piutang &amp; Stok Kritis
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatRupiah(stats?.piutang_belum || 0)}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span
                  className={`font-semibold ${
                    (stats?.stok_kritis || 0) > 0 ? "text-red-500" : "text-emerald-600"
                  }`}
                >
                  {stats?.stok_kritis || 0} barang stok menipis (≤2)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Baris Grafik / Chart (Keuangan & Komposisi) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Kolom Kiri: Arus Kas Keuangan 6 Bulan Terakhir (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 border-b border-gray-100 dark:border-gray-800 gap-2">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Tren Keuangan &amp; Arus Kas (6 Bulan Terakhir)
                </h3>
                <p className="text-xs text-gray-500">
                  Perbandingan pemasukan sewa/denda dengan pengeluaran unit &amp; perawatan
                </p>
              </div>
              <Link
                href="/admin/laporan/keuangan"
                className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1 shrink-0"
              >
                <span>Lihat Laporan Lengkap</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1 w-full min-h-[330px]">
              <ReactApexChart
                options={chartKeuanganOptions}
                series={chartKeuanganSeries}
                type="bar"
                height={330}
              />
            </div>
          </div>

          {/* Kolom Kanan: Donut Chart Kategori & Asal Pesanan (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Donut Chart: Komposisi Sewa Per Kategori */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="pb-3 border-b border-gray-100 dark:border-gray-800 mb-3">
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Komposisi Sewa Per Kategori
                </h3>
                <p className="text-[11px] text-gray-500">
                  Penyewaan berdasarkan kelompok gear
                </p>
              </div>
              <div className="min-h-[260px] flex items-center justify-center">
                <ReactApexChart
                  options={chartKategoriOptions}
                  series={chartKategori?.series || []}
                  type="donut"
                  height={260}
                />
              </div>
            </div>

            {/* Donut Chart: Asal Pesanan (Web vs Admin) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="pb-3 border-b border-gray-100 dark:border-gray-800 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                    Sumber Pesanan Sewa
                  </h3>
                  <p className="text-[11px] text-gray-500">Katalog Web Online vs Kasir Admin</p>
                </div>
              </div>
              <div className="min-h-[220px] flex items-center justify-center">
                <ReactApexChart
                  options={chartAsalOptions}
                  series={chartAsalPesanan?.series || [1, 1]}
                  type="donut"
                  height={220}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Baris Tabel Operasional: Sewa Terkini & Peringatan Jatuh Tempo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Kolom Kiri: Tabel Transaksi Sewa Terkini (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Transaksi Sewa Terkini
                </h3>
                <p className="text-xs text-gray-500">
                  Daftar transaksi sewa terbaru yang masuk ke dalam sistem
                </p>
              </div>
              <Link
                href="/admin/transaksi/sewa"
                className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1"
              >
                <span>Kelola Semua Sewa</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-bold">No. Sewa &amp; Pelanggan</th>
                    <th className="pb-3 font-bold">Asal Pesanan</th>
                    <th className="pb-3 font-bold">Periode Sewa</th>
                    <th className="pb-3 font-bold">Total Biaya</th>
                    <th className="pb-3 font-bold">Status Bayar</th>
                    <th className="pb-3 font-bold">Status Sewa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium text-gray-800 dark:text-gray-200">
                  {sewaTerbaru.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">
                        Belum ada transaksi sewa.
                      </td>
                    </tr>
                  ) : (
                    sewaTerbaru.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3.5 pr-3">
                          <span className="font-bold text-gray-900 dark:text-white block">
                            {row.no_sewa}
                          </span>
                          <span className="text-[11px] text-gray-500">{row.customer}</span>
                        </td>
                        <td className="py-3.5 pr-3">
                          {row.asal_pesanan === "web" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                              <Globe className="w-3 h-3" /> Web
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              <Store className="w-3 h-3" /> Admin
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-3 text-[11px]">
                          <span>{row.tgl_sewa}</span>
                          <span className="text-gray-400 block">s/d {row.tgl_akhir_sewa}</span>
                        </td>
                        <td className="py-3.5 pr-3 font-bold text-brand-600">
                          {formatRupiah(row.total_biaya)}
                        </td>
                        <td className="py-3.5 pr-3">
                          {row.status_pembayaran === "Confirmed" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              Lunas
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status_sewa.includes("Terlambat")
                                ? "bg-red-50 text-red-600 dark:bg-red-950/40"
                                : row.status_sewa === "Proses Sewa"
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800"
                            }`}
                          >
                            {row.status_sewa}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kolom Kanan: Peringatan Jatuh Tempo & Top Gear (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Peringatan Jatuh Tempo */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Jatuh Tempo &amp; Terlambat ({jatuhTempo.length})
                </h3>
              </div>

              {jatuhTempo.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span>Semua unit sewa saat ini aman &amp; tepat waktu.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {jatuhTempo.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/50 text-xs flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-gray-900 dark:text-white block">
                          {item.no_sewa}
                        </strong>
                        <span className="text-gray-600 dark:text-gray-400 block text-[11px]">
                          {item.customer} ({item.no_hp})
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                          Batas: {item.tgl_akhir}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black shrink-0">
                        {item.status_sewa}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Peralatan Paling Sering Disewa */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Gear Terpopuler
                </h3>
                <Link
                  href="/admin/master-data/barang"
                  className="text-[11px] font-bold text-brand-500 hover:text-brand-600"
                >
                  Kelola Barang
                </Link>
              </div>

              <div className="space-y-3">
                {topBarang.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Belum ada data barang.</p>
                ) : (
                  topBarang.map((b) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden p-0.5 shrink-0 flex items-center justify-center">
                        <img
                          src={b.foto}
                          alt={b.nama_barang}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {b.nama_barang}
                        </h4>
                        <span className="text-[10px] text-gray-500 block truncate">
                          {b.merk} • {b.kategori}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-brand-600 block">
                          {b.total_tersewa}x disewa
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Stok: <strong>{b.stok}</strong>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
