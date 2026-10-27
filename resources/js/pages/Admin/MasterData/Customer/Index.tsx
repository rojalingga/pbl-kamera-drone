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
import { Permissions } from "@/types";
import { confirmDelete } from "@/utils/confirm";
import { handleFormError } from "@/utils/form-error";
import { notifyError, notifySuccess } from "@/utils/toast";
import {
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";

interface CustomerItem {
  id: number;
  DT_RowIndex?: number;
  nama_lengkap: string;
  no_hp: string | null;
  created_at?: string;
}

interface IndexProps {
  permissions: Permissions;
}

export default function CustomerIndex({ permissions }: IndexProps) {
  const [data, setData] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Tambah Customer");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [namaLengkapInput, setNamaLengkapInput] = useState<string>("");
  const [noHpInput, setNoHpInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/master-data/customer", {
        params: { datatable: 1 },
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data customer:", err);
      notifyError("Gagal memuat data!");

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter(
    (item) =>
      (item.nama_lengkap || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.no_hp || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const handleOpenAddModal = () => {
    setPrimaryId(null);
    setNamaLengkapInput("");
    setNoHpInput("");
    setPasswordInput("");
    setErrors({});
    setModalTitle("Form Tambah Customer");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    setErrors({});
    setEditingId(id);

    try {
      const res = await axios.get(`/admin/master-data/customer/${id}/edit`);
      if (res.data && res.data.data) {
        setNamaLengkapInput(res.data.data.nama_lengkap || "");
        setNoHpInput(res.data.data.no_hp || "");
        setPasswordInput("");
        setPrimaryId(id);
        setModalTitle("Form Edit Customer");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail customer:", err);
      notifyError("Gagal mengambil data customer!");
    } finally {
      setEditingId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPrimaryId(null);
    setNamaLengkapInput("");
    setNoHpInput("");
    setPasswordInput("");
    setErrors({});
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const url = primaryId
      ? `/admin/master-data/customer/${primaryId}`
      : "/admin/master-data/customer";

    const payload: {
      nama_lengkap: string;
      no_hp: string;
      password?: string;
      _method?: string;
    } = {
      nama_lengkap: namaLengkapInput,
      no_hp: noHpInput,
      ...(passwordInput ? { password: passwordInput } : {}),
    };

    if (primaryId) {
      payload._method = "PUT";
    }

    try {
      const response = await axios.post(url, payload);

      if (response.data && response.data.status === "success") {
        handleCloseModal();
        notifySuccess(primaryId ? "Customer berhasil diupdate!" : "Customer berhasil ditambahkan!");

        fetchData();
      }
    } catch (err: any) {
      handleFormError(err, setErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number, customerName: string) => {
    confirmDelete({
      message: `Customer "${customerName}" akan dihapus secara permanen!`,
      url: `/admin/master-data/customer/${id}`,
      successText: "Customer telah dihapus.",
      onDeleted: fetchData,
    });
  };

  const showActionColumn = permissions?.edit === 1 || permissions?.hapus === 1;

  return (
    <AppLayout>
      <Head title="Master Data Customer - Admin" />
      <PageBreadcrumb parent="Master Data" pageTitle="Customer" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Customer
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola daftar customer yang menyewa kamera, drone, dan aksesoris.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Customer</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari customer..."
          setSearch={setSearch}
          setPerPage={setPerPage}
          setCurrentPage={setCurrentPage}
        />

        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">No HP</th>
                {showActionColumn && (
                  <th className="px-6 py-4 w-36 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={showActionColumn ? 4 : 3}
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
                    colSpan={showActionColumn ? 4 : 3}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {search
                      ? "Tidak ditemukan customer yang sesuai pencarian."
                      : "Belum ada data customer."}
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
                        {item.nama_lengkap}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.no_hp || "-"}
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions?.edit === 1 && (
                              <button
                                onClick={() => handleOpenEditModal(item.id)}
                                disabled={editingId === item.id}
                                title="Edit Customer"
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
                                onClick={() =>
                                  handleDelete(item.id, item.nama_lengkap)
                                }
                                title="Hapus Customer"
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
            <Label htmlFor="nama_lengkap">
              Nama Lengkap <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nama_lengkap"
              name="nama_lengkap"
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={namaLengkapInput}
              onChange={(e) => {
                setNamaLengkapInput(e.target.value);

                if (errors.nama_lengkap) {
                  setErrors((prev) => ({ ...prev, nama_lengkap: [] }));
                }
              }}
              {...fieldErrorProps(errors, "nama_lengkap")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="no_hp">No HP</Label>
            <Input
              id="no_hp"
              name="no_hp"
              type="text"
              placeholder="Contoh: 081234567890"
              value={noHpInput}
              onChange={(e) => {
                setNoHpInput(e.target.value);

                if (errors.no_hp) {
                  setErrors((prev) => ({ ...prev, no_hp: [] }));
                }
              }}
              {...fieldErrorProps(errors, "no_hp")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {primaryId ? "" : <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={primaryId ? "Kosongkan bila tidak diganti" : "Minimal 6 karakter"}
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);

                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: [] }));
                }
              }}
              {...fieldErrorProps(errors, "password")}
            />
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
