import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
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
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";

interface MerkOption {
  id: number;
  merk: string;
}

interface KategoriOption {
  id: number;
  kategori: string;
}

interface FotoItem {
  id: number;
  foto: string;
}

interface BarangItem {
  id: number;
  DT_RowIndex?: number;
  nama_barang: string;
  id_merk?: number | null;
  id_kategori?: number | null;
  stok: number;
  keterangan?: string | null;
  harga_sewa: string | number;
  denda_per_hari?: string | number | null;
  merk?: string;
  kategori?: string;
  fotos?: FotoItem[];
  created_at?: string;
}

interface IndexProps {
  permissions: Permissions;
  merks: MerkOption[];
  kategoris: KategoriOption[];
}

const formatFromServer = (value: string | number): string =>
  Number(value) > 0 ? formatInteger(value) : "";

export default function BarangIndex({
  permissions,
  merks,
  kategoris,
}: IndexProps) {
  const [data, setData] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Tambah Barang");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [namaBarangInput, setNamaBarangInput] = useState<string>("");
  const [idMerkInput, setIdMerkInput] = useState<string>("");
  const [idKategoriInput, setIdKategoriInput] = useState<string>("");
  const [stokInput, setStokInput] = useState<string>("");
  const [hargaSewaInput, setHargaSewaInput] = useState<string>("");
  const [dendaInput, setDendaInput] = useState<string>("");
  const [keteranganInput, setKeteranganInput] = useState<string>("");
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [existingFotos, setExistingFotos] = useState<FotoItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/master-data/barang", {
        params: { datatable: 1 },
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

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();
    const merk =
      typeof item.merk === "string" ? item.merk : "";
    const kategori =
      typeof item.kategori === "string" ? item.kategori : "";

    return (
      (item.nama_barang || "").toLowerCase().includes(keyword) ||
      merk.toLowerCase().includes(keyword) ||
      kategori.toLowerCase().includes(keyword)
    );
  });

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const resetForm = () => {
    setNamaBarangInput("");
    setIdMerkInput("");
    setIdKategoriInput("");
    setStokInput("");
    setHargaSewaInput("");
    setDendaInput("");
    setKeteranganInput("");
    setFotoFiles([]);
    setExistingFotos([]);
  };

  const handleOpenAddModal = () => {
    setPrimaryId(null);
    resetForm();
    setErrors({});
    setModalTitle("Form Tambah Barang");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    setErrors({});
    setEditingId(id);

    try {
      const res = await axios.get(`/admin/master-data/barang/${id}/edit`);
      if (res.data && res.data.data) {
        const detail = res.data.data;
        setNamaBarangInput(detail.nama_barang || "");
        setIdMerkInput(detail.id_merk ? String(detail.id_merk) : "");
        setIdKategoriInput(
          detail.id_kategori ? String(detail.id_kategori) : ""
        );
        setStokInput(
          detail.stok === null || detail.stok === undefined
            ? ""
            : String(detail.stok)
        );
        setHargaSewaInput(formatFromServer(detail.harga_sewa));
    setDendaInput(formatFromServer(detail.denda_per_hari ?? 0));
    if (errors.denda_per_hari) {
      setErrors((prev) => ({ ...prev, denda_per_hari: [] }));
    }
        setKeteranganInput(detail.keterangan || "");
        setFotoFiles([]);
        setExistingFotos(detail.fotos || []);
        setPrimaryId(id);
        setModalTitle("Form Edit Barang");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail barang:", err);
      notifyError("Gagal mengambil data barang!");
    } finally {
      setEditingId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPrimaryId(null);
    resetForm();
    setErrors({});
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const url = primaryId
      ? `/admin/master-data/barang/${primaryId}`
      : "/admin/master-data/barang";

    const formData = new FormData();
    formData.append("nama_barang", namaBarangInput);
    formData.append("id_merk", idMerkInput);
    formData.append("id_kategori", idKategoriInput);
    formData.append("harga_sewa", hargaSewaInput.replace(/\D/g, ""));
    formData.append("denda_per_hari", dendaInput.replace(/\D/g, ""));
    formData.append("keterangan", keteranganInput);

    fotoFiles.forEach((file) => {
      formData.append("foto[]", file);
    });

    existingFotos.forEach((foto) => {
      formData.append("existing_foto[]", String(foto.id));
    });

    if (primaryId) {
      formData.append("_method", "PUT");
    }

    try {
      const response = await axios.post(url, formData);

      if (response.data && response.data.status === "success") {
        handleCloseModal();
        notifySuccess(primaryId ? "Barang berhasil diupdate!" : "Barang berhasil ditambahkan!");

        fetchData();
      }
    } catch (err: any) {
      handleFormError(err, setErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number, barangName: string) => {
    confirmDelete({
      message: `Barang "${barangName}" akan dihapus secara permanen!`,
      url: `/admin/master-data/barang/${id}`,
      successText: "Barang telah dihapus.",
      onDeleted: fetchData,
    });
  };

  const showActionColumn = permissions?.edit === 1 || permissions?.hapus === 1;

  return (
    <AppLayout>
      <Head title="Master Data Barang - Admin" />
      <PageBreadcrumb parent="Master Data" pageTitle="Barang" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Barang
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola daftar kamera, drone, dan aksesoris beserta stok serta
              harga sewanya.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Barang</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari barang..."
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
                <th className="px-6 py-4">Merk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Stok</th>
                <th className="px-6 py-4">Harga Sewa</th>
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
                        {typeof item.merk === "string" ? item.merk : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {typeof item.kategori === "string"
                          ? item.kategori
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.stok}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <Rupiah value={item.harga_sewa} />
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions?.edit === 1 && (
                              <button
                                onClick={() => handleOpenEditModal(item.id)}
                                disabled={editingId === item.id}
                                title="Edit Barang"
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
                                  handleDelete(item.id, item.nama_barang)
                                }
                                title="Hapus Barang"
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
        className="max-w-2xl"
      >

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
            {modalTitle}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="nama_barang">
                Nama Barang <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nama_barang"
                name="nama_barang"
                type="text"
                placeholder="Contoh: Kamera Sony A7 III, Drone DJI Mini 4..."
                value={namaBarangInput}
                onChange={(e) => {
                  setNamaBarangInput(e.target.value);

                  if (errors.nama_barang) {
                    setErrors((prev) => ({ ...prev, nama_barang: [] }));
                  }
                }}
                {...fieldErrorProps(errors, "nama_barang")}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="id_merk">
                  Merk <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="id_merk"
                  name="id_merk"
                  options={merks.map((m) => ({
                    value: String(m.id),
                    label: m.merk,
                  }))}
                  value={idMerkInput}
                  placeholder="- Pilih Merk -"
                  onChange={(val) => {
                    setIdMerkInput(val);
                    if (errors.id_merk) {
                      setErrors((prev) => ({ ...prev, id_merk: [] }));
                    }
                  }}
                  {...fieldErrorProps(errors, "id_merk")}
                />
              </div>

            <div className="space-y-2">
              <Label htmlFor="id_kategori">
                Kategori <span className="text-red-500">*</span>
              </Label>
              <Select
                id="id_kategori"
                name="id_kategori"
                options={kategoris.map((k) => ({
                  value: String(k.id),
                  label: k.kategori,
                }))}
                value={idKategoriInput}
                placeholder="- Pilih Kategori -"
                onChange={(val) => {
                  setIdKategoriInput(val);
                  if (errors.id_kategori) {
                    setErrors((prev) => ({ ...prev, id_kategori: [] }));
                  }
                }}
                {...fieldErrorProps(errors, "id_kategori")}
              />
            </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="harga_sewa">
                  Harga Sewa <span className="text-red-500">*</span>
                </Label>
                <RupiahInput
                  id="harga_sewa"
                  value={hargaSewaInput}
                  placeholder="Contoh: 150.000"
                  onChange={(v) => {
                    setHargaSewaInput(v);
                    if (errors.harga_sewa) {
                      setErrors((prev) => ({ ...prev, harga_sewa: [] }));
                    }
                  }}
                  {...fieldErrorProps(errors, "harga_sewa")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="denda_per_hari">Denda / Hari</Label>
                <RupiahInput
                  id="denda_per_hari"
                  value={dendaInput}
                  placeholder="Contoh: 50.000"
                  onChange={(v) => {
                    setDendaInput(v);
                    if (errors.denda_per_hari) {
                      setErrors((prev) => ({ ...prev, denda_per_hari: [] }));
                    }
                  }}
                  {...fieldErrorProps(errors, "denda_per_hari")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stok">Stok</Label>
              <Input
                id="stok"
                name="stok"
                type="number"
                min={0}
                placeholder="0"
                disabled
                value={stokInput}
                hint="Stok hanya bertambah lewat menu Pengadaan Barang."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan</Label>
              <TextArea
                id="keterangan"
                name="keterangan"
                rows={3}
                placeholder="Contoh: termasuk lensa 24-70mm, tas, dan baterai cadangan..."
                value={keteranganInput}
                onChange={(value) => {
                  setKeteranganInput(value);
                  if (errors.keterangan) {
                    setErrors((prev) => ({ ...prev, keterangan: [] }));
                  }
                }}
                {...fieldErrorProps(errors, "keterangan")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foto">
                Foto Barang {primaryId ? "" : <span className="text-red-500">*</span>}
              </Label>

              <div className={`rounded-xl border border-dashed p-4 text-center transition-colors ${
                errors.foto && errors.foto.length > 0
                  ? "border-error-500 bg-error-50/20 dark:border-error-500"
                  : "border-gray-300 hover:border-brand-500 dark:border-gray-700 dark:hover:border-brand-500"
              }`}>
                <input
                  id="foto-upload-input"
                  name="foto"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files || []);
                    if (newFiles.length > 0) {
                      setFotoFiles((prev) => [...prev, ...newFiles]);
                      if (errors.foto) {
                        setErrors((prev) => ({ ...prev, foto: [] }));
                      }
                    }
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor="foto-upload-input"
                  className="flex flex-col items-center justify-center cursor-pointer py-2"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 mb-2">
                    <PlusIcon className="size-5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Klik di sini untuk upload foto barang (Bisa Pilih Banyak)
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Format: JPEG, PNG, JPG, WEBP (Maks. 2MB / foto)
                  </p>
                </label>
              </div>

              <FieldError error={errors.foto} className="mt-1" />

              {(existingFotos.length > 0 || fotoFiles.length > 0) && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Preview Foto ({existingFotos.length + fotoFiles.length} foto):
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                    {existingFotos.map((foto) => (
                      <div
                        key={`existing-${foto.id}`}
                        className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
                      >
                        <img
                          src={foto.foto.startsWith('http') ? foto.foto : `/assets/barang/${foto.foto}`}
                          alt="Foto tersimpan"
                          className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Tersimpan
                        </span>
                        <button
                          type="button"
                          title="Hapus foto ini"
                          onClick={() =>
                            setExistingFotos((prev) =>
                              prev.filter((item) => item.id !== foto.id)
                            )
                          }
                          className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
                        >
                          <TrashBinIcon className="size-3.5" />
                        </button>
                      </div>
                    ))}

                    {fotoFiles.map((file, idx) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div
                          key={`new-${idx}-${file.name}`}
                          className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs dark:border-brand-900/40 dark:bg-gray-900"
                        >
                          <img
                            src={previewUrl}
                            alt="Foto baru"
                            className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-brand-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Baru
                          </span>
                          <button
                            type="button"
                            title="Hapus foto ini"
                            onClick={() =>
                              setFotoFiles((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
                          >
                            <TrashBinIcon className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
