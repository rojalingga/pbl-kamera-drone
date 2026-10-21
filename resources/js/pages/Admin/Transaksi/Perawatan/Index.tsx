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
import Rupiah from "@/components/common/Rupiah";
import RupiahInput from "@/components/common/RupiahInput";
import { Permissions } from "@/types";
import { confirmDelete } from "@/utils/confirm";
import { handleFormError } from "@/utils/form-error";
import { formatInteger, parseRupiah } from "@/utils/format";
import { notifyError, notifySuccess } from "@/utils/toast";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";

const STATUS_PERAWATAN = "Perawatan";
const STATUS_SELESAI = "Selesai";

type MetodeBayar = "cash" | "transfer";

const METODE_BAYAR_OPTIONS = [
    { value: "cash", label: "Kas Kantor" },
    { value: "transfer", label: "Transfer Bank" },
];

interface BarangOption {
    id: string;
    nama_barang: string;
    stok: number;
}

interface DetailItem {
    id: number;
    barang: string;
    qty: number;
    status: string;
}

interface PerawatanRow {
    id: number;
    DT_RowIndex?: number;
    tgl_perawatan: string | null;
    petugas?: string | null;
    total_qty?: number;
    detail_list?: DetailItem[] | string | null;
    total_biaya_perawatan: string;
    status_pembayaran: string;
}

interface DetailRow {
    id: number | null;
    id_barang: string;
    qty: string;
    biaya_perawatan: string;
    status: string;
    keterangan: string;
}



interface IndexProps {
    permissions: Permissions;
    barangs: BarangOption[];
}

const barisKosong = (): DetailRow => ({
    id: null,
    id_barang: "",
    qty: "1",
    biaya_perawatan: "",
    status: STATUS_PERAWATAN,
    keterangan: "",
});

const hariIni = () => new Date().toISOString().slice(0, 10);

/**
 * Kolom `detail_list` dikirim DataTables dalam bentuk string JSON, jadi
 * dipecah dulu sebelum dipakai. Array langsung tetap diterima.
 */
const parseDetailList = (value: DetailItem[] | string | null | undefined): DetailItem[] => {
    if (Array.isArray(value)) {
        return value;
    }

    try {
        const parsed = JSON.parse(String(value ?? "[]"));

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
export default function PerawatanIndex({ permissions, barangs }: IndexProps) {
    const [data, setData] = useState<PerawatanRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>("");
    const [perPage, setPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [modalTitle, setModalTitle] = useState<string>(
        "Form Tambah Perawatan",
    );
    const [tglInput, setTglInput] = useState<string>(hariIni());
    const [details, setDetails] = useState<DetailRow[]>([barisKosong()]);

    const [metodeBayar, setMetodeBayar] = useState<MetodeBayar>("cash");
    const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);

    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get("/admin/transaksi/perawatan", {
                params: { datatable: 1 },
                headers: { "X-Requested-With": "XMLHttpRequest" },
            });

            if (response.data && response.data.data) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error("Gagal memuat data perawatan:", err);
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

        return [
            item.tgl_perawatan,
            item.petugas,
            item.barang_list,
            item.status_pembayaran,
        ].some((value) => (value ?? "").toLowerCase().includes(keyword));
    });

    const totalPages = Math.ceil(filteredData.length / perPage) || 1;
    const paginatedData = filteredData.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage,
    );

    const barangOptions = (barangs ?? []).map((row) => ({
        value: String(row.id),
        label: `${row.nama_barang} (stok: ${row.stok ?? 0})`,
    }));

    const totalBiaya = details.reduce(
        (sum, row) => sum + parseRupiah(row.biaya_perawatan),
        0,
    );

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

    const handleAddRow = () => {
        setDetails((prev) => [...prev, barisKosong()]);
    };

    const handleRemoveRow = (index: number) => {
        setDetails((prev) => prev.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        setTglInput(hariIni());
        setDetails([barisKosong()]);
        setMetodeBayar("cash");
        setErrors({});
        setIsSubmitting(false);
    };

    const handleOpenAddModal = () => {
        setPrimaryId(null);
        resetForm();
        setModalTitle("Form Tambah Perawatan");
        setIsModalOpen(true);
    };

    const handleOpenEditModal = async (id: number) => {
        setErrors({});
        setEditingId(id);

        try {
            const response = await axios.get(
                `/admin/transaksi/perawatan/${id}/edit`,
            );

            if (response.data && response.data.data) {
                const item = response.data.data;
                setTglInput(item.tgl_perawatan ?? hariIni());
                const rows: DetailRow[] =
                    item.details && item.details.length > 0
                        ? item.details.map((row: DetailRow) => ({
                              id: row.id ?? null,
                              id_barang: String(row.id_barang ?? ""),
                              qty: String(row.qty ?? "1"),
                              biaya_perawatan:
                                  row.biaya_perawatan !== null &&
                                  String(row.biaya_perawatan) !== ""
                                      ? formatInteger(row.biaya_perawatan)
                                      : "",
                              status: row.status ?? STATUS_PERAWATAN,
                              keterangan: row.keterangan ?? "",
                          }))
                        : [barisKosong()];
                setDetails(rows);
                setPrimaryId(id);
                setModalTitle("Form Edit Perawatan");
                setIsModalOpen(true);
            }
        } catch (err) {
            console.error("Gagal mengambil detail perawatan:", err);
            notifyError("Gagal mengambil data perawatan!");
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
            ? `/admin/transaksi/perawatan/${primaryId}`
            : "/admin/transaksi/perawatan";

        const payload: {
            tgl_perawatan: string;
            details: {
                id_barang: string;
                qty: string;
                biaya_perawatan: string;
                status: string;
                keterangan: string;
            }[];
            metode_pembayaran: string;
            _method?: string;
        } = {
            tgl_perawatan: tglInput,
            metode_pembayaran: metodeBayar,
            details: details.map((row) => ({
                id_barang: row.id_barang,
                qty: row.qty,
                biaya_perawatan: row.biaya_perawatan.replace(/\D/g, ""),
                status: row.status,
                keterangan: row.keterangan,
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
                        ? "Perawatan berhasil diupdate!"
                        : "Perawatan berhasil ditambahkan!",
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
            message: `Perawatan "${label}" akan dihapus! Mutasi stok barang akan dibatalkan.`,
            url: `/admin/transaksi/perawatan/${id}`,
            successText: "Perawatan telah dihapus.",
            onDeleted: fetchData,
        });
    };

    const handleStatusDetail = async (detailId: number, status: string) => {
        setStatusLoadingId(detailId);

        try {
            const response = await axios.patch(
                `/admin/transaksi/perawatan-detail/${detailId}/status`,
                { status },
            );

            if (response.data && response.data.status === "success") {
                notifySuccess(
                    status === STATUS_SELESAI
                        ? "Barang selesai perawatan, stok ditambahkan kembali."
                        : "Barang kembali underway perawatan, stok dikurangi.",
                );
                fetchData();
            }
        } catch (err: any) {
            notifyError(err?.response?.data?.error ?? "Gagal mengubah status!");
        } finally {
            setStatusLoadingId(null);
        }
    };

    const showActionColumn =
        permissions?.edit === 1 || permissions?.hapus === 1;

    return (
        <AppLayout>
            <Head title="Perawatan - Admin" />
            <PageBreadcrumb parent="Transaksi" pageTitle="Perawatan" />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Data Perawatan
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Status Perawatan mengurangi stok barang, status
                            Selesai menambahkannya kembali.
                        </p>
                    </div>

                    {permissions?.tambah === 1 && (
                        <button
                            onClick={handleOpenAddModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 focus:outline-none"
                        >
                            <PlusIcon className="size-4" />
                            Tambah Perawatan
                        </button>
                    )}
                </div>

                <TableFilterToolbar
                    search={search}
                    perPage={perPage}
                    placeholder="Cari tanggal, barang..."
                    setSearch={setSearch}
                    setPerPage={setPerPage}
                    setCurrentPage={setCurrentPage}
                />

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] text-left text-sm">
                        <thead className="border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="w-14 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    No
                                </th>
                                <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Tgl Perawatan
                                </th>
                                <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Barang
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Qty
                                </th>
                                <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Total Biaya
                                </th>
                                {showActionColumn && (
                                    <th className="w-28 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Aksi
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={showActionColumn ? 6 : 5}
                                        className="px-4 py-10 text-center text-sm text-gray-500"
                                    >
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : paginatedData.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={showActionColumn ? 6 : 5}
                                        className="px-4 py-10 text-center text-sm text-gray-500"
                                    >
                                        Belum ada data perawatan.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/3"
                                    >
                                        <td className="px-4 py-4 text-center text-medium text-gray-600 dark:text-gray-400">
                                            {(currentPage - 1) * perPage +
                                                index +
                                                1}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                            {item.tgl_perawatan ?? "-"}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1">
                                                {parseDetailList(item.detail_list).map(
                                                    (d) => (
                                                        <div
                                                            key={d.id}
                                                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                                                        >
                                                            <span>
                                                                {d.barang} (
                                                                {d.qty})
                                                            </span>
                                                            {permissions?.edit === 1 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleStatusDetail(
                                                                            d.id,
                                                                            d.status ===
                                                                                STATUS_SELESAI
                                                                                ? STATUS_PERAWATAN
                                                                                : STATUS_SELESAI,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        statusLoadingId ===
                                                                        d.id
                                                                    }
                                                                    title="Ubah status perawatan"
                                                                    className={
                                                                        d.status ===
                                                                        STATUS_SELESAI
                                                                            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                                            : "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400"
                                                                    }
                                                                >
                                                                    {d.status}
                                                                </button>
                                                            ) : (
                                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                                    {d.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-600 dark:text-gray-400">
                                            {item.total_qty ?? 0}
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold text-gray-800 dark:text-white/90">
                                            <Rupiah
                                                value={
                                                    item.total_biaya_perawatan ??
                                                    "0"
                                                }
                                            />
                                        </td>
                                        {showActionColumn && (
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {permissions?.edit ===
                                                        1 && (
                                                        <button
                                                            onClick={() =>
                                                                handleOpenEditModal(
                                                                    item.id,
                                                                )
                                                            }
                                                            disabled={
                                                                editingId ===
                                                                item.id
                                                            }
                                                            title="Edit Perawatan"
                                                            className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100 disabled:cursor-wait disabled:opacity-50 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                                                        >
                                                            {editingId ===
                                                            item.id ? (
                                                                <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                                                            ) : (
                                                                <PencilIcon className="size-4" />
                                                            )}
                                                        </button>
                                                    )}

                                                    {permissions?.hapus === 1 && (
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    item.id,
                                                                    `${item.tgl_perawatan ?? "-"} - ${
                                                                        item.barang_list ??
                                                                        "-"}`,
                                                                )
                                                            }
                                                            title="Hapus Perawatan"
                                                            className="flex size-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                                        >
                                                            <TrashBinIcon className="size-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
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
                className="max-w-7xl"
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
                                <Label htmlFor="tgl_perawatan">
                                    Tanggal Perawatan{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <DatePicker
                                    id="tgl_perawatan"
                                    placeholder="Pilih tanggal"
                                    defaultDate={tglInput || undefined}
                                    onChange={(
                                        _dates: Date[],
                                        dateStr: string,
                                    ) => setTglInput(dateStr)}
                                />
                                <FieldError error={errors.tgl_perawatan} />
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                    Detail Perawatan
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

                            <FieldError
                                error={errors.details}
                                className="mt-2"
                            />

                            <div className="mt-4 space-y-3">
                                {details.map((row, index) => (
                                    <div
                                        key={index}
                                        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                                    >
                                        <div className="grid items-start gap-4 sm:grid-cols-12">
                                            <div className="sm:col-span-4">
                                                <Label>Barang</Label>
                                                <Select
                                                    id={`detail-${index}-barang`}
                                                    options={barangOptions}
                                                    placeholder="Pilih barang..."
                                                    value={row.id_barang}
                                                    onChange={(val) =>
                                                        handleRowChange(
                                                            index,
                                                            "id_barang",
                                                            val,
                                                        )
                                                    }
                                                    {...fieldErrorProps(
                                                        errors,
                                                        `details.${index}.id_barang`,
                                                    )}
                                                />
                                            </div>

                                            <div className="sm:col-span-1">
                                                <Label>Qty</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    placeholder="0"
                                                    value={row.qty}
                                                    onChange={(e) =>
                                                        handleRowChange(
                                                            index,
                                                            "qty",
                                                            e.target.value,
                                                        )
                                                    }
                                                    {...fieldErrorProps(
                                                        errors,
                                                        `details.${index}.qty`,
                                                    )}
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <Label>Biaya Perawatan</Label>
                                                <RupiahInput
                                                    id={`detail-${index}-biaya`}
                                                    value={row.biaya_perawatan}
                                                    onChange={(val) =>
                                                        handleRowChange(
                                                            index,
                                                            "biaya_perawatan",
                                                            val,
                                                        )
                                                    }
                                                    placeholder="0"
                                                    {...fieldErrorProps(
                                                        errors,
                                                        `details.${index}.biaya_perawatan`,
                                                    )}
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <Label>Status</Label>
                                                <Select
                                                    id={`detail-${index}-status`}
                                                    options={[
                                                        {
                                                            value: STATUS_PERAWATAN,
                                                            label: STATUS_PERAWATAN,
                                                        },
                                                        {
                                                            value: STATUS_SELESAI,
                                                            label: STATUS_SELESAI,
                                                        },
                                                    ]}
                                                    placeholder="- Pilih status -"
                                                    value={row.status}
                                                    onChange={(val) =>
                                                        handleRowChange(
                                                            index,
                                                            "status",
                                                            val,
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <Label>&nbsp;</Label>
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
                                            <div className="sm:col-span-10">
                                                <Label>Keterangan</Label>
                                                <Input
                                                    type="text"
                                                    placeholder="Opsional"
                                                    value={row.keterangan}
                                                    onChange={(e) =>
                                                        handleRowChange(
                                                            index,
                                                            "keterangan",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                Pembayaran
                            </h4>

                            <div className="mt-4 grid items-start gap-4 sm:grid-cols-12">
                                <div className="sm:col-span-4">
                                    <Label>Metode Pembayaran</Label>
                                    <Select
                                        id="metode-pembayaran"
                                        options={METODE_BAYAR_OPTIONS}
                                        placeholder="- Pilih metode -"
                                        value={metodeBayar}
                                        onChange={(val) =>
                                            setMetodeBayar(val as MetodeBayar)
                                        }
                                        {...fieldErrorProps(
                                            errors,
                                            "metode_pembayaran",
                                        )}
                                    />
                                </div>

                                <div className="sm:col-span-8">
                                    <Label>Total Biaya Perawatan</Label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            readOnly
                                            value={
                                                totalBiaya > 0
                                                    ? formatInteger(totalBiaya)
                                                    : ""
                                            }
                                            placeholder="Dihitung otomatis dari detail"
                                            className="bg-gray-50 ps-14 dark:bg-gray-800/60"
                                        />
                                        <span className="absolute start-0 top-0 flex h-11 items-center border-e border-gray-200 px-3.5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                                            Rp.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                Pembayaran dicatat saat dokumen disimpan: pengeluaran
                                dibuat dan saldo rekening otomatis dipotong.
                            </p>
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
