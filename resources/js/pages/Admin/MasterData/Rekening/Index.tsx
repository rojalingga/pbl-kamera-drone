import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { fieldErrorProps } from "@/components/form/FieldError";
import ModalFooter from "@/components/common/ModalFooter";
import TableFilterToolbar from "@/components/common/TableFilterToolbar";
import TablePagination from "@/components/common/TablePagination";
import Rupiah from "@/components/common/Rupiah";
import RupiahInput from "@/components/common/RupiahInput";
import { Permissions } from "@/types";
import { handleFormError } from "@/utils/form-error";
import { notifyError, notifySuccess } from "@/utils/toast";
import { formatInteger } from "@/utils/format";
import {
  PencilIcon,
  PlusIcon,
} from "@/icons";

interface RekeningItem {
  id: number;
  DT_RowIndex?: number;
  nama_rek: string | null;
  no_rek: string | null;
  pemilik_rek: string | null;
  saldo: string | number | null;
}

interface IndexProps {
  permissions: Permissions;
}

export default function RekeningIndex({ permissions }: IndexProps) {
  const [data, setData] = useState<RekeningItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Tambah Rekening");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [namaRekInput, setNamaRekInput] = useState<string>("");
  const [noRekInput, setNoRekInput] = useState<string>("");
  const [pemilikRekInput, setPemilikRekInput] = useState<string>("");
  const [saldoDisplay, setSaldoDisplay] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/master-data/rekening", {
        params: { datatable: 1 },
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data rekening:", err);
      notifyError("Gagal memuat data!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const keyword = search.toLowerCase();
  const filteredData = data.filter((item) =>
    (item.nama_rek ?? "").toLowerCase().includes(keyword) ||
    (item.no_rek ?? "").toLowerCase().includes(keyword) ||
    (item.pemilik_rek ?? "").toLowerCase().includes(keyword)
  );

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const handleOpenAddModal = () => {
    setPrimaryId(null);
    setNamaRekInput("");
    setNoRekInput("");
    setPemilikRekInput("");
    setSaldoDisplay("");
    setErrors({});
    setModalTitle("Form Tambah Rekening");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    setErrors({});
    setEditingId(id);

    try {
      const res = await axios.get(`/admin/master-data/rekening/${id}/edit`);
      if (res.data && res.data.data) {
        const row = res.data.data as RekeningItem;
        setNamaRekInput(row.nama_rek ?? "");
        setNoRekInput(row.no_rek ?? "");
        setPemilikRekInput(row.pemilik_rek ?? "");
        setSaldoDisplay(row.saldo != null && String(row.saldo) !== "" ? formatInteger(String(row.saldo).replace(/\D/g, "")) : "0");
        setPrimaryId(id);
        setModalTitle("Form Edit Rekening");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail rekening:", err);
      notifyError("Gagal mengambil data rekening!");
    } finally {
      setEditingId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPrimaryId(null);
    setNamaRekInput("");
    setNoRekInput("");
    setPemilikRekInput("");
    setSaldoDisplay("");
    setErrors({});
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const url = primaryId
      ? `/admin/master-data/rekening/${primaryId}`
      : "/admin/master-data/rekening";

    const payload: { nama_rek: string; no_rek: string; pemilik_rek: string; _method?: string } = {
      nama_rek: namaRekInput,
      no_rek: noRekInput,
      pemilik_rek: pemilikRekInput,
    };

    if (primaryId) {
      payload._method = "PUT";
    }

    try {
      const response = await axios.post(url, payload);

      if (response.data && response.data.status === "success") {
        handleCloseModal();
        notifySuccess(primaryId ? "Rekening berhasil diupdate!" : "Rekening berhasil ditambahkan!");
        fetchData();
      }
    } catch (err: unknown) {
      handleFormError(err, setErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showActionColumn = permissions?.edit === 1;

  return (
    <AppLayout>
      <Head title="Master Data Rekening - Admin" />
      <PageBreadcrumb parent="Master Data" pageTitle="Rekening" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Rekening
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola daftar rekening penampung transaksi.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Rekening</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari rekening..."
          setSearch={setSearch}
          setPerPage={setPerPage}
          setCurrentPage={setCurrentPage}
        />

        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Nama Rekening</th>
                <th className="px-6 py-4">No. Rekening</th>
                <th className="px-6 py-4">Pemilik</th>
                <th className="px-6 py-4 text-right">Saldo</th>
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
                      ? "Tidak ditemukan rekening yang sesuai pencarian."
                      : "Belum ada data rekening."}
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
                        {item.nama_rek ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.no_rek ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.pemilik_rek ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <Rupiah value={item.saldo} />
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions?.edit === 1 && (
                              <button
                                onClick={() => handleOpenEditModal(item.id)}
                                disabled={editingId === item.id}
                                title="Edit Rekening"
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
        className="max-w-lg"
      >

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
            {modalTitle}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="nama_rek">
                Nama Rekening <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nama_rek"
                name="nama_rek"
                type="text"
                placeholder="Contoh: Kas Kantor, QRIS Gopay, BCA..."
                value={namaRekInput}
                onChange={(e) => {
                  setNamaRekInput(e.target.value);
                  if (errors.nama_rek) {
                    setErrors((prev) => ({ ...prev, nama_rek: [] }));
                  }
                }}
                {...fieldErrorProps(errors, "nama_rek")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="no_rek">
                No. Rekening
              </Label>
              <Input
                id="no_rek"
                name="no_rek"
                type="text"
                placeholder="Contoh: 1234567890"
                value={noRekInput}
                onChange={(e) => {
                  setNoRekInput(e.target.value);
                  if (errors.no_rek) {
                    setErrors((prev) => ({ ...prev, no_rek: [] }));
                  }
                }}
                {...fieldErrorProps(errors, "no_rek")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pemilik_rek">
                Pemilik Rekening
              </Label>
              <Input
                id="pemilik_rek"
                name="pemilik_rek"
                type="text"
                placeholder="Contoh: Nama pemilik rekening"
                value={pemilikRekInput}
                onChange={(e) => {
                  setPemilikRekInput(e.target.value);
                  if (errors.pemilik_rek) {
                    setErrors((prev) => ({ ...prev, pemilik_rek: [] }));
                  }
                }}
                {...fieldErrorProps(errors, "pemilik_rek")}
              />
            </div>

            {primaryId !== null && (
              <div className="space-y-2">
                <Label htmlFor="saldo">
                  Saldo
                </Label>
                <RupiahInput
                  id="saldo"
                  value={saldoDisplay}
                  onChange={() => {}}
                  disabled
                />
              </div>
            )}

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
