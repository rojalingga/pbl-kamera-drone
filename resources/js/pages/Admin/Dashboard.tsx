import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AppLayout from "@/layout/AppLayout";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Receipt,
  Camera,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Wrench,
  Boxes,
  RotateCcw,
  Calendar,
  Filter,
  CreditCard,
  Building2,
  ChevronRight,
  Phone,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

interface DashboardProps {
  filter: {
    periode: "hari_ini" | "minggu_ini" | "bulan_ini" | "tahun_ini" | "custom";
    start_date: string;
    end_date: string;
    label: string;
  };
  ringkasanBisnis: {
    total_pemasukan: number;
    total_pengeluaran: number;
    profit: number;
    total_piutang_belum_lunas: number;
    pemasukan_growth: number;
    pengeluaran_growth: number;
    profit_growth: number;
    profit_margin: number;
    piutang_count: number;
  };
  operasional: {
    total_sewa: number;
    sewa_berjalan: number;
    sewa_terlambat: number;
    menunggu_konfirmasi: number;
    pengembalian_belum_selesai: number;
  };
  inventaris: {
    total_jenis_barang: number;
    total_stok_unit: number;
    stok_tersedia: number;
    sedang_disewa: number;
    dalam_perawatan: number;
    stok_rendah_count: number;
    utilisasi_persen: number;
    barang_stok_rendah: Array<{
      id: string;
      nama_barang: string;
      merk: string;
      kategori: string;
      stok: number;
      harga_sewa: number;
      foto: string;
    }>;
  };
  keuangan: {
    saldo_rekening: Array<{
      id: number;
      nama_rek: string;
      no_rek: string;
      pemilik_rek: string;
      saldo: number;
    }>;
    total_saldo_rekening: number;
    chart_periode: {
      categories: string[];
      pemasukan: number[];
      pengeluaran: number[];
      profit: number[];
    };
    chart_bulanan: {
      categories: string[];
      pemasukan: number[];
      pengeluaran: number[];
      laba: number[];
    };
  };
  aktivitas: {
    sewa_terbaru: Array<{
      id: string;
      no_sewa: string;
      customer: string;
      no_hp: string;
      total_biaya: number;
      status_pembayaran: string;
      status_sewa: string;
      asal_pesanan: string;
      tgl_sewa: string;
      tgl_akhir_sewa: string;
      items_count: number;
      items: string;
    }>;
    pembayaran_terbaru: Array<{
      id: number;
      order_id: string;
      no_dokumen: string;
      tipe: string;
      customer: string;
      gross_amount: number;
      payment_type: string;
      metode_pembayaran: string;
      transaction_status: string;
      waktu: string;
      tanggal: string;
    }>;
    pengembalian_terbaru: Array<{
      id: number;
      no_sewa: string;
      customer: string;
      tgl_pengembalian: string;
      total_denda: number;
      status_pembayaran: string;
      petugas: string;
      items_count: number;
    }>;
    perawatan_terbaru: Array<{
      id: number;
      tgl_perawatan: string;
      total_biaya: number;
      status_pembayaran: string;
      petugas: string;
      items: string;
    }>;
    pengadaan_terbaru: Array<{
      id: number;
      tgl_pengadaan: string;
      keterangan: string;
      total_unit: number;
      items: string;
    }>;
  };
  actionItems: {
    overdue_rentals: Array<{
      id: string;
      no_sewa: string;
      customer: string;
      no_hp: string;
      tgl_akhir: string;
      hari_terlambat: number;
      status_sewa: string;
      total_biaya: number;
      items: string;
    }>;
    pending_payments: Array<{
      id: string;
      no_sewa: string;
      customer: string;
      total_biaya: number;
      tgl_sewa: string;
      asal_pesanan: string;
    }>;
    unpaid_fines: Array<{
      id: number;
      no_sewa: string;
      customer: string;
      no_hp: string;
      total_denda: number;
      tgl_pengembalian: string;
    }>;
  };
}

export default function Dashboard({
  filter,
  ringkasanBisnis,
  operasional,
  inventaris,
  keuangan,
  aktivitas,
  actionItems,
}: DashboardProps) {
  // Filter state
  const [selectedPeriode, setSelectedPeriode] = useState<string>(
    filter?.periode || "bulan_ini"
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    filter?.start_date || ""
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    filter?.end_date || ""
  );
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(
    filter?.periode === "custom"
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Chart view toggle: 'periode' or '6bulan'
  const [chartView, setChartView] = useState<"periode" | "6bulan">("periode");

  // Activity stream tab: 'sewa' | 'pembayaran' | 'pengembalian' | 'aset'
  const [activeTab, setActiveTab] = useState<
    "sewa" | "pembayaran" | "pengembalian" | "aset"
  >("sewa");

  // Rupiah currency formatter
  const formatRupiah = (val: number | null | undefined): string => {
    return "Rp " + Number(val || 0).toLocaleString("id-ID");
  };

  // Handle period change
  const handleSelectPeriode = (periodeKey: string) => {
    setSelectedPeriode(periodeKey);
    if (periodeKey === "custom") {
      setShowCustomPicker(true);
      return;
    }

    setShowCustomPicker(false);
    applyFilter(periodeKey);
  };

  const applyFilter = (
    periodeKey: string,
    start?: string,
    end?: string
  ) => {
    setIsLoading(true);
    const params: Record<string, string> = { periode: periodeKey };
    if (periodeKey === "custom" && start && end) {
      params.start_date = start;
      params.end_date = end;
    }

    router.get(route("dashboard.index"), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onFinish: () => setIsLoading(false),
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) return;
    applyFilter("custom", customStartDate, customEndDate);
  };

  // Chart Configuration
  const isPeriodChart = chartView === "periode";
  const currentChartData = isPeriodChart
    ? keuangan?.chart_periode
    : keuangan?.chart_bulanan;

  const chartCategories = currentChartData?.categories || [];
  const chartPemasukan = currentChartData?.pemasukan || [];
  const chartPengeluaran = currentChartData?.pengeluaran || [];
  const chartProfit = isPeriodChart
    ? keuangan?.chart_periode?.profit || []
    : keuangan?.chart_bulanan?.laba || [];

  const chartKeuanganOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 310,
      toolbar: { show: false },
      fontFamily: "Outfit, system-ui, sans-serif",
    },
    colors: ["#10b981", "#f43f5e", "#f87201"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "42%",
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
      categories: chartCategories,
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
          if (Math.abs(val) >= 1000000000)
            return (val / 1000000000).toFixed(1) + " M";
          if (Math.abs(val) >= 1000000)
            return (val / 1000000).toFixed(1) + " Jt";
          if (Math.abs(val) >= 1000)
            return (val / 1000).toFixed(0) + " Rb";
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
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
    },
  };

  const chartKeuanganSeries = [
    {
      name: "Pemasukan",
      type: "column",
      data: chartPemasukan,
    },
    {
      name: "Pengeluaran",
      type: "column",
      data: chartPengeluaran,
    },
    {
      name: isPeriodChart ? "Profit Periode" : "Laba Bersih",
      type: "line",
      data: chartProfit,
    },
  ];

  // Quick calculations for percentages
  const totalArmada = inventaris?.total_stok_unit || 1;
  const persenTersedia = Math.round(
    ((inventaris?.stok_tersedia || 0) / totalArmada) * 100
  );
  const persenDisewa = Math.round(
    ((inventaris?.sedang_disewa || 0) / totalArmada) * 100
  );
  const persenServis = Math.max(
    0,
    100 - (persenTersedia + persenDisewa)
  );

  return (
    <AppLayout>
      <Head title="Dashboard Owner - Kendali Bisnis Rental Kamera & Drone" />

      <div className="space-y-6">
        {/* ========================================================
            PAGE HEADER & INTELLIGENT PERIOD FILTER
        ======================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Dashboard Bisnis Rental
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                Owner View
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Ringkasan performa finansial, operasional persewaan, dan kesehatan inventori secara menyeluruh.
            </p>
          </div>

          {/* Period Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Filter Pills */}
            <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold">
              {[
                { key: "hari_ini", label: "Hari Ini" },
                { key: "minggu_ini", label: "Minggu Ini" },
                { key: "bulan_ini", label: "Bulan Ini" },
                { key: "tahun_ini", label: "Tahun Ini" },
                { key: "custom", label: "Kustom" },
              ].map((btn) => {
                const isActive = selectedPeriode === btn.key;
                return (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => handleSelectPeriode(btn.key)}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-theme-xs font-bold"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>

            {/* Indicator of Active Scope */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 shadow-theme-xs">
              <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span className="truncate max-w-[180px]">{filter?.label}</span>
              {isLoading && (
                <RefreshCw className="w-3.5 h-3.5 text-brand-500 animate-spin ml-1" />
              )}
            </div>
          </div>
        </div>

        {/* Custom Date Form (Shown when 'Kustom' selected) */}
        {showCustomPicker && (
          <form
            onSubmit={handleCustomSubmit}
            className="p-4 rounded-2xl border border-brand-200 dark:border-brand-900/50 bg-brand-50/40 dark:bg-brand-950/20 flex flex-wrap items-center gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <SlidersHorizontal className="w-4 h-4 text-brand-500" />
              <span>Rentang Tanggal Kustom:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                required
                className="h-8 px-2.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-xs text-gray-500">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                required
                className="h-8 px-2.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition shadow-theme-xs cursor-pointer"
            >
              Terapkan Filter
            </button>
            <button
              type="button"
              onClick={() => handleSelectPeriode("bulan_ini")}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
            >
              Batal
            </button>
          </form>
        )}

        {/* ========================================================
            1. RINGKASAN BISNIS (4 EXECUTIVE FINANCIAL CARDS)
        ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 1: Total Pemasukan */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-theme-xs flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-800 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Total Pemasukan
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                {formatRupiah(ringkasanBisnis?.total_pemasukan)}
              </h2>

              <div className="flex items-center gap-2 mt-2.5 text-xs">
                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                    (ringkasanBisnis?.pemasukan_growth || 0) >= 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                  }`}
                >
                  {(ringkasanBisnis?.pemasukan_growth || 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {ringkasanBisnis?.pemasukan_growth > 0 ? "+" : ""}
                  {ringkasanBisnis?.pemasukan_growth || 0}%
                </span>
                <span className="text-gray-400 text-[11px]">vs periode lalu</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Arus kas sewa &amp; denda</span>
              <Link
                href="/admin/keuangan/pemasukan"
                className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                Rincian <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Total Pengeluaran */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-theme-xs flex flex-col justify-between relative overflow-hidden group hover:border-rose-300 dark:hover:border-rose-800 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Total Pengeluaran
              </span>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                {formatRupiah(ringkasanBisnis?.total_pengeluaran)}
              </h2>

              <div className="flex items-center gap-2 mt-2.5 text-xs">
                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                    (ringkasanBisnis?.pengeluaran_growth || 0) <= 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                  }`}
                >
                  {(ringkasanBisnis?.pengeluaran_growth || 0) <= 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  {ringkasanBisnis?.pengeluaran_growth > 0 ? "+" : ""}
                  {ringkasanBisnis?.pengeluaran_growth || 0}%
                </span>
                <span className="text-gray-400 text-[11px]">vs periode lalu</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Unit baru &amp; perawatan</span>
              <Link
                href="/admin/keuangan/pengeluaran"
                className="font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
              >
                Rincian <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Profit Bersih (Laba Operasional) */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-theme-xs flex flex-col justify-between relative overflow-hidden group hover:border-brand-300 dark:hover:border-brand-800 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Profit Bersih (Laba)
              </span>
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-500 flex items-center justify-center border border-brand-100 dark:border-brand-900/50">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  (ringkasanBisnis?.profit || 0) >= 0
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatRupiah(ringkasanBisnis?.profit)}
              </h2>

              <div className="flex items-center gap-2 mt-2.5 text-xs">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ${
                    (ringkasanBisnis?.profit || 0) >= 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                  }`}
                >
                  {(ringkasanBisnis?.profit || 0) >= 0 ? "Surplus" : "Defisit"} (Margin {ringkasanBisnis?.profit_margin || 0}%)
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Pemasukan - Pengeluaran</span>
              <Link
                href="/admin/laporan/keuangan"
                className="font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
              >
                Laporan <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 4: Total Piutang Belum Lunas */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-theme-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-800 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Piutang Belum Lunas
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                {formatRupiah(ringkasanBisnis?.total_piutang_belum_lunas)}
              </h2>

              <div className="flex items-center gap-2 mt-2.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                  <AlertCircle className="w-3 h-3" />
                  {ringkasanBisnis?.piutang_count || 0} tagihan belum tertagih
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Sisa denda belum bayar</span>
              <Link
                href="/admin/keuangan/piutang"
                className="font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
              >
                Tagih Piutang <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. OPERASIONAL & INVENTARIS HEALTH RADAR
            (Smart combination instead of loose cards)
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Panel Operasional Penyewaan (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-500 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                      Operasional Penyewaan
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Status alur penyewaan dan pengembalian unit saat ini
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    {operasional?.total_sewa || 0} Sewa di Periode Ini
                  </span>
                </div>
              </div>

              {/* 4 Interactive Operational Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Tile 1: Sewa Sedang Berjalan */}
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block mb-1">
                    Sewa Berjalan
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-gray-900 dark:text-white">
                      {operasional?.sewa_berjalan || 0}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">unit</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Di tangan pelanggan
                  </span>
                </div>

                {/* Tile 2: Sewa Terlambat */}
                <div
                  className={`p-3.5 rounded-xl border ${
                    (operasional?.sewa_terlambat || 0) > 0
                      ? "bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900/50"
                      : "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase block mb-1 ${
                      (operasional?.sewa_terlambat || 0) > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-500"
                    }`}
                  >
                    Terlambat
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-xl font-black ${
                        (operasional?.sewa_terlambat || 0) > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {operasional?.sewa_terlambat || 0}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">sewa</span>
                  </div>
                  <span
                    className={`text-[10px] block mt-1 font-medium ${
                      (operasional?.sewa_terlambat || 0) > 0
                        ? "text-red-600 font-bold animate-pulse"
                        : "text-gray-400"
                    }`}
                  >
                    {(operasional?.sewa_terlambat || 0) > 0
                      ? "Perlu segera ditagih!"
                      : "Tepat waktu"}
                  </span>
                </div>

                {/* Tile 3: Menunggu Konfirmasi Bayar */}
                <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-1">
                    Menunggu Bayar
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-gray-900 dark:text-white">
                      {operasional?.menunggu_konfirmasi || 0}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">pending</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Verifikasi pembayaran
                  </span>
                </div>

                {/* Tile 4: Denda Belum Selesai */}
                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 block mb-1">
                    Denda Belum Lunas
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-gray-900 dark:text-white">
                      {operasional?.pengembalian_belum_selesai || 0}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">kasus</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Di pengembalian unit
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Penyewaan terlambat atau denda belum lunas membutuhkan tindak lanjut staf.
              </span>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/transaksi/sewa"
                  className="font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1"
                >
                  Kelola Sewa <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/admin/transaksi/pengembalian"
                  className="font-bold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white flex items-center gap-1"
                >
                  Pengembalian <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Panel Kondisi & Utilisasi Inventaris (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                      Kondisi Inventaris
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {inventaris?.total_jenis_barang || 0} jenis alat dalam katalog
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[11px] font-black text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {inventaris?.total_stok_unit || 0} Total Unit Armada
                </span>
              </div>

              {/* Stacked Fleet Utilization Bar */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    Utilisasi Armada Aktif
                  </span>
                  <span className="font-black text-brand-600 dark:text-brand-400">
                    {inventaris?.utilisasi_persen || 0}% Tersewa
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
                  {/* Tersedia (Green) */}
                  <div
                    style={{ width: `${persenTersedia}%` }}
                    className="h-full bg-emerald-500 transition-all duration-300"
                    title={`Tersedia: ${inventaris?.stok_tersedia || 0} unit`}
                  />
                  {/* Disewa (Brand Orange) */}
                  <div
                    style={{ width: `${persenDisewa}%` }}
                    className="h-full bg-brand-500 transition-all duration-300"
                    title={`Sedang Disewa: ${inventaris?.sedang_disewa || 0} unit`}
                  />
                  {/* Servis (Amber) */}
                  <div
                    style={{ width: `${persenServis}%` }}
                    className="h-full bg-amber-400 transition-all duration-300"
                    title={`Dalam Perawatan: ${inventaris?.dalam_perawatan || 0} unit`}
                  />
                </div>

                {/* Legend Chips */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <strong className="text-gray-900 dark:text-white block">
                        {inventaris?.stok_tersedia || 0} Unit
                      </strong>
                      <span className="text-gray-400 text-[10px]">Tersedia</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" />
                    <div>
                      <strong className="text-gray-900 dark:text-white block">
                        {inventaris?.sedang_disewa || 0} Unit
                      </strong>
                      <span className="text-gray-400 text-[10px]">Disewa</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <strong className="text-gray-900 dark:text-white block">
                        {inventaris?.dalam_perawatan || 0} Unit
                      </strong>
                      <span className="text-gray-400 text-[10px]">Perawatan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Critical Stock Alert */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  (inventaris?.stok_rendah_count || 0) > 0
                    ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40"
                    : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      (inventaris?.stok_rendah_count || 0) > 0
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  />
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {(inventaris?.stok_rendah_count || 0) > 0
                        ? `${inventaris?.stok_rendah_count} Barang Stok Kritis (≤2)`
                        : "Ketersediaan Stok Seluruh Gear Aman"}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      {(inventaris?.stok_rendah_count || 0) > 0
                        ? "Pertimbangkan pengadaan atau percepat perawatan."
                        : "Tidak ada alat dengan stok di bawah batas aman."}
                    </span>
                  </div>
                </div>
                <Link
                  href="/admin/master-data/barang"
                  className="font-bold text-brand-500 hover:text-brand-600 text-xs shrink-0"
                >
                  Katalog →
                </Link>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
              <span>Mutasi stok terpusat lewat riwayat.</span>
              <Link
                href="/admin/inventori/riwayat-stok"
                className="font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1"
              >
                Buku Stok <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================
            3. KEUANGAN & LIKUIDITAS KAS (CHARTS & ACCOUNTS)
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Grafik Arus Kas Keuangan (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-800 gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                    Grafik Pemasukan vs Pengeluaran &amp; Profit
                  </h3>
                  <p className="text-xs text-gray-400">
                    Perbandingan arus kas masuk dari penyewaan dengan beban biaya unit &amp; perawatan
                  </p>
                </div>

                {/* View Switcher: Selected Period vs 6-Month Trend */}
                <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setChartView("periode")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      chartView === "periode"
                        ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-theme-xs font-bold"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Periode Terpilih
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView("6bulan")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      chartView === "6bulan"
                        ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-theme-xs font-bold"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Tren 6 Bulan
                  </button>
                </div>
              </div>

              {/* Chart Render */}
              <div className="w-full min-h-[310px]">
                <ReactApexChart
                  options={chartKeuanganOptions}
                  series={chartKeuanganSeries}
                  type="bar"
                  height={310}
                />
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Pemasukan
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Pengeluaran
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  Laba/Profit Bersih
                </span>
              </div>
              <Link
                href="/admin/laporan/keuangan"
                className="font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1 shrink-0"
              >
                Buka Laporan Keuangan Lengkap <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Ringkasan Saldo Rekening & Kas (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                      Saldo Seluruh Rekening
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Likuiditas kas tunai &amp; rekening bank
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/master-data/rekening"
                  className="text-xs font-bold text-brand-500 hover:text-brand-600"
                >
                  Kelola
                </Link>
              </div>

              {/* Total Liquidity Callout */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50/60 to-orange-50/40 dark:from-brand-950/30 dark:to-gray-900 border border-brand-200/70 dark:border-brand-900/40 mb-4">
                <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider block">
                  Total Kas &amp; Likuiditas Tersedia
                </span>
                <h4 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {formatRupiah(keuangan?.total_saldo_rekening)}
                </h4>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block">
                  Sinkronisasi real-time buku kas &amp; mutasi saldo
                </span>
              </div>

              {/* Individual Accounts List */}
              <div className="space-y-2.5">
                {(keuangan?.saldo_rekening || []).map((rek) => (
                  <div
                    key={rek.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                        {rek.nama_rek.toLowerCase().includes("kas") ? (
                          <Wallet className="w-4 h-4 text-emerald-600" />
                        ) : rek.nama_rek.toLowerCase().includes("qris") ? (
                          <CreditCard className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Building2 className="w-4 h-4 text-brand-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <strong className="text-xs font-bold text-gray-900 dark:text-white block truncate">
                          {rek.nama_rek}
                        </strong>
                        <span className="text-[10px] text-gray-400 block truncate">
                          {rek.no_rek && rek.no_rek !== "-"
                            ? rek.no_rek
                            : "Kas Operasional Toko"}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-gray-900 dark:text-white shrink-0">
                      {formatRupiah(rek.saldo)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex items-center justify-between">
              <span>Semua mutasi tercatat otomatis.</span>
              <Link
                href="/admin/laporan/keuangan"
                className="font-bold text-brand-500 hover:text-brand-600"
              >
                Buku Saldo →
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================
            4. AKTIVITAS TERBARU & ACTION CENTER OWNER
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Feed Aktivitas Terbaru Multi-Tab (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800 gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                    Aktivitas Operasional &amp; Transaksi Terbaru
                  </h3>
                  <p className="text-xs text-gray-400">
                    Pantau alur transaksi terbaru langsung dari satu feed terpadu
                  </p>
                </div>

                {/* Sub Tab Switcher */}
                <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold self-start sm:self-auto">
                  {[
                    { key: "sewa", label: "Sewa" },
                    { key: "pembayaran", label: "Pembayaran" },
                    { key: "pengembalian", label: "Kembali" },
                    { key: "aset", label: "Servis & Pengadaan" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        activeTab === tab.key
                          ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-theme-xs font-bold"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab 1: Sewa Terbaru */}
              {activeTab === "sewa" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
                        <th className="pb-2.5 font-bold">No. Sewa &amp; Pelanggan</th>
                        <th className="pb-2.5 font-bold">Periode</th>
                        <th className="pb-2.5 font-bold">Total</th>
                        <th className="pb-2.5 font-bold">Status Bayar</th>
                        <th className="pb-2.5 font-bold">Status Sewa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                      {(aktivitas?.sewa_terbaru || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400">
                            Belum ada riwayat transaksi sewa.
                          </td>
                        </tr>
                      ) : (
                        (aktivitas?.sewa_terbaru || []).map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                          >
                            <td className="py-2.5 pr-2">
                              <span className="font-bold text-gray-900 dark:text-white block">
                                {row.no_sewa}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {row.customer} ({row.items_count} unit)
                              </span>
                            </td>
                            <td className="py-2.5 pr-2 text-[11px] text-gray-500">
                              <span>{row.tgl_sewa}</span>
                              <span className="block text-[10px] text-gray-400">
                                s/d {row.tgl_akhir_sewa}
                              </span>
                            </td>
                            <td className="py-2.5 pr-2 font-bold text-brand-600 dark:text-brand-400">
                              {formatRupiah(row.total_biaya)}
                            </td>
                            <td className="py-2.5 pr-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.status_pembayaran === "Confirmed"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                }`}
                              >
                                {row.status_pembayaran === "Confirmed"
                                  ? "Lunas"
                                  : "Pending"}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.status_sewa.includes("Terlambat")
                                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                                    : row.status_sewa === "Proses Sewa"
                                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
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
              )}

              {/* Tab 2: Pembayaran Terbaru */}
              {activeTab === "pembayaran" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
                        <th className="pb-2.5 font-bold">Order ID / No. Dokumen</th>
                        <th className="pb-2.5 font-bold">Pelanggan</th>
                        <th className="pb-2.5 font-bold">Nominal</th>
                        <th className="pb-2.5 font-bold">Metode</th>
                        <th className="pb-2.5 font-bold">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                      {(aktivitas?.pembayaran_terbaru || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400">
                            Belum ada riwayat pembayaran.
                          </td>
                        </tr>
                      ) : (
                        (aktivitas?.pembayaran_terbaru || []).map((p) => (
                          <tr
                            key={p.id}
                            className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                          >
                            <td className="py-2.5 pr-2">
                              <span className="font-bold text-gray-900 dark:text-white block truncate max-w-[150px]">
                                {p.order_id}
                              </span>
                              <span className="text-[10px] text-gray-400 block">
                                {p.tipe}
                              </span>
                            </td>
                            <td className="py-2.5 pr-2 font-medium text-gray-800 dark:text-gray-200">
                              {p.customer}
                            </td>
                            <td className="py-2.5 pr-2 font-bold text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(p.gross_amount)}
                            </td>
                            <td className="py-2.5 pr-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                {p.payment_type}
                              </span>
                            </td>
                            <td className="py-2.5 text-[11px] text-gray-500">
                              {p.waktu}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Pengembalian Terbaru */}
              {activeTab === "pengembalian" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
                        <th className="pb-2.5 font-bold">No. Sewa</th>
                        <th className="pb-2.5 font-bold">Pelanggan</th>
                        <th className="pb-2.5 font-bold">Tgl Kembali</th>
                        <th className="pb-2.5 font-bold">Total Denda</th>
                        <th className="pb-2.5 font-bold">Status Denda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                      {(aktivitas?.pengembalian_terbaru || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400">
                            Belum ada riwayat pengembalian.
                          </td>
                        </tr>
                      ) : (
                        (aktivitas?.pengembalian_terbaru || []).map((pg) => (
                          <tr
                            key={pg.id}
                            className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                          >
                            <td className="py-2.5 pr-2 font-bold text-gray-900 dark:text-white">
                              {pg.no_sewa}
                            </td>
                            <td className="py-2.5 pr-2 text-gray-700 dark:text-gray-300">
                              {pg.customer}
                            </td>
                            <td className="py-2.5 pr-2 text-[11px] text-gray-500">
                              {pg.tgl_pengembalian}
                            </td>
                            <td className="py-2.5 pr-2 font-bold text-amber-600 dark:text-amber-400">
                              {formatRupiah(pg.total_denda)}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  pg.status_pembayaran === "Lunas"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                    : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                                }`}
                              >
                                {pg.status_pembayaran}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: Pengadaan & Perawatan */}
              {activeTab === "aset" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-wider mb-2">
                      Perawatan Unit Terkini
                    </h4>
                    <div className="space-y-2">
                      {(aktivitas?.perawatan_terbaru || []).slice(0, 3).map((pr) => (
                        <div
                          key={pr.id}
                          className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <strong className="text-gray-900 dark:text-white block">
                              {pr.items}
                            </strong>
                            <span className="text-[10px] text-gray-400">
                              {pr.tgl_perawatan} • Teknisi: {pr.petugas}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-rose-600 block">
                              {formatRupiah(pr.total_biaya)}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-500">
                              {pr.status_pembayaran}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-wider mb-2">
                      Pengadaan Unit Terkini
                    </h4>
                    <div className="space-y-2">
                      {(aktivitas?.pengadaan_terbaru || []).slice(0, 2).map((pd) => (
                        <div
                          key={pd.id}
                          className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <strong className="text-gray-900 dark:text-white block">
                              {pd.keterangan}
                            </strong>
                            <span className="text-[10px] text-gray-400">
                              {pd.tgl_pengadaan} • {pd.items}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 text-[10px] font-black shrink-0">
                            +{pd.total_unit} Unit
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
              <span>Menampilkan maksimal 6 data aktivitas terbaru.</span>
              <Link
                href="/admin/laporan/sewa"
                className="font-bold text-brand-500 hover:text-brand-600"
              >
                Laporan Persewaan →
              </Link>
            </div>
          </div>

          {/* Tindakan Perlu Perhatian Owner / Action Center (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                      Perhatian Segera (Action Items)
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Isu operasional atau denda yang memerlukan intervensi
                    </p>
                  </div>
                </div>
              </div>

              {/* Action List */}
              <div className="space-y-3">
                {/* 1. Overdue Rentals */}
                {(actionItems?.overdue_rentals || []).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Sewa Terlambat Dikembalikan (
                        {actionItems?.overdue_rentals.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {actionItems.overdue_rentals.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <strong className="text-gray-900 dark:text-white block truncate">
                              {item.no_sewa} — {item.customer}
                            </strong>
                            <span className="text-[10px] text-gray-500 block truncate">
                              Item: {item.items}
                            </span>
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">
                              Jatuh tempo: {item.tgl_akhir}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black block mb-1">
                              +{item.hari_terlambat} Hari
                            </span>
                            {item.no_hp && item.no_hp !== "-" && (
                              <a
                                href={`https://wa.me/${item.no_hp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:underline"
                              >
                                <Phone className="w-2.5 h-2.5" /> Hubungi
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Unpaid Fines */}
                {(actionItems?.unpaid_fines || []).length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5" />
                        Denda Pengembalian Belum Lunas (
                        {actionItems?.unpaid_fines.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {actionItems.unpaid_fines.map((f) => (
                        <div
                          key={f.id}
                          className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs flex items-center justify-between"
                        >
                          <div>
                            <strong className="text-gray-900 dark:text-white block">
                              {f.no_sewa} — {f.customer}
                            </strong>
                            <span className="text-[10px] text-gray-400">
                              Dikembalikan {f.tgl_pengembalian}
                            </span>
                          </div>
                          <span className="font-extrabold text-amber-700 dark:text-amber-400 text-xs">
                            {formatRupiah(f.total_denda)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Empty State if no issues */}
                {(actionItems?.overdue_rentals || []).length === 0 &&
                  (actionItems?.unpaid_fines || []).length === 0 && (
                    <div className="py-10 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <strong className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        Semua Operasional Terkendali
                      </strong>
                      <span className="text-[11px] max-w-xs">
                        Tidak ada unit sewa yang terlambat dikembalikan maupun piutang denda tertunggak saat ini.
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 flex items-center justify-between">
              <span>Prioritas pencegahan risiko kerugian aset.</span>
              <Link
                href="/admin/transaksi/pengembalian"
                className="font-bold text-brand-500 hover:text-brand-600"
              >
                Pusat Pengembalian →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
