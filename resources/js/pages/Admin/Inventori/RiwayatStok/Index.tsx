import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import TableFilterToolbar from "@/components/common/TableFilterToolbar";
import TablePagination from "@/components/common/TablePagination";
import { Permissions } from "@/types";
import { formatInteger } from "@/utils/format";
import { notifyError } from "@/utils/toast";
import {
  EyeIcon,
} from "@/icons";

interface BarangItem {
  id: number;
  DT_RowIndex?: number;
  nama_barang: string;
  merk?: string;
  kategori?: string;
  stok: number;
  harga_sewa: string | number;
}

interface RiwayatItem {
  id: number;
  tanggal: string | null;
  jenis: string | null;
  sumber: string | null;
  jumlah: number | null;
  stok: number | null;
}

interface IndexProps {
  permissions: Permissions;
}

export default function RiwayatStokIndex({ permissions }: IndexProps) {
  const [data, setData] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBarang, setSelectedBarang] = useState<BarangItem | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [riwayatLoading, setRiwayatLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/inventori/riwayat-stok", {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data barang:", err);
      notifyError("Gagal memuat data!");

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter((item) =>
    [item.nama_barang, item.kategori ?? ""].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const handleOpenRiwayat = async (item: BarangItem) => {
    setSelectedBarang(item);
    setRiwayat([]);
    setRiwayatLoading(true);
    setIsModalOpen(true);

    try {
      const response = await axios.get("/admin/inventori/riwayat-stok/data", {
        params: { id_barang: item.id },
      });

      if (response.data && response.data.data) {
        setRiwayat(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat riwayat stok:", err);
      notifyError("Gagal memuat riwayat stok!");

      setIsModalOpen(false);
    } finally {
      setRiwayatLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBarang(null);
    setRiwayat([]);
  };

  const showActionColumn = permissions?.lihat === 1;
  return (
    <AppLayout>
      <Head title="Riwayat Stok - Admin" />
      <PageBreadcrumb parent="Inventori" pageTitle="Riwayat Stok" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Barang
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Daftar seluruh barang beserta stok terkini. Klik aksi untuk
              melihat riwayat mutasi stok barang tersebut.
            </p>
          </div>
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari nama barang atau kategori..."
          setSearch={setSearch}
          setPerPage={setPerPage}
          setCurrentPage={setCurrentPage}
        />

        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Nama Barang</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Stok</th>
                {showActionColumn && (
                  <th className="px-6 py-4 w-32 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={showActionColumn ? 5 : 4}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-7 animate-spin rounded-full border-3 border-brand-500 border-t-transparent"></div>
                      <span className="text-xs">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={showActionColumn ? 5 : 4}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {search
                      ? "Tidak ditemukan barang yang sesuai pencarian."
                      : "Belum ada data barang."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const itemIndex = (currentPage - 1) * perPage + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/3 transition-colors"
                    >
                      <td className="px-6 py-4 text-center font-medium text-gray-600 dark:text-gray-400">
                        {itemIndex}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">
                        {item.nama_barang}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.kategori ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            Number(item.stok) > 0
                                ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                                : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
                          }`}
                        >
                          {formatInteger(item.stok)} unit
                        </span>
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleOpenRiwayat(item)}
                              title="Lihat Riwayat Stok"
                              className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors"
                            >
                              <EyeIcon className="size-4 fill-current" />
                            </button>
                          </div>
                        </td>
                      )}
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

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        className="max-w-4xl"
      >

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
              Riwayat Stok
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedBarang?.nama_barang ?? "-"}
              {selectedBarang ? ` - stok ${formatInteger(selectedBarang.stok)} unit` : ""}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 w-16 text-center">No</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Jenis / Sumber</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3 text-center">Sisa Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
                {riwayatLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="size-7 animate-spin rounded-full border-3 border-brand-500 border-t-transparent"></div>
                        <span className="text-xs">Memuat riwayat...</span>
                      </div>
                    </td>
                  </tr>
                ) : riwayat.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      Belum ada riwayat stok untuk barang ini.
                    </td>
                  </tr>
                ) : (
                  riwayat.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {item.tanggal ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.jenis === "Masuk"
                                ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                                : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
                            }`}
                          >
                            {item.jenis ?? "-"}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.sumber ?? "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        {item.jenis === "Keluar" ? "-" : "+"}
                        {formatInteger(item.jumlah ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-white/90">
                        {formatInteger(item.stok ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 sm:px-8 dark:border-gray-800">
          <button
            type="button"
            onClick={handleCloseModal}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}
