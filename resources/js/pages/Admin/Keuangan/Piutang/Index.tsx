import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import DatePicker from "@/components/form/date-picker";
import Input from "@/components/form/input/InputField";
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
import { formatInteger, parseRupiah } from "@/utils/format";
import { notifyError, notifySuccess } from "@/utils/toast";
import {
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";

interface PiutangRow {
  id: number;
  DT_RowIndex?: number;
  tgl_piutang: string | null;
  nominal: string | number | null;
  id_pengembalian: number | null;
  terbayar: string | number | null;
  tgl_pelunasan: string | null;
  sisa?: string;
}

interface IndexProps {
  permissions: Permissions;
}

export default function PiutangIndex({ permissions }: IndexProps) {
  const [data, setData] = useState<PiutangRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Tambah Piutang");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [tglInput, setTglInput] = useState<string>("");
  const [nominalInput, setNominalInput] = useState<string>("");
  const [terbayarInput, setTerbayarInput] = useState<string>("");
  const [tglPelunasanInput, setTglPelunasanInput] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/keuangan/piutang", {
        params: { datatable: 1 },
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data piutang:", err);
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
      (item.tgl_piutang ?? "").toLowerCase().includes(keyword) ||
      (item.tgl_pelunasan ?? "").toLowerCase().includes(keyword) ||
      String(item.nominal ?? "").includes(keyword) ||
      String(item.terbayar ?? "").includes(keyword)
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
    setTerbayarInput("");
    setTglPelunasanInput("");
    setErrors({});
    setIsSubmitting(false);
  };

  const handleOpenAddModal = () => {
    setPrimaryId(null);
    resetForm();
    setModalTitle("Form Tambah Piutang");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    resetForm();
    setEditingId(id);

    try {
      const res = await axios.get(`/admin/keuangan/piutang/${id}/edit`);
      if (res.data && res.data.data) {
        const row = res.data.data;
        setTglInput(row.tgl_piutang ?? "");
        setNominalInput(row.nominal != null && String(row.nominal) !== "" ? formatInteger(row.nominal) : "");
        setTerbayarInput(row.terbayar != null && String(row.terbayar) !== "" ? formatInteger(row.terbayar) : "");
        setTglPelunasanInput(row.tgl_pelunasan ?? "");
        setPrimaryId(id);
        setModalTitle("Form Edit Piutang");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail piutang:", err);
      notifyError("Gagal mengambil data piutang!");
    } finally {
      setEditingId(null);
    }
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
      ? `/admin/keuangan/piutang/${primaryId}`
      : "/admin/keuangan/piutang";

    const payload: Record<string, string> = {
      tgl_piutang: tglInput,
      nominal: nominalInput.replace(/\D/g, ""),
    };
    if (terbayarInput) payload.terbayar = terbayarInput.replace(/\D/g, "");
    if (tglPelunasanInput) payload.tgl_pelunasan = tglPelunasanInput;
    if (primaryId) payload._method = "PUT";

    try {
      const response = await axios.post(url, payload);

      if (response.data && response.data.status === "success") {
        handleCloseModal();
        notifySuccess(primaryId ? "Piutang berhasil diupdate!" : "Piutang berhasil ditambahkan!");

        fetchData();
      }
    } catch (err: any) {
      handleFormError(err, setErrors, { businessError: true, includeMessage: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number, label: string) => {
    confirmDelete({
      message: `Piutang "${label}" akan dihapus secara permanen!`,
      url: `/admin/keuangan/piutang/${id}`,
      successText: "Piutang telah dihapus.",
      onDeleted: fetchData,
    });
  };

  const isLunas = (item: PiutangRow): boolean =>
    parseRupiah(item.terbayar) >= parseRupiah(item.nominal);

  const showActionColumn = permissions?.edit === 1;
  return (
    <AppLayout>
      <Head title="Keuangan Piutang - Admin" />
      <PageBreadcrumb parent="Keuangan" pageTitle="Piutang" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Piutang
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pantau piutang pelanggan beserta status pelunasannya.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Piutang</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari tanggal, nominal..."
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
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4 text-right">Terbayar</th>
                <th className="px-6 py-4 text-right">Sisa</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Tgl. Pelunasan</th>
                {showActionColumn && (
                  <th className="px-6 py-4 w-36 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={showActionColumn ? 8 : 7}
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
                    colSpan={showActionColumn ? 8 : 7}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {search
                      ? "Tidak ditemukan piutang yang sesuai pencarian."
                      : "Belum ada data piutang."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const itemIndex = (currentPage - 1) * perPage + index + 1;
                  const lunas = isLunas(item);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/3 transition-colors"
                    >
                      <td className="px-6 py-4 text-center font-medium text-gray-600 dark:text-gray-400">
                        {itemIndex}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.tgl_piutang}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-white/90">
                        <Rupiah value={item.nominal} />
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                        <Rupiah value={item.terbayar} />
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                        <Rupiah value={item.sisa} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            lunas
                              ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {lunas ? "Lunas" : "Belum Lunas"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.tgl_pelunasan}
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions?.edit === 1 && (
                              <button
                                onClick={() => handleOpenEditModal(item.id)}
                                disabled={editingId === item.id}
                                title="Edit Piutang"
                                className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 disabled:opacity-50 disabled:cursor-wait transition-colors"
                              >
                                {editingId === item.id ? (
                                  <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
                                ) : (
                                  <PencilIcon className="size-4" />
                                )}
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
                <Label htmlFor="tgl_piutang">
                  Tanggal Piutang <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  id="tgl_piutang"
                  placeholder="Pilih tanggal"
                  defaultDate={tglInput || undefined}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTglInput(dateStr);
                    if (errors.tgl_piutang) {
                      setErrors((prev) => ({ ...prev, tgl_piutang: [] }));
                    }
                  }}
                />
                <FieldError error={errors.tgl_piutang} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nominal">
                  Nominal <span className="text-red-500">*</span>
                </Label>
                <RupiahInput
                  id="nominal"
                  value={nominalInput}
                  placeholder="Contoh: 500.000"
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
                <Label htmlFor="terbayar">Terbayar (Opsional)</Label>
                <RupiahInput
                  id="terbayar"
                  value={terbayarInput}
                  placeholder="Contoh: 250.000"
                  onChange={(v) => {
                    setTerbayarInput(v);
if (errors.terbayar) {
                    setErrors((prev) => ({ ...prev, terbayar: [] }));
                  }
                  }}
                  {...fieldErrorProps(errors, "terbayar")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tgl_pelunasan">
                  Tanggal Pelunasan (Opsional)
                </Label>
                <DatePicker
                  id="tgl_pelunasan"
                  placeholder="Pilih tanggal"
                  defaultDate={tglPelunasanInput || undefined}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTglPelunasanInput(dateStr);
                    if (errors.tgl_pelunasan) {
                      setErrors((prev) => ({ ...prev, tgl_pelunasan: [] }));
                    }
                  }}
                />
                <FieldError error={errors.tgl_pelunasan} />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Status "Lunas" dihitung otomatis ketika{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                Terbayar
              </span>{" "}
              lebih besar atau sama dengan{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                Nominal
              </span>
              .
            </p>
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
