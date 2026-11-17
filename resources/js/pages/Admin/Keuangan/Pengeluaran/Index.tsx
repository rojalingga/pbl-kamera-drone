import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import DatePicker from "@/components/form/date-picker";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import FieldError, { fieldErrorProps } from "@/components/form/FieldError";
import ModalFooter from "@/components/common/ModalFooter";
import TableFilterToolbar from "@/components/common/TableFilterToolbar";
import TablePagination from "@/components/common/TablePagination";
import RupiahInput from "@/components/common/RupiahInput";
import Rupiah from "@/components/common/Rupiah";
import { Permissions } from "@/types";
import { confirmDelete } from "@/utils/confirm";
import { handleFormError } from "@/utils/form-error";
import { formatInteger } from "@/utils/format";
import { notifyError, notifySuccess } from "@/utils/toast";
import {
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";

interface KategoriItem {
  id: number;
  kategori: string;
  jenis?: string;
}

interface PerawatanItem {
  id: number;
  no_kwitansi?: string | null;
  tgl_perawatan?: string | null;
}

interface RekeningItem {
  id: number;
  nama_rek: string;
  saldo?: string | number | null;
}

interface PengeluaranRow {
  id: number;
  DT_RowIndex?: number;
  tgl_pengeluaran: string | null;
  nominal: string | number | null;
  id_kategori_transaksi: number | null;
  id_rekening: number | null;
  lampiran: string | null;
  id_perawatan: number | null;
  kategori?: string;
  perawatan?: PerawatanItem | null;
}

interface IndexProps {
  permissions: Permissions;
  kategoris: KategoriItem[];
  perawatans: PerawatanItem[];
  rekenings: RekeningItem[];
}

export default function PengeluaranIndex({
  permissions,
  kategoris,
  perawatans,
  rekenings,
}: IndexProps) {
  const [data, setData] = useState<PengeluaranRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDetailMode, setIsDetailMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Tambah Pengeluaran");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [tglInput, setTglInput] = useState<string>("");
  const [nominalInput, setNominalInput] = useState<string>("");
  const [kategoriInput, setKategoriInput] = useState<string>("");
  const [rekeningInput, setRekeningInput] = useState<string>("");
  const [perawatanInput, setPerawatanInput] = useState<string>("");
  const [lampiranFile, setLampiranFile] = useState<File | null>(null);
  const [lampiranLama, setLampiranLama] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/keuangan/pengeluaran", {
        params: { datatable: 1 },
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data pengeluaran:", err);
      notifyError("Gagal memuat data!");

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();
    return (
      (item.tgl_pengeluaran ?? "").toLowerCase().includes(keyword) ||
      (item.kategori ?? "").toLowerCase().includes(keyword) ||
      String(item.nominal ?? "").includes(keyword)
    );
  });

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const resetForm = () => {
    setTglInput("");
    setNominalInput("");
    setKategoriInput("");
    setRekeningInput("");
    setPerawatanInput("");
    setLampiranFile(null);
    setLampiranLama(null);
    setErrors({});
    setIsSubmitting(false);
  };

  const handleOpenAddModal = () => {
    setPrimaryId(null);
    resetForm();
    setIsDetailMode(false);
    setModalTitle("Form Tambah Pengeluaran");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    resetForm();
    setIsDetailMode(false);
    setEditingId(id);

    try {
      const res = await axios.get(`/admin/keuangan/pengeluaran/${id}/edit`);
      if (res.data && res.data.data) {
        const row = res.data.data;
        setTglInput(row.tgl_pengeluaran ?? "");
        setNominalInput(row.nominal != null && String(row.nominal) !== "" ? formatInteger(row.nominal) : "");
        setKategoriInput(
          row.id_kategori_transaksi !== null
            ? String(row.id_kategori_transaksi)
            : ""
        );
        setPerawatanInput(
          row.id_perawatan !== null
            ? String(row.id_perawatan)
            : ""
        );
        setRekeningInput(row.id_rekening != null ? String(row.id_rekening) : "");
        setLampiranLama(row.lampiran ?? null);
        setPrimaryId(id);
        setModalTitle("Form Edit Pengeluaran");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail pengeluaran:", err);
      notifyError("Gagal mengambil data pengeluaran!");
    } finally {
      setEditingId(null);
    }
  };

  const handleOpenDetailModal = async (id: number) => {
    resetForm();
    setIsDetailMode(true);
    setEditingId(id);

    try {
      const res = await axios.get(`/admin/keuangan/pengeluaran/${id}/edit`);
      if (res.data && res.data.data) {
        const row = res.data.data;
        setTglInput(row.tgl_pengeluaran ?? "");
        setNominalInput(row.nominal != null && String(row.nominal) !== "" ? formatInteger(row.nominal) : "");
        setKategoriInput(
          row.id_kategori_transaksi !== null
            ? String(row.id_kategori_transaksi)
            : ""
        );
        setPerawatanInput(
          row.id_perawatan !== null
            ? String(row.id_perawatan)
            : ""
        );
        setRekeningInput(row.id_rekening != null ? String(row.id_rekening) : "");
        setLampiranLama(row.lampiran ?? null);
        setPrimaryId(id);
        setModalTitle("Detail Pengeluaran");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail pengeluaran:", err);
      notifyError("Gagal mengambil data pengeluaran!");
    } finally {
      setEditingId(null);
    }
  };

  const isAutoTransaksi = (item: PengeluaranRow) => {
    const kat = (item.kategori ?? "").toLowerCase();
    return kat === "perawatan" || kat === "pembelian unit";
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPrimaryId(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const url = primaryId
      ? `/admin/keuangan/pengeluaran/${primaryId}`
      : "/admin/keuangan/pengeluaran";

    const fd = new FormData();
    fd.append("tgl_pengeluaran", tglInput);
    fd.append("nominal", nominalInput.replace(/\D/g, ""));
    fd.append("id_kategori_transaksi", kategoriInput);
    if (rekeningInput) fd.append("id_rekening", rekeningInput);
    if (lampiranFile) fd.append("lampiran", lampiranFile);
    if (primaryId) fd.append("_method", "PUT");

    try {
      const response = await axios.post(url, fd);

      if (response.data && response.data.status === "success") {
        handleCloseModal();
        notifySuccess(primaryId ? "Pengeluaran berhasil diupdate!" : "Pengeluaran berhasil ditambahkan!");

        fetchData();
      }
    } catch (err: any) {
      handleFormError(err, setErrors, { includeMessage: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number, label: string) => {
    confirmDelete({
      message: `Pengeluaran "${label}" akan dihapus secara permanen!`,
      url: `/admin/keuangan/pengeluaran/${id}`,
      successText: "Pengeluaran telah dihapus.",
      onDeleted: fetchData,
    });
  };

  const kategoriOptions = (kategoris ?? []).map((row) => ({
    value: String(row.id),
    label: row.kategori,
  }));

  const rekeningOptions = (rekenings ?? []).map((row) => ({
    value: String(row.id),
    label: row.nama_rek,
  }));

  const perawatanOptions = (perawatans ?? []).map((row) => ({
    value: String(row.id),
    label: `#${row.id}${
      row.keterangan ? ` - ${row.keterangan.slice(0, 40)}` : ""
    }`,
  }));

  const showActionColumn = permissions?.edit === 1 || permissions?.hapus === 1;

  const perawatanLabel = (item: PengeluaranRow): string => {
    if (!item.id_perawatan) return "-";
    const ket = item.perawatan?.no_kwitansi;
    return ket ? `#${item.id_perawatan} - ${ket.slice(0, 30)}` : `#${item.id_perawatan}`;
  };
  return (
    <AppLayout>
      <Head title="Keuangan Pengeluaran - Admin" />
      <PageBreadcrumb parent="Keuangan" pageTitle="Pengeluaran" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Pengeluaran
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Catat seluruh pengeluaran operasional dan perawatan barang.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Pengeluaran</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari tanggal, kategori..."
          setSearch={setSearch}
          setPerPage={setPerPage}
          setCurrentPage={setCurrentPage}
        />

        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4">Perawatan</th>
                {showActionColumn && (
                  <th className="px-6 py-4 w-36 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={showActionColumn ? 6 : 5}
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
                    colSpan={showActionColumn ? 6 : 5}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {search
                      ? "Tidak ditemukan pengeluaran yang sesuai pencarian."
                      : "Belum ada data pengeluaran."}
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
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.tgl_pengeluaran}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">
                        {item.kategori ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-white/90">
                        <Rupiah value={item.nominal} />
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {perawatanLabel(item)}
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isAutoTransaksi(item) ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(item.id)}
                                disabled={editingId === item.id}
                                title="Detail Pengeluaran"
                                className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-wait transition-colors"
                              >
                                {editingId === item.id ? (
                                  <div className="size-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                                ) : (
                                  <EyeIcon className="size-4" />
                                )}
                              </button>
                            ) : (
                              <>
                                {permissions?.edit === 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(item.id)}
                                    disabled={editingId === item.id}
                                    title="Edit Pengeluaran"
                                    className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 disabled:opacity-50 disabled:cursor-wait transition-colors"
                                  >
                                    {editingId === item.id ? (
                                      <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
                                    ) : (
                                      <PencilIcon className="size-4" />
                                    )}
                                  </button>
                                )}
                                {permissions?.hapus === 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDelete(
                                        item.id,
                                        `${item.tgl_pengeluaran} - ${
                                          item.kategori ?? "-"
                                        }`
                                      )
                                    }
                                    title="Hapus Pengeluaran"
                                    className="flex size-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                                  >
                                    <TrashBinIcon className="size-4" />
                                  </button>
                                )}
                              </>
                            )}
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
        className="max-w-2xl"
      >

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
            {modalTitle}
          </h3>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 custom-scrollbar">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tgl_pengeluaran">
                  Tanggal Pengeluaran <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  id="tgl_pengeluaran"
                  placeholder="Pilih tanggal"
                  disabled={isDetailMode}
                  defaultDate={tglInput || undefined}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTglInput(dateStr);
                    if (errors.tgl_pengeluaran) {
                      setErrors((prev) => ({ ...prev, tgl_pengeluaran: [] }));
                    }
                  }}
                />
                <FieldError error={errors.tgl_pengeluaran} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nominal">
                  Nominal <span className="text-red-500">*</span>
                </Label>
                <RupiahInput
                  id="nominal"
                  value={nominalInput}
                  disabled={isDetailMode}
                  placeholder="Contoh: 250.000"
                  onChange={(v) => {
                    setNominalInput(v);
if (errors.nominal) {
                    setErrors((prev) => ({ ...prev, nominal: [] }));
                  }
                  }}
                  {...fieldErrorProps(errors, "nominal")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_kategori_transaksi">
                  Kategori Transaksi <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="id_kategori_transaksi"
                  options={kategoriOptions}
                  placeholder="- Pilih Kategori -"
                  disabled={isDetailMode}
                  value={kategoriInput}
                  onChange={(val) => {
                    setKategoriInput(val);
                    if (errors.id_kategori_transaksi) {
                      setErrors((prev) => ({
                        ...prev,
                        id_kategori_transaksi: [],
                      }));
                    }
                  }}
                  {...fieldErrorProps(errors, "id_kategori_transaksi")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_rekening">
                  Rekening <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="id_rekening"
                  options={rekeningOptions}
                  placeholder="- Pilih Rekening -"
                  disabled={isDetailMode}
                  value={rekeningInput}
                  onChange={(val) => {
                    setRekeningInput(val);
                    if (errors.id_rekening) {
                      setErrors((prev) => ({ ...prev, id_rekening: [] }));
                    }
                  }}
                  {...fieldErrorProps(errors, "id_rekening")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lampiran">Lampiran (Opsional)</Label>
              {lampiranLama && !lampiranFile && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Lampiran saat ini:{" "}
                  <a
                    href={`/assets/lampiran/${lampiranLama}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-500 underline"
                  >
                    {lampiranLama}
                  </a>
                </p>
              )}
              {!isDetailMode && (
                <input
                  id="lampiran"
                  name="lampiran"
                  type="file"
                  accept=".jpeg,.jpg,.png,.pdf"
                  onChange={(e) => setLampiranFile(e.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              )}
              {!isDetailMode && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format: JPG, PNG, atau PDF.
                </p>
              )}
              {!isDetailMode && <FieldError error={errors.lampiran} />}
            </div>
          </div>

          {isDetailMode ? (
            <div className="flex items-center justify-end border-t border-gray-200 px-6 py-4 sm:px-8 dark:border-gray-800">
              <button
                type="button"
                onClick={handleCloseModal}
                className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Keluar
              </button>
            </div>
          ) : (
            <ModalFooter
              onCancel={handleCloseModal}
              isSubmitting={isSubmitting}
            />
          )}
        </form>
      </Modal>
    </AppLayout>
  );
}
