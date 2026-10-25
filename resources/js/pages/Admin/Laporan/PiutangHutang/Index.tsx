import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import Swal from "sweetalert2";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import Select from "@/components/form/Select";
import TablePagination from "@/components/common/TablePagination";
import Rupiah from "@/components/common/Rupiah";
import { Permissions } from "@/types";
import { formatRupiah, parseRupiah } from "@/utils/format";
import {
  SearchIcon,
  DownloadIcon,
} from "@/icons";

interface ReportRow {
  id: number;
  tgl_piutang?: string | null;
  tgl_pelunasan?: string | null;
  nominal: string | number | null;
  terbayar: string | number | null;
  customer?: string;
  sisa?: string;
  status?: string;
}

interface IndexProps {
  permissions: Permissions;
}

export default function LaporanPiutangHutangIndex({ permissions }: IndexProps) {
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tanggalAkhir, setTanggalAkhir] = useState<string>("");
  const [filterError, setFilterError] = useState<string>("");

  const statusOptions = [
    { value: "", label: "- Semua status -" },
    { value: "lunas", label: "Lunas" },
    { value: "belum", label: "Belum Lunas" },
  ];

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setFilterError("");

    try {
      const endpoint = "/admin/laporan/piutang-hutang/data-piutang";

      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir;

      const response = await axios.get(endpoint, {
        params,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err: any) {
      console.error("Gagal memuat laporan piutang:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Terjadi kesalahan saat memuat laporan.",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tanggalAkhir]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const resetFilter = () => {
    setStatusFilter("");
    setTanggalAkhir("");
    setSearch("");
    setCurrentPage(1);
  };


  const exportParams = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (tanggalAkhir) params.append("tanggal_akhir", tanggalAkhir);
    return params.toString();
  };

  const cetakExcel = () => {
    const query = exportParams();
    window.open(`/admin/laporan/piutang-hutang/export-excel${query ? `?${query}` : ""}`, "_blank");
  };

  const cetakPdf = () => {
    const query = exportParams();
    window.open(`/admin/laporan/piutang-hutang/export-pdf${query ? `?${query}` : ""}`, "_blank");
  };

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();
    return (
      (item.customer ?? "").toLowerCase().includes(keyword) ||
      (item.status ?? "").toLowerCase().includes(keyword) ||
      String(item.tgl_piutang ?? "")
        .toLowerCase()
        .includes(keyword)
    );
  });

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const totalNominal = data.reduce(
    (sum, row) => sum + parseRupiah(row.nominal),
    0
  );
  const totalTerbayar = data.reduce(
    (sum, row) => sum + parseRupiah(row.terbayar),
    0
  );
  const totalSisa = Math.max(0, totalNominal - totalTerbayar);

  const colCount = 8;
  return (
    <AppLayout>
      <Head title="Laporan Piutang - Admin" />
      <PageBreadcrumb parent="Laporan" pageTitle="Laporan Piutang" />

      <div className="space-y-6">

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Nominal
            </p>
            <p className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90">
              Rp {formatRupiah(totalNominal, "0")}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Terbayar
            </p>
            <p className="mt-2 text-xl font-bold text-success-600 dark:text-success-400">
              Rp {formatRupiah(totalTerbayar, "0")}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Sisa
            </p>
            <p className="mt-2 text-xl font-bold text-red-600 dark:text-red-400">
              Rp {formatRupiah(totalSisa, "0")}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Laporan Piutang
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Pantau piutang beserta status pelunasannya.
              </p>
            </div>
          </div>

          <div className="border-b border-gray-200 p-5 sm:p-6 dark:border-gray-800">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="status"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Status
                </label>
                <Select
                  id="status"
                  options={statusOptions}
                  placeholder="- Semua status -"
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tanggal_akhir"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Sampai Tanggal
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
                placeholder="Cari customer, status..."
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
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                  <th className="px-6 py-4 text-right">Terbayar</th>
                  <th className="px-6 py-4 text-right">Sisa</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Tgl. Pelunasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={colCount}
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
                      colSpan={colCount}
                      className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      {search || statusFilter || tanggalAkhir
                        ? "Tidak ada data pada filter yang dipilih."
                        : "Belum ada data piutang."}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => {
                    const itemIndex = (currentPage - 1) * perPage + index + 1;
                    const lunas = (item.status ?? "") === "Lunas";
                    const tanggal = item.tgl_piutang ?? null;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/80 dark:hover:bg-white/3 transition-colors"
                      >
                        <td className="px-6 py-4 text-center font-medium text-gray-600 dark:text-gray-400">
                          {itemIndex}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {tanggal}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">
                          {item.customer ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-white/90">
                          <Rupiah value={item.nominal} />
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                          <Rupiah value={item.terbayar} />
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                          {item.sisa ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              lunas
                                ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                                : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            }`}
                          >
                            {item.status ?? "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {item.tgl_pelunasan}
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
