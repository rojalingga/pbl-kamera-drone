import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import Swal from "sweetalert2";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import Select from "@/components/form/Select";
import TablePagination from "@/components/common/TablePagination";
import { Permissions } from "@/types";
import { formatRupiah } from "@/utils/format";
import {
  SearchIcon,
  DownloadIcon,
} from "@/icons";

interface KeuanganRow {
  id: number;
  tanggal: string | null;
  jenis: string;
  kategori: string;
  rekening: string;
  nominal: number | string;
  saldo: number | string;
}

interface RekeningItem {
  id: number;
  nama_rek: string;
}

interface IndexProps {
  permissions: Permissions;
  rekenings: RekeningItem[];
}

export default function LaporanKeuanganIndex({ permissions, rekenings }: IndexProps) {
  const [data, setData] = useState<KeuanganRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [totalMasuk, setTotalMasuk] = useState<number>(0);
  const [totalKeluar, setTotalKeluar] = useState<number>(0);
  const [saldo, setSaldo] = useState<number>(0);

  const [tanggalAwal, setTanggalAwal] = useState<string>("");
  const [tanggalAkhir, setTanggalAkhir] = useState<string>("");
  const defaultRekeningId = (() => {
    const utama = (rekenings ?? []).find((row) => row.id === 2) ?? rekenings?.[0];
    return utama ? String(utama.id) : "";
  })();

  const [rekeningFilter, setRekeningFilter] = useState<string>(defaultRekeningId);
  const [filterError, setFilterError] = useState<string>("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setFilterError("");

    try {
      const params: Record<string, string> = {};
      if (tanggalAwal) params.tanggal_awal = tanggalAwal;
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir;
      if (rekeningFilter) params.id_rekening = rekeningFilter;

      const response = await axios.get("/admin/laporan/keuangan/data", {
        params,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (response.data) {
        setData(response.data.data ?? []);
        setTotalMasuk(Number(response.data.total_masuk ?? 0));
        setTotalKeluar(Number(response.data.total_keluar ?? 0));
        setSaldo(Number(response.data.saldo ?? 0));
      }
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFilterError(
          err.response.data?.errors?.tanggal_akhir?.[0] ||
            err.response.data?.errors?.id_rekening?.[0] ||
            err.response.data?.message ||
            "Filter tidak valid."
        );
      } else {
        console.error("Gagal memuat laporan keuangan:", err);
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: "Terjadi kesalahan saat memuat laporan keuangan.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [tanggalAwal, tanggalAkhir, rekeningFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const resetFilter = () => {
    setTanggalAwal("");
    setTanggalAkhir("");
    setRekeningFilter(defaultRekeningId);
    setSearch("");
    setCurrentPage(1);
  };

  const rekeningOptions = (rekenings ?? []).map((row) => ({
    value: String(row.id),
    label: row.nama_rek,
  }));


  const exportParams = () => {
    const params = new URLSearchParams();
    if (tanggalAwal) params.append("tanggal_awal", tanggalAwal);
    if (tanggalAkhir) params.append("tanggal_akhir", tanggalAkhir);
    if (rekeningFilter) params.append("id_rekening", rekeningFilter);
    return params.toString();
  };

  const cetakExcel = () => {
    const query = exportParams();
    window.open(`/admin/laporan/keuangan/export-excel${query ? `?${query}` : ""}`, "_blank");
  };

  const cetakPdf = () => {
    const query = exportParams();
    window.open(`/admin/laporan/keuangan/export-pdf${query ? `?${query}` : ""}`, "_blank");
  };

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();
    return (
      (item.kategori ?? "").toLowerCase().includes(keyword) ||
      (item.rekening ?? "").toLowerCase().includes(keyword) ||
      (item.jenis ?? "").toLowerCase().includes(keyword) ||
      (item.tanggal ?? "").toLowerCase().includes(keyword)
    );
  });

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  return (
    <AppLayout>
      <Head title="Laporan Keuangan - Admin" />
      <PageBreadcrumb parent="Laporan" pageTitle="Laporan Keuangan" />

      <div className="space-y-6">

        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="tanggal_awal"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Tanggal Awal
                </label>
                <DatePicker
                  id="tanggal_awal"
                  placeholder="Pilih tanggal"
                  defaultDate={tanggalAwal || undefined}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTanggalAwal(dateStr);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tanggal_akhir"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Tanggal Akhir
                </label>
                <DatePicker
                  id="tanggal_akhir"
                  placeholder="Pilih tanggal"
                  defaultDate={tanggalAkhir || undefined}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTanggalAkhir(dateStr);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="rekening"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Rekening
                </label>
                <Select
                  id="rekening"
                  options={rekeningOptions}
                  placeholder="- Semua Rekening -"
                  value={rekeningFilter}
                  onChange={(val) => {
                    setRekeningFilter(val);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  &nbsp;
                </label>
                <button
                  type="button"
                  onClick={resetFilter}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            </div>

            {filterError && (
              <p className="mt-3 text-xs text-red-500">{filterError}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Pemasukan
            </p>
            <p className="mt-2 text-xl font-bold text-success-600 dark:text-success-400">
              Rp {formatRupiah(totalMasuk, "0")}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Pengeluaran
            </p>
            <p className="mt-2 text-xl font-bold text-red-600 dark:text-red-400">
              Rp {formatRupiah(totalKeluar, "0")}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">Saldo</p>
            <p
              className={`mt-2 text-xl font-bold ${
                saldo >= 0
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              Rp {formatRupiah(saldo, "0")}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

          <div className="border-b border-gray-200 p-5 sm:p-6 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Laporan Arus Kas
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gabungan pemasukan dan pengeluaran per periode tanggal.
            </p>
          </div>

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Tampilkan
              </span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                data
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cetakExcel}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-green-700 transition-colors"
                >
                  <DownloadIcon className="size-4" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={cetakPdf}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-red-700 transition-colors"
                >
                  <DownloadIcon className="size-4" />
                  <span>PDF</span>
                </button>
              </div>
              <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Cari kategori, rekening..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 ps-10 pe-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
              <SearchIcon className="absolute inset-s-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            </div>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">No</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4 text-center">Jenis</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Rekening</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                  <th className="px-6 py-4 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="size-7 animate-spin rounded-full border-3 border-brand-500 border-t-transparent"></div>
                        <span className="text-xs">Memuat laporan...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      {search || tanggalAwal || tanggalAkhir || rekeningFilter
                        ? "Tidak ada transaksi pada filter yang dipilih."
                        : "Belum ada data transaksi."}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => {
                    const itemIndex = (currentPage - 1) * perPage + index + 1;
                    const isMasuk = item.jenis === "Pemasukan";
                    return (
                      <tr
                        key={`${item.tanggal}-${index}-${itemIndex}`}
                        className="hover:bg-gray-50/80 dark:hover:bg-white/3 transition-colors"
                      >
                        <td className="px-6 py-4 text-center font-medium text-gray-600 dark:text-gray-400">
                          {itemIndex}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {item.tanggal}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              isMasuk
                                ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                                : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            }`}
                          >
                            {item.jenis}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">
                          {item.kategori ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {item.rekening ?? "-"}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-semibold ${
                            isMasuk
                              ? "text-success-600 dark:text-success-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isMasuk ? "+" : "-"} Rp {item.nominal}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-600 dark:text-gray-400">
                          Rp {item.saldo}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            perPage={perPage}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>
    </AppLayout>
  );
}
