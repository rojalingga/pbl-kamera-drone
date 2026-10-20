import React, { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";
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
import { Permissions } from "@/types";
import { confirmDelete } from "@/utils/confirm";
import { handleFormError } from "@/utils/form-error";
import { formatInteger } from "@/utils/format";
import { notifyError, notifySuccess } from "@/utils/toast";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";

interface BarangOption {
    id: number;
    nama_barang: string;
    stok: number;
    harga_sewa: string | number;
}

interface PengadaanItem {
    id: number;
    DT_RowIndex?: number;
    tgl_pengadaan: string;
    keterangan?: string | null;
    jumlah_item?: number;
    total_unit?: number;
    barang_list?: string;
}

interface DetailRow {
    id_barang: string;
    jumlah: string;
}

interface IndexProps {
    permissions: Permissions;
    barangs: BarangOption[];
}

const barisKosong = (): DetailRow => ({ id_barang: "", jumlah: "" });

export default function PengadaanBarangIndex({
    permissions,
    barangs,
}: IndexProps) {
    const [data, setData] = useState<PengadaanItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>("");
    const [perPage, setPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [modalTitle, setModalTitle] = useState<string>(
        "Tambah Pengadaan Barang",
    );
    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [tglPengadaanInput, setTglPengadaanInput] = useState<string>("");
    const [keteranganInput, setKeteranganInput] = useState<string>("");
    const [details, setDetails] = useState<DetailRow[]>([barisKosong()]);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                "/admin/inventori/pengadaan-barang",
                {
                    params: { datatable: 1 },
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                    },
                },
            );

            if (response.data && response.data.data) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error("Gagal memuat data pengadaan barang:", err);
            notifyError("Gagal memuat data!");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = data.filter((item) =>
        [
            item.tgl_pengadaan,
            item.keterangan ?? "",
            item.barang_list ?? "",
        ].some((value) => value.toLowerCase().includes(search.toLowerCase())),
    );

    const totalPages = Math.ceil(filteredData.length / perPage) || 1;
    const paginatedData = filteredData.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage,
    );

    const handleAddRow = () => {
        setDetails((prev) => [...prev, barisKosong()]);
    };

    const handleRemoveRow = (index: number) => {
        setDetails((prev) => prev.filter((_, i) => i !== index));
        setErrors((prev) => {
            const next: Record<string, string[]> = {};
            Object.keys(prev).forEach((key) => {
                if (!key.startsWith(`details.${index}.`)) {
                    next[key] = prev[key];
                }
            });
            return next;
        });
    };

    const handleRowChange = (
        index: number,
        field: keyof DetailRow,
        value: string,
    ) => {
        setDetails((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, [field]: value } : row,
            ),
        );

        const key = `details.${index}.${field}`;
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: [] }));
        }
    };

    const rowError = (index: number, field: string): string => {
        const key = `details.${index}.${field}`;
        return errors[key] && errors[key].length > 0 ? errors[key][0] : "";
    };

    const handleOpenAddModal = () => {
        setPrimaryId(null);
        setTglPengadaanInput(new Date().toISOString().slice(0, 10));
        setKeteranganInput("");
        setDetails([barisKosong()]);
        setErrors({});
        setModalTitle("Form Tambah Pengadaan Barang");
        setIsModalOpen(true);
    };

    const handleOpenEditModal = async (id: number) => {
        setErrors({});
        setEditingId(id);

        try {
            const response = await axios.get(
                `/admin/inventori/pengadaan-barang/${id}/edit`,
            );

            if (response.data && response.data.data) {
                const item = response.data.data;
                setTglPengadaanInput(item.tgl_pengadaan ?? "");
                setKeteranganInput(item.keterangan ?? "");
                const rows: DetailRow[] =
                    item.details && item.details.length > 0
                        ? item.details.map((row: DetailRow) => ({
                              id_barang: String(row.id_barang ?? ""),
                              jumlah: String(row.jumlah ?? ""),
                          }))
                        : [barisKosong()];
                setDetails(rows);
                setPrimaryId(id);
                setModalTitle("Form Edit Pengadaan Barang");
                setIsModalOpen(true);
            }
        } catch (err) {
            console.error("Gagal mengambil detail pengadaan:", err);
            notifyError("Gagal mengambil data pengadaan!");
        } finally {
            setEditingId(null);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setPrimaryId(null);
        setTglPengadaanInput("");
        setKeteranganInput("");
        setDetails([barisKosong()]);
        setErrors({});
        setIsSubmitting(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const url = primaryId
            ? `/admin/inventori/pengadaan-barang/${primaryId}`
            : "/admin/inventori/pengadaan-barang";

        const payload: {
            tgl_pengadaan: string;
            keterangan: string;
            details: { id_barang: string; jumlah: string }[];
            _method?: string;
        } = {
            tgl_pengadaan: tglPengadaanInput,
            keterangan: keteranganInput,
            details: details.map((row) => ({
                id_barang: row.id_barang,
                jumlah: row.jumlah,
            })),
        };

        if (primaryId) {
            payload._method = "PUT";
        }

        try {
            const response = await axios.post(url, payload);

            if (response.data && response.data.status === "success") {
                handleCloseModal();
                notifySuccess(
                    primaryId
                        ? "Pengadaan barang berhasil diupdate!"
                        : "Pengadaan barang berhasil ditambahkan!",
                );

                fetchData();
            }
        } catch (err: any) {
            handleFormError(err, setErrors);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: number, label: string) => {
        confirmDelete({
            message: `Pengadaan "${label}" akan dihapus! Stok barang akan dikurangi sesuai item pengadaan.`,
            url: `/admin/inventori/pengadaan-barang/${id}`,
            successText: "Pengadaan barang telah dihapus.",
            onDeleted: fetchData,
        });
    };

    const showActionColumn =
        permissions?.edit === 1 || permissions?.hapus === 1;
    return (
        <AppLayout>
            <Head title="Pengadaan Barang - Admin" />
            <PageBreadcrumb parent="Inventori" pageTitle="Pengadaan Barang" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

                <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Data Pengadaan Barang
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Setiap pengadaan menambah stok barang dan tercatat
                            di riwayat stok.
                        </p>
                    </div>

                    {permissions?.tambah === 1 && (
                        <button
                            onClick={handleOpenAddModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 focus:outline-none"
                        >
                            <PlusIcon className="size-4" />
                            Tambah Pengadaan
                        </button>
                    )}
                </div>

                <TableFilterToolbar
                    search={search}
                    perPage={perPage}
                    placeholder="Cari tanggal, keterangan, atau barang..."
                    setSearch={setSearch}
                    setPerPage={setPerPage}
                    setCurrentPage={setCurrentPage}
                />

                <div className="max-w-full overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">
                                    No
                                </th>
                                <th className="px-6 py-4">Tanggal Pengadaan</th>
                                <th className="px-6 py-4">Keterangan</th>
                                <th className="px-6 py-4">Item Barang</th>
                                <th className="px-6 py-4 text-right">
                                    Total Unit
                                </th>
                                {showActionColumn && (
                                    <th className="px-6 py-4 w-32 text-center">
                                        Aksi
                                    </th>
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
                                            <span className="text-xs">
                                                Memuat data...
                                            </span>
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
                                            ? "Tidak ditemukan pengadaan yang sesuai pencarian."
                                            : "Belum ada data pengadaan barang."}
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item, index) => {
                                    const itemIndex =
                                        (currentPage - 1) * perPage + index + 1;
                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-white/3 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-center font-medium text-gray-600 dark:text-gray-400">
                                                {itemIndex}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">
                                                {item.tgl_pengadaan}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                {item.keterangan ?? "-"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                {item.barang_list ?? "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-white/90">
                                                {formatInteger(
                                                    item.total_unit ?? 0,
                                                )}{" "}
                                                unit
                                            </td>
                                            {showActionColumn && (
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {permissions?.edit ===
                                                            1 && (
                                                            <button
                                                                onClick={() =>
                                                                    handleOpenEditModal(
                                                                        item.id,
                                                                    )
                                                                }
                                                                disabled={editingId === item.id}
                                                                title="Edit Pengadaan"
                                                                className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 disabled:opacity-50 disabled:cursor-wait transition-colors"
                                                            >
                                                                {editingId === item.id ? (
                                                                  <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
                                                                ) : (
                                                                  <PencilIcon className="size-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                        {permissions?.hapus ===
                                                            1 && (
                                                            <button
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        item.id,
                                                                        item.keterangan ||
                                                                            `#${item.id}`,
                                                                    )
                                                                }
                                                                title="Hapus Pengadaan"
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

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                className="max-w-3xl"
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                            {modalTitle}
                        </h3>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                    <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-5">
                        {errors &&
                            Object.keys(errors).length > 0 &&
                            !Object.keys(errors).some((key) =>
                                key.startsWith("details."),
                            ) && (
                                <div className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                                    {Object.keys(errors).map((key) => (
                                        <p key={key}>{errors[key][0]}</p>
                                    ))}
                                </div>
                            )}

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Label>Tanggal Pengadaan</Label>
                                <DatePicker
                                    id="tgl_pengadaan"
                                    placeholder="Pilih tanggal"
                                    defaultDate={tglPengadaanInput || undefined}
                                    onChange={(
                                        _dates: Date[],
                                        dateStr: string,
                                    ) => setTglPengadaanInput(dateStr)}
                                />
                                <FieldError error={errors.tgl_pengadaan} />
                            </div>

                            <div className="sm:col-span-2">
                                <Label>Keterangan</Label>
                                <TextArea
                                    value={keteranganInput}
                                    onChange={setKeteranganInput}
                                    placeholder="Contoh: Restock awal bulan"
                                    rows={2}
                                />
                                <FieldError error={errors.keterangan} />
                            </div>
                        </div>

                        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                    Item Barang
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
                                {details.map((row, index) => (
                                    <div
                                        key={index}
                                        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                                    >
                                        <div className="grid items-start gap-4 sm:grid-cols-12">
                                            <div className="sm:col-span-6">
                                                <Label>Barang</Label>
                                                <Select
                                                    id={`detail-${index}-barang`}
                                                    options={barangs.map(
                                                        (b) => ({
                                                            label: b.nama_barang,
                                                            value: String(b.id),
                                                        }),
                                                    )}
                                                    placeholder="Pilih barang..."
                                                    value={row.id_barang}
                                                    onChange={(val) =>
                                                        handleRowChange(
                                                            index,
                                                            "id_barang",
                                                            val,
                                                        )
                                                    }
                                                />
                                                <FieldError error={rowError(index, "id_barang")} />
                                            </div>

                                            <div className="sm:col-span-4">
                                                <Label>Jumlah</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    placeholder="0"
                                                    value={row.jumlah}
                                                    onChange={(e) =>
                                                        handleRowChange(
                                                            index,
                                                            "jumlah",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <FieldError error={rowError(index, "jumlah")} />
                                            </div>

                                            <div className="sm:col-span-2 flex justify-end pt-[26px]">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemoveRow(index)
                                                    }
                                                    title="Hapus baris"
                                                    className="flex size-10 items-center justify-center rounded-lg bg-error-50 text-error-600 transition-colors hover:bg-error-100 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
                                                >
                                                    <TrashBinIcon className="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <ModalFooter
                        onCancel={handleCloseModal}
                        isSubmitting={isSubmitting}
                        cancelLocked={false}
                        variant="blueSoft"
                    />
                </form>
            </Modal>
        </AppLayout>
    );
}
