import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import FieldError, { fieldErrorProps } from "@/components/form/FieldError";
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

interface RoleItem {
  id: number;
  role: string;
}

interface PenggunaItem {
  id: number;
  DT_RowIndex?: number;
  nama_lengkap: string;
  username: string;
  id_role: number | string;
  status: number;
  foto?: string | null;
  role?: string | null;
  created_at?: string;
}

interface IndexProps {
  permissions: Permissions;
  roles: RoleItem[];
}

const STATUS_OPTIONS = [
  { value: "1", label: "Aktif" },
  { value: "0", label: "Blokir" },
];

export default function PenggunaIndex({ permissions, roles }: IndexProps) {
  const [data, setData] = useState<PenggunaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Tambah Pengguna");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [namaLengkapInput, setNamaLengkapInput] = useState<string>("");
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [idRoleInput, setIdRoleInput] = useState<string>("");
  const [statusInput, setStatusInput] = useState<string>("1");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/pengaturan/pengguna", {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data pengguna:", err);
      notifyError("Gagal memuat data!");

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter((item) =>
    [item.nama_lengkap, item.username, item.role ?? ""].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const resetForm = () => {
    setPrimaryId(null);
    setNamaLengkapInput("");
    setUsernameInput("");
    setPasswordInput("");
    setIdRoleInput(roles.length > 0 ? String(roles[0].id) : "");
    setStatusInput("1");
    setFotoFile(null);
    setFotoPreview("");
    setErrors({});
  };

  const handleOpenAddModal = () => {
    resetForm();
    setModalTitle("Form Tambah Pengguna");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    resetForm();
    setEditingId(id);

    try {
      const response = await axios.get(`/admin/pengaturan/pengguna/${id}/edit`);

      if (response.data && response.data.data) {
        const item = response.data.data;
        setNamaLengkapInput(item.nama_lengkap ?? "");
        setUsernameInput(item.username ?? "");
        setIdRoleInput(item.id_role ? String(item.id_role) : "");
        setStatusInput(item.status !== undefined && item.status !== null ? String(item.status) : "1");
        setFotoPreview(item.foto ? `/assets/pengguna/${item.foto}` : "");
        setPrimaryId(id);
        setModalTitle("Form Edit Pengguna");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail pengguna:", err);
      notifyError("Gagal mengambil data pengguna!");
    } finally {
      setEditingId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const url = primaryId
      ? `/admin/pengaturan/pengguna/${primaryId}`
      : "/admin/pengaturan/pengguna";

    const formData = new FormData();
    formData.append("nama_lengkap", namaLengkapInput);
    formData.append("username", usernameInput);
    formData.append("id_role", idRoleInput);
    formData.append("status", statusInput);

    if (passwordInput) {
      formData.append("password", passwordInput);
    }

    if (fotoFile) {
      formData.append("foto", fotoFile);
    }

    if (primaryId) {
      formData.append("_method", "PUT");
    }

    try {
      const response = await axios.post(url, formData);

      if (response.data && response.data.status === "success") {
        handleCloseModal();
        notifySuccess(primaryId ? "Pengguna berhasil diupdate!" : "Pengguna berhasil ditambahkan!");

        fetchData();
      }
    } catch (err: any) {
      handleFormError(err, setErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number, nama: string) => {
    confirmDelete({
      message: `Pengguna "${nama}" akan dihapus beserta hak aksesnya!`,
      url: `/admin/pengaturan/pengguna/${id}`,
      successText: "Pengguna telah dihapus.",
      onDeleted: fetchData,
    });
  };

  const showActionColumn = permissions?.edit === 1 || permissions?.hapus === 1;
  return (
    <AppLayout>
      <Head title="Pengaturan Pengguna - Admin" />
      <PageBreadcrumb parent="Pengaturan" pageTitle="Pengguna" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Pengguna
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola akun pengguna, role, dan status login.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Pengguna</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari nama, username, atau role..."
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
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                {showActionColumn && (
                  <th className="px-6 py-4 w-32 text-center">Aksi</th>
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
                      ? "Tidak ditemukan pengguna yang sesuai pencarian."
                      : "Belum ada data pengguna."}
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
                        {item.username}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.role ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            Number(item.status) === 1
                              ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                              : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
                          }`}
                        >
                          {Number(item.status) === 1 ? "Aktif" : "Blokir"}
                        </span>
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions?.edit === 1 && (
                              <button
                                onClick={() => handleOpenEditModal(item.id)}
                                disabled={editingId === item.id}
                                title="Edit Pengguna"
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
                                title="Hapus Pengguna"
                                className="flex size-8 items-center justify-center rounded-lg bg-error-50 text-error-600 hover:bg-error-100 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20 transition-colors"
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

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} className="max-w-2xl">

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

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Contoh: admin"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (errors.username) {
                      setErrors((prev) => ({ ...prev, username: [] }));
                    }
                  }}
                  {...fieldErrorProps(errors, "username")}
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
                  placeholder={primaryId ? "Kosongkan bila tidak diganti" : "Minimal 5 karakter"}
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

              <div className="space-y-2">
                <Label htmlFor="id_role">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="id_role"
                  name="id_role"
                  options={roles.map((role) => ({
                    value: String(role.id),
                    label: role.role,
                  }))}
                  placeholder="- Pilih Role -"
                  value={idRoleInput}
                  onChange={(val) => {
                    setIdRoleInput(val);
                    if (errors.id_role) {
                      setErrors((prev) => ({ ...prev, id_role: [] }));
                    }
                  }}
                  {...fieldErrorProps(errors, "id_role")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="status"
                  name="status"
                  options={STATUS_OPTIONS}
                  value={statusInput}
                  onChange={(val) => {
                    setStatusInput(val);
                    if (errors.status) {
                      setErrors((prev) => ({ ...prev, status: [] }));
                    }
                  }}
                  {...fieldErrorProps(errors, "status")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foto">Foto Profil</Label>
              <div
                className={`relative flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center ${
                  errors.foto && errors.foto.length > 0
                    ? "border-error-500 bg-error-50/20 dark:border-error-500"
                    : "border-gray-300 hover:border-brand-500 dark:border-gray-700 dark:hover:border-brand-500"
                }`}
              >
                <input
                  id="foto-upload-input"
                  name="foto"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      setFotoFile(file);
                      setFotoPreview(URL.createObjectURL(file));
                      if (errors.foto) {
                        setErrors((prev) => ({ ...prev, foto: [] }));
                      }
                    }
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor="foto-upload-input"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 mb-2">
                    <PlusIcon className="size-5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Klik di sini untuk upload foto
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Format: JPEG, PNG, JPG
                  </p>
                </label>
              </div>

              <FieldError error={errors.foto} className="mt-1" />

              {fotoPreview && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={fotoPreview}
                    alt="Preview Foto"
                    className="size-16 rounded-lg border border-gray-200 object-cover dark:border-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFotoFile(null);
                      setFotoPreview("");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-error-300 bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                  >
                    <TrashBinIcon className="size-3.5" />
                    Hapus Foto
                  </button>
                </div>
              )}
            </div>
          </div>

          <ModalFooter
            onCancel={handleCloseModal}
            isSubmitting={isSubmitting}
            variant="brand"
          />
        </form>
      </Modal>
    </AppLayout>
  );
}
