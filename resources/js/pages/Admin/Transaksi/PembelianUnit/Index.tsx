import React, { useState, useEffect, useCallback } from "react";
import { Head, usePage } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import DatePicker from "@/components/form/date-picker";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import FieldError from "@/components/form/FieldError";
import ModalFooter from "@/components/common/ModalFooter";
import TableFilterToolbar from "@/components/common/TableFilterToolbar";
import TablePagination from "@/components/common/TablePagination";
import Rupiah from "@/components/common/Rupiah";
import RupiahInput from "@/components/common/RupiahInput";
import { Permissions, PageProps } from "@/types";
import { confirmDelete } from "@/utils/confirm";
import { handleFormError } from "@/utils/form-error";
import { formatInteger, formatRupiah, parseRupiah } from "@/utils/format";
import { notifyError, notifySuccess } from "@/utils/toast";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";

interface BarangOption {
  id: number;
  nama_barang: string;
  stok?: number | null;
}

interface RekeningOption {
  id: number;
  nama_rek: string;
  saldo?: string | number | null;
}

interface PembelianRow {
  id: number;
  DT_RowIndex?: number;
  tanggal: string | null;
  keterangan?: string | null;
  jumlah_item?: number;
  total_unit?: number;
  total_biaya?: string | number | null;
  barang_list?: string;
  rekening?: string;
  is_owner_acc?: number;
  alasan_penolakan?: string;
}

interface DetailRow {
  key: number;
  id_barang: string;
  harga_beli: string;
  jumlah: string;
}

interface IndexProps {
  permissions: Permissions;
  barangs: BarangOption[];
  rekenings: RekeningOption[];
}

const barisKosong = (key: number): DetailRow => ({
  key,
  id_barang: "",
  harga_beli: "",
  jumlah: "1",
});

export default function PembelianUnitIndex({
  permissions,
  barangs,
  rekenings,
}: IndexProps) {
  const { auth } = usePage<PageProps>().props;
  const isOwner = auth?.user?.role === "Owner";

  const [data, setData] = useState<PembelianRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Tambah Pembelian Unit");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [tanggalInput, setTanggalInput] = useState<string>("");
  const [keteranganInput, setKeteranganInput] = useState<string>("");
  const [rekeningInput, setRekeningInput] = useState<string>("");
  const [lampiranFile, setLampiranFile] = useState<File | null>(null);
  const [lampiranLama, setLampiranLama] = useState<string | null>(null);
  const [isOwnerAccInput, setIsOwnerAccInput] = useState<string>("1");
  const [alasanPenolakanInput, setAlasanPenolakanInput] = useState<string>("");
  const [details, setDetails] = useState<DetailRow[]>([barisKosong(1)]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const barangOptions = (barangs ?? []).map((b) => ({
    value: String(b.id),
    label: b.stok != null ? `${b.nama_barang} (Stok: ${b.stok})` : b.nama_barang,
  }));

  const rekeningOptions = (rekenings ?? []).map((r) => ({
    value: String(r.id),
    label: r.nama_rek,
  }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/transaksi/pembelian-unit", {
        params: { datatable: 1 },
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data pembelian unit:", err);
      notifyError("Gagal memuat data pembelian unit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.tanggal ?? "").toLowerCase().includes(q) ||
      (item.keterangan ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const resetForm = () => {
    setTanggalInput("");
    setKeteranganInput("");
    setRekeningInput("");
    setLampiranFile(null);
    setLampiranLama(null);
    setIsOwnerAccInput("1");
    setAlasanPenolakanInput("");
    setDetails([barisKosong(1)]);
    setErrors({});
    setIsSubmitting(false);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setPrimaryId(null);
    setTanggalInput(new Date().toISOString().slice(0, 10));
    setModalTitle("Form Tambah Pembelian Unit");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    resetForm();
    setEditingId(id);

    try {
      const response = await axios.get(
        `/admin/transaksi/pembelian-unit/${id}/edit`
      );
      if (response.data && response.data.data) {
        const item = response.data.data;
        setTanggalInput(item.tanggal ?? "");
        setKeteranganInput(item.keterangan ?? "");
        setRekeningInput(
          item.id_rekening != null ? String(item.id_rekening) : ""
        );
        setLampiranLama(item.lampiran ?? null);
        setIsOwnerAccInput(String(item.is_owner_acc ?? 1));
        setAlasanPenolakanInput(item.alasan_penolakan ?? "");
        const rows: DetailRow[] =
          item.details && item.details.length > 0
            ? item.details.map((row: any, idx: number) => ({
                key: idx + 1,
                id_barang: String(row.id_barang ?? ""),
                harga_beli:
                  row.harga_beli != null && String(row.harga_beli) !== ""
                    ? formatInteger(row.harga_beli)
                    : "",
                jumlah: String(row.jumlah ?? "1"),
              }))
            : [barisKosong(1)];
        setDetails(rows);
        setPrimaryId(id);
        setModalTitle("Form Edit Pembelian Unit");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail pembelian unit:", err);
      notifyError("Gagal mengambil data pembelian unit!");
    } finally {
      setEditingId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPrimaryId(null);
    resetForm();
  };

  const handleAddRow = () => {
    setDetails((prev) => [
      ...prev,
      barisKosong(Math.max(0, ...prev.map((r) => r.key)) + 1),
    ]);
  };

  const handleRemoveRow = (key: number) => {
    const index = details.findIndex((row) => row.key === key);
    if (index >= 0) {
      setErrors((prev) => {
        const next: Record<string, string[]> = {};
        Object.keys(prev).forEach((errorKey) => {
          if (!errorKey.startsWith(`details.${index}.`)) {
            next[errorKey] = prev[errorKey];
          }
        });
        return next;
      });
    }
    setDetails((prev) =>
      prev.length > 1 ? prev.filter((r) => r.key !== key) : prev
    );
  };

  const handleRowChange = (
    key: number,
    field: keyof DetailRow,
    value: string
  ) => {
    setDetails((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );

    const index = details.findIndex((row) => row.key === key);
    const errorKey = `details.${index}.${field}`;
    if (index >= 0 && errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: [] }));
    }
  };

  const rowError = (index: number, field: string): string => {
    const key = `details.${index}.${field}`;
    return errors[key] && errors[key].length > 0 ? errors[key][0] : "";
  };

  const totalBiaya = details.reduce((sum, row) => {
    const harga = parseRupiah(row.harga_beli || 0);
    const qty = Number(row.jumlah || 0);
    return sum + (Number.isNaN(harga) || Number.isNaN(qty) ? 0 : harga * qty);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const url = primaryId
      ? `/admin/transaksi/pembelian-unit/${primaryId}`
      : "/admin/transaksi/pembelian-unit";

    const fd = new FormData();
    fd.append("tanggal", tanggalInput);
    fd.append("keterangan", keteranganInput);
    fd.append("id_rekening", rekeningInput);
    fd.append("is_owner_acc", isOwnerAccInput);
    fd.append("alasan_penolakan", alasanPenolakanInput);
    if (lampiranFile) fd.append("lampiran", lampiranFile);

    details.forEach((row, index) => {
      fd.append(`details[${index}][id_barang]`, row.id_barang);
      fd.append(`details[${index}][harga_beli]`, row.harga_beli.replace(/\D/g, ""));
      fd.append(`details[${index}][jumlah]`, row.jumlah);
    });

    if (primaryId) fd.append("_method", "PUT");

    try {
      const response = await axios.post(url, fd);

      if (response.data && response.data.status === "success") {
        handleCloseModal();
        notifySuccess(
          primaryId
            ? "Pembelian unit berhasil diupdate!"
            : "Pembelian unit berhasil ditambahkan!"
        );
        fetchData();
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 422 && data?.error && !data?.errors) {
        notifyError(String(data.error));
        setErrors({});
      } else {
        handleFormError(err, setErrors, { businessError: true, includeMessage: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number, label: string) => {
    confirmDelete({
      message: `Pembelian unit "${label}" akan dihapus secara permanen! Stok barang akan dikembalikan dan pengeluaran terkait ikut dihapus.`,
      url: `/admin/transaksi/pembelian-unit/${id}`,
      successText: "Pembelian unit telah dihapus.",
      onDeleted: fetchData,
    });
  };

  const showActionColumn = permissions?.edit === 1 || permissions?.hapus === 1;

  return (
    <AppLayout>
      <Head title="Transaksi Pembelian Unit - Admin" />
      <PageBreadcrumb parent="Transaksi" pageTitle="Pembelian Unit" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Pembelian Unit
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola pembelian unit barang baru beserta pengeluaran dan lampirannya.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Pembelian</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari tanggal, keterangan..."
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
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-center">Status Owner</th>
                <th className="px-6 py-4 text-center">Total Unit</th>
                <th className="px-6 py-4 text-right">Total Biaya</th>
                {showActionColumn && (
                  <th className="px-6 py-4 w-36 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={showActionColumn ? 7 : 6}
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
                    colSpan={showActionColumn ? 7 : 6}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    {search
                      ? "Tidak ada data yang cocok dengan pencarian."
                      : "Belum ada data pembelian unit."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => {
                  const rowNumber = (currentPage - 1) * perPage + index + 1;
                  const statusOwner = Number(row.is_owner_acc ?? 0);
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        {rowNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                        {row.tanggal ?? "-"}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-white/90">
                        <div>{row.keterangan ?? "-"}</div>
                        {statusOwner === 3 && row.alasan_penolakan && (
                          <div className="text-xs text-red-500 mt-0.5">
                            Alasan: {row.alasan_penolakan}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {statusOwner === 2 ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-400">
                            Disetujui
                          </span>
                        ) : statusOwner === 3 ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-400">
                            Ditolak
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                        {row.total_unit ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-800 dark:text-white/90">
                        <Rupiah value={row.total_biaya} />
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions?.edit === 1 && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(row.id)}
                                disabled={editingId === row.id}
                                title="Edit"
                                className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
                              >
                                {editingId === row.id ? (
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
                                    row.id,
                                    `${row.tanggal ?? ""} (#${row.id})`
                                  )
                                }
                                title="Hapus"
                                className="flex size-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                              >
                                <TrashBinIcon className="size-4" />
                              </button>
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
        className="max-w-4xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
            {modalTitle}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col gap-6 p-6 sm:p-8 max-h-[calc(85vh-130px)] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="tanggal">
                  Tanggal Pembelian <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  id="tanggal"
                  placeholder="Pilih tanggal pembelian"
                  defaultDate={tanggalInput || undefined}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTanggalInput(dateStr);
                    if (errors.tanggal) {
                      setErrors((prev) => ({ ...prev, tanggal: [] }));
                    }
                  }}
                />
                <FieldError error={errors.tanggal} />
              </div>

              <div>
                <Label htmlFor="id_rekening">
                  Rekening <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="id_rekening"
                  options={rekeningOptions}
                  placeholder="- Pilih rekening -"
                  value={rekeningInput}
                  onChange={(val) => {
                    setRekeningInput(val);
                    if (errors.id_rekening) {
                      setErrors((prev) => ({ ...prev, id_rekening: [] }));
                    }
                  }}
                  error={Boolean(errors.id_rekening)}
                />
                <FieldError error={errors.id_rekening} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <TextArea
                  placeholder="Contoh: Pembelian 2 unit kamera baru"
                  rows={2}
                  value={keteranganInput}
                  onChange={(val) => {
                    setKeteranganInput(val);
                    if (errors.keterangan) {
                      setErrors((prev) => ({ ...prev, keterangan: [] }));
                    }
                  }}
                  error={Boolean(errors.keterangan)}
                  hint={errors.keterangan?.[0] ?? ""}
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="lampiran">Lampiran (Opsional)</Label>
                {lampiranLama && !lampiranFile && (
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    Lampiran saat ini:{" "}
                    <a
                      href={lampiranLama.startsWith("http") ? lampiranLama : `/assets/lampiran/${lampiranLama}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-500 underline"
                    >
                      {lampiranLama}
                    </a>
                  </p>
                )}
                <Input
                  id="lampiran"
                  name="lampiran"
                  type="file"
                  accept=".jpeg,.jpg,.png,.pdf"
                  onChange={(e) =>
                    setLampiranFile(e.target.files?.[0] ?? null)
                  }
                  error={Boolean(errors.lampiran)}
                  hint={errors.lampiran?.[0] ?? "Format: JPG, PNG, atau PDF."}
                />
              </div>

            </div>

            {isOwner && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Persetujuan Owner
                </h4>
                <div className="mt-4">
                  <Label htmlFor="is_owner_acc">Status Persetujuan</Label>
                  <Select
                    id="is_owner_acc"
                    options={[
                      { value: "1", label: "Pending" },
                      { value: "2", label: "Disetujui" },
                      { value: "3", label: "Ditolak" },
                    ]}
                    value={isOwnerAccInput}
                    onChange={(val) => {
                      setIsOwnerAccInput(val);
                      if (errors.is_owner_acc) {
                        setErrors((prev) => ({ ...prev, is_owner_acc: [] }));
                      }
                    }}
                    error={Boolean(errors.is_owner_acc)}
                  />
                  <FieldError error={errors.is_owner_acc} />
                </div>

                {isOwnerAccInput === "3" && (
                  <div className="mt-4">
                    <Label htmlFor="alasan_penolakan">Alasan Penolakan</Label>
                    <TextArea
                      placeholder="Masukkan alasan penolakan"
                      rows={2}
                      value={alasanPenolakanInput}
                      onChange={(val) => {
                        setAlasanPenolakanInput(val);
                        if (errors.alasan_penolakan) {
                          setErrors((prev) => ({ ...prev, alasan_penolakan: [] }));
                        }
                      }}
                      error={Boolean(errors.alasan_penolakan)}
                      hint={errors.alasan_penolakan?.[0] ?? ""}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Daftar Barang Dibeli
                </h4>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                >
                  <PlusIcon className="size-3.5" />
                  Tambah Barang
                </button>
              </div>

              <FieldError error={errors.details} className="mt-2" />

              <div className="mt-4 space-y-3">
                {details.map((row, index) => {
                  const subtotal =
                    parseRupiah(row.harga_beli || 0) * Number(row.jumlah || 0);

                  return (
                    <div
                      key={row.key}
                      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="grid items-start gap-4 sm:grid-cols-12">
                        <div className="sm:col-span-5">
                          <Label>Barang</Label>
                          <Select
                            id={`item-barang-${row.key}`}
                            options={barangOptions}
                            placeholder="- Pilih barang -"
                            value={row.id_barang}
                            onChange={(val) =>
                              handleRowChange(row.key, "id_barang", val)
                            }
                          />
                          <FieldError error={rowError(index, "id_barang")} />
                        </div>

                        <div className="sm:col-span-3">
                          <Label>Harga Beli</Label>
                          <RupiahInput
                            id={`item-harga-${row.key}`}
                            placeholder="0"
                            value={row.harga_beli}
                            onChange={(v) =>
                              handleRowChange(row.key, "harga_beli", v)
                            }
                            error={rowError(index, "harga_beli") !== ""}
                          />
                          <FieldError error={rowError(index, "harga_beli")} />
                        </div>

                        <div className="sm:col-span-2">
                          <Label>Jumlah</Label>
                          <Input
                            id={`item-jumlah-${row.key}`}
                            type="number"
                            min={1}
                            placeholder="1"
                            value={row.jumlah}
                            onChange={(e) =>
                              handleRowChange(row.key, "jumlah", e.target.value)
                            }
                          />
                          <FieldError error={rowError(index, "jumlah")} />
                        </div>

                        <div className="sm:col-span-2 flex justify-end pt-[26px]">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.key)}
                            disabled={details.length === 1}
                            title="Hapus baris"
                            className="flex size-10 items-center justify-center rounded-lg bg-error-50 text-error-600 transition-colors hover:bg-error-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-right text-xs font-semibold text-gray-800 dark:text-white/90">
                        Subtotal: Rp {formatRupiah(Number.isNaN(subtotal) ? 0 : subtotal)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Total biaya otomatis masuk ke Pengeluaran dari rekening terpilih.
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-white/90">
                  Rp {formatRupiah(totalBiaya)}
                </span>
              </div>
            </div>
          </div>

          <ModalFooter
            onCancel={handleCloseModal}
            isSubmitting={isSubmitting}
          />
        </form>
      </Modal>
    </AppLayout>
  );
}