import React, { useState, useEffect, useCallback, useRef } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import DatePicker from "@/components/form/date-picker";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import FieldError from "@/components/form/FieldError";
import ModalFooter from "@/components/common/ModalFooter";
import TableFilterToolbar from "@/components/common/TableFilterToolbar";
import TablePagination from "@/components/common/TablePagination";
import Rupiah from "@/components/common/Rupiah";
import RupiahInput from "@/components/common/RupiahInput";
import { cn } from "@/utils";
import { Permissions } from "@/types";
import { confirmDelete } from "@/utils/confirm";
import { handleFormError } from "@/utils/form-error";
import { formatInteger, formatRupiah, parseRupiah } from "@/utils/format";
import { notifyError, notifySuccess } from "@/utils/toast";
import { playSound } from "@/utils/sound";
import {
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
  DollarLineIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertIcon,
} from "@/icons";
import { Printer } from "lucide-react";

interface CustomerItem {
  id: number;
  nama_lengkap: string;
}

interface BarangItem {
  id: number;
  nama_barang: string;
  harga_sewa: string | number | null;
  stok?: number | null;
}

interface SewaRow {
  id: string;
  DT_RowIndex?: number;
  no_sewa: string | null;
  tgl_sewa: string | null;
  tgl_akhir_sewa: string | null;
  id_customer: number | null;
  total_biaya: string | number | null;
  foto_jaminan: string | null;
  id_users: number | null;
  status_pembayaran: string | null;
  status_sewa: string | null;
  periode_sewa?: string | null;
  customer?: string;
  petugas?: string;
}

interface DetailRow {
  key: number;
  id: number | null;
  id_barang: string;
  harga_sewa_satuan: string;
  qty: string;
}

interface PembayaranData {
  id: number;
  id_sewa: number;
  order_id: string | null;
  transaction_id: string | null;
  payment_type: string | null;
  metode_pembayaran: "qris" | "cash" | "transfer" | string | null;
  gross_amount: string | number | null;
  currency: string | null;
  transaction_status: string | null;
  fraud_status: string | null;
  qr_url: string | null;
  qr_string: string | null;
  transaction_time: string | null;
  settlement_time: string | null;
  expiry_time: string | null;
}

interface PaymentModalState {
  sewa: {
    id: number;
    no_sewa?: string;
    customer: string;
    tgl_sewa: string | null;
    tgl_akhir: string | null;
    total_biaya: string | number | null;
  status_pembayaran: string | null;
  status_sewa: string | null;
  periode_sewa?: string | null;
  } | null;
  pembayaran: PembayaranData | null;
}

interface IndexProps {
  permissions: Permissions;
  customers: CustomerItem[];
  barangs: BarangItem[];
}

function hitungJumlahHari(tglAwal: string, tglAkhir: string): number {
  if (!tglAwal || !tglAkhir) {
    return 0;
  }

  const awal = new Date(tglAwal);
  const akhir = new Date(tglAkhir);

  if (Number.isNaN(awal.getTime()) || Number.isNaN(akhir.getTime())) {
    return 0;
  }

  const selisih = Math.round((akhir.getTime() - awal.getTime()) / 86400000);

  return selisih > 0 ? selisih : 0;
}

export default function SewaIndex({
  permissions,
  customers,
  barangs,
}: IndexProps) {
  const [data, setData] = useState<SewaRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLunas, setIsLunas] = useState(false);

  const isRowLunas = (status?: string | null) => status === "Confirmed";
  const [modalTitle, setModalTitle] = useState<string>("Tambah Sewa");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [tglSewaInput, setTglSewaInput] = useState<string>("");
  const [tglAkhirInput, setTglAkhirInput] = useState<string>("");
  const [customerInput, setCustomerInput] = useState<string>("");
  const [jaminanFile, setJaminanFile] = useState<File | null>(null);
  const [jaminanPreview, setJaminanPreview] = useState<string>("");
  const [items, setItems] = useState<DetailRow[]>([
    { key: 1, id: null, id_barang: "", harga_sewa_satuan: "", qty: "1" },
  ]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [selectedMetode, setSelectedMetode] = useState<"qris" | "cash" | "transfer">("qris");
  const [paymentState, setPaymentState] = useState<PaymentModalState>({
    sewa: null,
    pembayaran: null,
  });
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>("");
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [receiptLoading, setReceiptLoading] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [receiptError, setReceiptError] = useState<string>("");

  const customerOptions = (customers ?? []).map((c) => ({
    value: String(c.id),
    label: c.nama_lengkap,
  }));

  const barangOptions = (barangs ?? []).map((b) => ({
    value: String(b.id),
    label: b.stok != null ? `${b.nama_barang} (Stok: ${b.stok})` : b.nama_barang,
  }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/transaksi/sewa", {
        params: { datatable: 1 },
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data sewa:", err);
      notifyError("Gagal memuat data sewa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter((item) => {
    const q = search.toLowerCase();
    const customer = (item.customer ?? "").toLowerCase();
    const noSewa = (item.no_sewa ?? "").toLowerCase();
    const petugas = (item.petugas ?? "").toLowerCase();
    const periode = (item.periode_sewa ?? "").toLowerCase();
    const statusBayar = (item.status_pembayaran ?? "").toLowerCase();
    const statusSewa = (item.status_sewa ?? "").toLowerCase();
    return (
      customer.includes(q) ||
      noSewa.includes(q) ||
      petugas.includes(q) ||
      periode.includes(q) ||
      statusBayar.includes(q) ||
      statusSewa.includes(q)
    );
  });

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const resetForm = () => {
    setTglSewaInput("");
    setTglAkhirInput("");
    setCustomerInput("");
    setJaminanFile(null);
    setJaminanPreview("");
    setItems([{ key: 1, id: null, id_barang: "", harga_sewa_satuan: "", qty: "1" }]);
    setErrors({});
    setIsSubmitting(false);
  };

  const handleOpenAddModal = () => {
    setPrimaryId(null);
    resetForm();
    setModalTitle("Form Tambah Sewa");
    setItems([{ key: 1, id: null, id_barang: "", harga_sewa_satuan: "", qty: "1" }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    resetForm();
    setEditingId(id);

    try {
      const res = await axios.get(`/admin/transaksi/sewa/${id}/edit`);
      if (res.data && res.data.data) {
        const row = res.data.data;
        setTglSewaInput(row.tgl_sewa ?? "");
        setTglAkhirInput(row.tgl_akhir_sewa ?? "");
        setCustomerInput(row.id_customer != null ? String(row.id_customer) : "");
        setJaminanPreview(row.foto_jaminan ? `/assets/jaminan/${row.foto_jaminan}` : "");
        setItems(
          (row.details ?? []).map((d: any, idx: number) => ({
            key: idx + 1,
            id: d.id ?? null,
            id_barang: String(d.id_barang ?? ""),
            harga_sewa_satuan:
              Number(d.harga_sewa_satuan ?? 0) > 0 ? formatInteger(d.harga_sewa_satuan) : "",
            qty: String(d.qty ?? 1),
          }))
        );
        if ((row.details ?? []).length === 0) {
          setItems([
            { key: 1, id: null, id_barang: "", harga_sewa_satuan: "", qty: "1" },
          ]);
        }
        setPrimaryId(id);
        setIsLunas(row.status_pembayaran === "Confirmed");
        setModalTitle(
          row.status_pembayaran === "Confirmed"
            ? "Detail Sewa (Lunas)"
            : "Form Edit Sewa"
        );
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Gagal mengambil detail sewa:", err);
      notifyError("Gagal mengambil data sewa!");
    } finally {
      setEditingId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPrimaryId(null);
    resetForm();
    setIsLunas(false);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: Math.max(0, ...prev.map((i) => i.key)) + 1,
        id: null,
        id_barang: "",
        harga_sewa_satuan: "",
        qty: "1",
      },
    ]);
  };

  const rowError = (index: number, field: string): string => {
    const key = `items.${index}.${field}`;
    return errors[key] && errors[key].length > 0 ? errors[key][0] : "";
  };

  const handleRemoveItem = (key: number) => {
    const index = items.findIndex((row) => row.key === key);

    if (index >= 0) {
      setErrors((prev) => {
        const next: Record<string, string[]> = {};
        Object.keys(prev).forEach((errorKey) => {
          if (!errorKey.startsWith(`items.${index}.`)) {
            next[errorKey] = prev[errorKey];
          }
        });
        return next;
      });
    }

    setItems((prev) =>
      prev.length > 1 ? prev.filter((i) => i.key !== key) : prev
    );
  };

  const handleChangeItem = (
    key: number,
    field: keyof DetailRow,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;

        const next: DetailRow = { ...row, [field]: value };

        if (field === "id_barang") {
          const barang = (barangs ?? []).find(
            (b) => String(b.id) === value
          );
          if (barang && barang.harga_sewa != null) {
            next.harga_sewa_satuan =
              Number(barang.harga_sewa) > 0 ? formatInteger(barang.harga_sewa) : "";
          }
        }

        return next;
      })
    );

    const index = items.findIndex((row) => row.key === key);
    const errorKey = `items.${index}.${field}`;

    if (index >= 0 && errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: [] }));
    }
  };

  const totalBiaya = items.reduce((sum, row) => {
    const harga = parseRupiah(row.harga_sewa_satuan || 0);
    const qty = Number(row.qty || 0);
    return sum + (Number.isNaN(harga) || Number.isNaN(qty) ? 0 : harga * qty);
  }, 0);

  const jumlahHari = hitungJumlahHari(tglSewaInput, tglAkhirInput);
  const totalKeseluruhan = totalBiaya * jumlahHari;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const url = primaryId
      ? `/admin/transaksi/sewa/${primaryId}`
      : "/admin/transaksi/sewa";

    const fd = new FormData();
    fd.append("tgl_sewa", tglSewaInput);
    fd.append("tgl_akhir_sewa", tglAkhirInput);
    fd.append("id_customer", customerInput);
    if (jaminanFile) fd.append("foto_jaminan", jaminanFile);

    items.forEach((row, index) => {
      if (primaryId && row.id) {
        fd.append(`items[${index}][id]`, String(row.id));
      }
      fd.append(`items[${index}][id_barang]`, row.id_barang);
      fd.append(`items[${index}][harga_sewa_satuan]`, row.harga_sewa_satuan.replace(/\D/g, ""));
      fd.append(`items[${index}][qty]`, row.qty);
    });

    if (primaryId) fd.append("_method", "PUT");

    try {
      const response = await axios.post(url, fd);

      if (response.data && response.data.status === "success") {
        handleCloseModal();
        notifySuccess(primaryId ? "Sewa berhasil diupdate!" : "Sewa berhasil ditambahkan!");
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
      message: `Sewa "${label}" akan dihapus secara permanen! Stok barang akan dikembalikan, pembayaran dan pemasukan terkait ikut dihapus.`,
      url: `/admin/transaksi/sewa/${id}`,
      successText: "Sewa telah dihapus.",
      onDeleted: fetchData,
    });
  };

  const handleOpenPaymentModal = async (item: SewaRow) => {
    setPaymentError("");
    setPaymentState({ sewa: null, pembayaran: null });
    setSelectedMetode("qris");
    setIsPaymentModalOpen(true);
    setPaymentLoading(true);

    try {
      const res = await axios.get(`/admin/transaksi/sewa/${item.id}/pembayaran`);
      if (res.data?.status === "success") {
        const { sewa, pembayaran } = res.data.data;
        setPaymentState({ sewa, pembayaran });

        if (pembayaran?.metode_pembayaran) {
          setSelectedMetode(pembayaran.metode_pembayaran as any);
        }

        if (!pembayaran || (pembayaran.metode_pembayaran === "qris" && pembayaran.transaction_status !== "pending" && sewa.status_pembayaran === "Pending")) {
          await handleInitiatePayment(item.id, "qris");
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data pembayaran:", err);
      setPaymentError("Gagal mengambil data pembayaran.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleInitiatePayment = async (sewaId: number, metode: "qris" | "cash" | "transfer") => {
    setPaymentLoading(true);
    setPaymentError("");
    try {
      const res = await axios.post(`/admin/transaksi/sewa/${sewaId}/pembayaran`, {
        metode_pembayaran: metode,
      });
      if (res.data?.status === "success") {
        setPaymentState((prev) => ({
          ...prev,
          pembayaran: res.data.data,
        }));
      } else {
        setPaymentError(res.data?.error || "Gagal memproses metode pembayaran.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Gagal memproses metode pembayaran.";
      setPaymentError(msg);
      notifyError(msg);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSelectMetode = async (metode: "qris" | "cash" | "transfer") => {
    setSelectedMetode(metode);
    if (!paymentState.sewa) return;

    if (paymentState.pembayaran?.metode_pembayaran === metode && paymentState.pembayaran?.transaction_status === "pending") {
      return;
    }

    if (paymentState.sewa.status_pembayaran === "Pending") {
      await handleInitiatePayment(paymentState.sewa.id, metode);
    }
  };

  const handleConfirmManualPayment = async () => {
    if (!paymentState.pembayaran?.id) return;
    setPaymentActionLoading(true);
    setPaymentError("");
    try {
      const res = await axios.post(`/admin/transaksi/pembayaran/${paymentState.pembayaran.id}/confirm`);
      if (res.data?.status === "success") {
        setPaymentState((prev) => ({
          ...prev,
          pembayaran: res.data.data,
          sewa: prev.sewa ? { ...prev.sewa, status_pembayaran: "Confirmed", status_sewa: "Periode Sewa" } : null,
        }));
        notifySuccess("Pembayaran berhasil dikonfirmasi!", "Sewa kini telah confirmed.");
        fetchData();
      } else {
        setPaymentError(res.data?.error || "Gagal mengonfirmasi pembayaran.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Gagal mengonfirmasi pembayaran.";
      setPaymentError(msg);
      notifyError(msg);
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleRefreshPaymentStatus = async () => {
    if (!paymentState.sewa) return;
    setPaymentLoading(true);
    setPaymentError("");
    try {
      const res = await axios.get(`/admin/transaksi/sewa/${paymentState.sewa.id}/pembayaran?refresh=1`);
      if (res.data?.status === "success") {
        const { sewa, pembayaran } = res.data.data;
        setPaymentState({ sewa, pembayaran });

        if (sewa?.status_pembayaran === "Confirmed" || pembayaran?.transaction_status === "settlement") {
          playSound("success");
          fetchData();
        }
      }
    } catch (err) {
      setPaymentError("Gagal memperbarui status.");
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    if (
      isPaymentModalOpen &&
      selectedMetode === "qris" &&
      paymentState.sewa?.status_pembayaran === "Pending" &&
      paymentState.pembayaran?.transaction_status === "pending"
    ) {
      pollingTimerRef.current = setInterval(() => {
        if (!paymentState.sewa?.id) return;
        axios
          .get(`/admin/transaksi/sewa/${paymentState.sewa.id}/pembayaran`)
          .then((res) => {
            if (res.data?.status === "success") {
              const { sewa, pembayaran } = res.data.data;
              const statusBerubah =
                sewa?.status_pembayaran !== paymentState.sewa?.status_pembayaran ||
                pembayaran?.transaction_status !== paymentState.pembayaran?.transaction_status ||
                pembayaran?.id !== paymentState.pembayaran?.id;
              if (statusBerubah) {
                setPaymentState({ sewa, pembayaran });
              }
              if (sewa?.status_pembayaran === "Confirmed" || pembayaran?.transaction_status === "settlement") {
                setPaymentState({ sewa, pembayaran });
                playSound("success");
                fetchData();
              }
            }
          })
          .catch(() => {});
      }, 4000);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [isPaymentModalOpen, selectedMetode, paymentState.sewa?.id, paymentState.sewa?.status_pembayaran, paymentState.pembayaran?.transaction_status, fetchData]);

  const handleClosePaymentModal = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsPaymentModalOpen(false);
    setPaymentState({ sewa: null, pembayaran: null });
    setPaymentError("");
    fetchData();
  };

  const handleOpenReceiptModal = async (sewaId: number) => {
    setIsReceiptModalOpen(true);
    setReceiptLoading(true);
    setReceiptError("");
    setReceiptData(null);
    try {
      const res = await axios.get(`/admin/transaksi/sewa/${sewaId}/struk`);
      if (res.data?.status === "success") {
        setReceiptData(res.data.data);
      } else {
        setReceiptError(res.data?.error || "Gagal memuat data struk.");
      }
    } catch (err: any) {
      setReceiptError(err.response?.data?.error || "Gagal memuat data struk transaksi.");
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleCloseReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setReceiptData(null);
    setReceiptError("");
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    const printContent = document.getElementById("printable-receipt-content");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=520,height=750");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk Transaksi - ${receiptData.sewa?.no_sewa || "SEWA-" + receiptData.sewa?.id} - SkyLens</title>
          <style>
            @page {
              size: auto;
              margin: 3mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #000000;
              background: #ffffff;
              margin: 0;
              padding: 6px;
              font-size: 11px;
              line-height: 1.35;
            }
            .receipt-wrap {
              max-width: 320px;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .text-xs { font-size: 10px; }
            .text-sm { font-size: 12px; }
            .text-base { font-size: 13px; }
            .text-lg { font-size: 15px; }
            .text-gray { color: #333333; }
            .divider-dash {
              border-top: 1px dashed #000000;
              margin: 6px 0;
            }
            .divider-solid {
              border-top: 1.5px solid #000000;
              margin: 6px 0;
            }
            .flex {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0;
            }
            th, td {
              padding: 2px 0;
              text-align: left;
              vertical-align: top;
            }
            .footer-note {
              font-size: 9px;
              color: #333333;
              text-align: center;
              margin-top: 10px;
              line-height: 1.3;
            }
          </style>
        </head>
        <body>
          <div class="receipt-wrap">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "Confirmed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
          <CheckCircleIcon className="size-3" />
          Confirmed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <ClockIcon className="size-3" />
        Pending
      </span>
    );
  };

  const getStatusSewaBadge = (status: string | null) => {
    const nilai = status || "Pending";
    let gaya =
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

    if (nilai === "Pending") {
      gaya = "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    } else if (nilai === "Proses Sewa") {
      gaya = "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    } else if (nilai === "Pengembalian") {
      gaya = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    } else if (nilai.startsWith("Terlambat")) {
      gaya = "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
          gaya
        )}
      >
        {nilai}
      </span>
    );
  };
  const getPaymentStatusBadge = (status: string | null) => {
    if (status === "settlement" || status === "success") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
          <CheckCircleIcon className="size-3.5" />
          Settlement / Lunas
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <ClockIcon className="size-3.5" />
          Menunggu Pembayaran
        </span>
      );
    }
    if (status === "expire" || status === "cancel" || status === "deny") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400">
          <AlertIcon className="size-3.5" />
          {status.toUpperCase()}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {status ?? "Belum Bayar"}
      </span>
    );
  };


  const showActionColumn = permissions?.tambah === 1 || permissions?.edit === 1 || permissions?.hapus === 1;

  return (
    <AppLayout>
      <Head title="Transaksi Sewa - Admin" />
      <PageBreadcrumb parent="Transaksi" pageTitle="Sewa" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Sewa
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola transaksi penyewaan kamera, drone, dan aksesoris beserta pembayarannya.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Sewa</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari..."
          setSearch={setSearch}
          setPerPage={setPerPage}
          setCurrentPage={setCurrentPage}
        />

        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Periode Sewa</th>
                <th className="px-6 py-4 text-right">Total Biaya</th>
                <th className="px-6 py-4">Petugas</th>
                <th className="px-6 py-4 text-center">Status Pembayaran</th>
                <th className="px-6 py-4 text-center">Status Sewa</th>
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
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    {search
                      ? "Tidak ada data yang cocok dengan pencarian."
                      : "Belum ada data sewa."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => {
                  const rowNumber = (currentPage - 1) * perPage + index + 1;
                  const isPending = (row.status_pembayaran ?? "Pending") === "Pending";

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        {rowNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800 dark:text-white/90">
                          {row.customer ?? "-"}
                        </div>
                        <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          {row.no_sewa ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                        {row.periode_sewa ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-800 dark:text-white/90">
                        <Rupiah value={row.total_biaya} />
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{row.petugas ?? "-"}</td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(row.status_pembayaran)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusSewaBadge(row.status_sewa)}
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions?.tambah === 1 && isPending && (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(row)}
                                title="Pembayaran"
                                className="flex size-8 items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors"
                              >
                                <DollarLineIcon className="size-4" />
                              </button>
                            )}

                            {!isPending && (
                              <button
                                type="button"
                                onClick={() => handleOpenReceiptModal(row.id)}
                                title="Cetak Struk"
                                className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors"
                              >
                                <Printer className="size-4" />
                              </button>
                            )}

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

                            {permissions?.hapus === 1 && !isRowLunas(row.status_pembayaran) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    row.id,
                                    `Sewa ${row.customer ?? ""} (#${row.id})`
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
              <div className="sm:col-span-2">
                <Label htmlFor="id_customer">
                  Customer <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="id_customer"
                  options={customerOptions}
                  placeholder="- Pilih customer -"
                  value={customerInput}
                  onChange={(val) => setCustomerInput(val)}
                  disabled={isLunas}
                  error={Boolean(errors.id_customer)}
                />
                <FieldError error={errors.id_customer} />
              </div>

              <div>
                <Label htmlFor="tgl_sewa">
                  Tanggal Sewa <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  id="tgl_sewa"
                  disabled={isLunas}
                  placeholder="Pilih tanggal mulai"
                  defaultDate={tglSewaInput || undefined}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTglSewaInput(dateStr);
                    if (errors.tgl_sewa) {
                      setErrors((prev) => ({ ...prev, tgl_sewa: [] }));
                    }
                  }}
                />
                <FieldError error={errors.tgl_sewa} />
              </div>

              <div>
                <Label htmlFor="tgl_akhir_sewa">
                  Tanggal Akhir Sewa <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  id="tgl_akhir_sewa"
                  disabled={isLunas}
                  placeholder="Pilih tanggal akhir"
                  defaultDate={tglAkhirInput || undefined}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTglAkhirInput(dateStr);
                    if (errors.tgl_akhir_sewa) {
                      setErrors((prev) => ({ ...prev, tgl_akhir_sewa: [] }));
                    }
                  }}
                />
                <FieldError error={errors.tgl_akhir_sewa} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="foto_jaminan">Foto Jaminan (KTP/SIM)</Label>
                <Input
                  id="foto_jaminan"
                  name="foto_jaminan"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setJaminanFile(file);
                    if (file) {
                      setJaminanPreview(URL.createObjectURL(file));
                    }
                  }}
                  error={Boolean(errors.foto_jaminan)}
                  hint={errors.foto_jaminan?.[0]}
                />
                {jaminanPreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={jaminanPreview}
                      alt="Preview foto jaminan"
                      className="h-24 w-32 rounded-lg border border-gray-200 object-cover dark:border-gray-800"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Daftar Barang Sewa
                </h4>
                {!isLunas && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                >
                  <PlusIcon className="size-3.5" />
                  Tambah Barang
                </button>
                )}
              </div>

              <FieldError error={errors.items} className="mt-2" />

              <div className="mt-4 space-y-3">
                {items.map((row, index) => {
                  const subtotal = parseRupiah(row.harga_sewa_satuan || 0) * Number(row.qty || 0);

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
                            onChange={(val) => handleChangeItem(row.key, "id_barang", val)}
                            disabled={isLunas}
                            error={rowError(index, "id_barang") !== ""}
                          />
                          <FieldError error={rowError(index, "id_barang")} />
                        </div>

                        <div className="sm:col-span-3">
                          <Label>Harga / Hari</Label>
                          <RupiahInput
                            id={`item-harga-${row.key}`}
                            placeholder="0"
                            value={row.harga_sewa_satuan}
                            onChange={(v) => handleChangeItem(row.key, "harga_sewa_satuan", v)}
                            disabled={isLunas}
                            error={rowError(index, "harga_sewa_satuan") !== ""}
                          />
                          <FieldError error={rowError(index, "harga_sewa_satuan")} />
                        </div>

                        <div className="sm:col-span-2">
                          <Label>Qty</Label>
                          <Input
                            id={`item-qty-${row.key}`}
                            type="number"
                            min={1}
                            placeholder="1"
                            value={row.qty}
                            onChange={(e) => handleChangeItem(row.key, "qty", e.target.value)}
                            disabled={isLunas}
                          />
                          <FieldError error={rowError(index, "qty")} />
                        </div>

                        <div className="sm:col-span-2 flex justify-end pt-[26px]">
                          {!isLunas && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(row.key)}
                            disabled={items.length === 1}
                            title="Hapus baris"
                            className="flex size-10 items-center justify-center rounded-lg bg-error-50 text-error-600 transition-colors hover:bg-error-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-right text-xs font-semibold text-gray-800 dark:text-white/90">
                        Subtotal per hari: Rp {formatRupiah(Number.isNaN(subtotal) ? 0 : subtotal)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Total biaya dihitung otomatis dari item dan jumlah hari sewa di atas ({jumlahHari} hari).
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-white/90">
                  Rp {formatRupiah(totalKeseluruhan)}
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

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        className="max-w-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
              Pembayaran Sewa
            </h3>
            {paymentState.sewa && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {paymentState.sewa.no_sewa ?? `#${paymentState.sewa.id}`} &bull; {paymentState.sewa.customer}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6 sm:p-8 max-h-[calc(85vh-130px)] overflow-y-auto custom-scrollbar">
          {paymentState.sewa && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal Sewa</p>
                  <p className="font-medium text-gray-800 dark:text-white/90">{paymentState.sewa.tgl_sewa ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal Selesai</p>
                  <p className="font-medium text-gray-800 dark:text-white/90">{paymentState.sewa.tgl_akhir ?? "-"}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Tagihan</p>
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                    <Rupiah value={paymentState.sewa.total_biaya} />
                  </p>
                </div>
              </div>
            </div>
          )}

          {paymentState.sewa?.status_pembayaran === "Confirmed" || paymentState.pembayaran?.transaction_status === "settlement" ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-green-200 bg-green-50/70 p-6 text-center dark:border-green-500/30 dark:bg-green-500/10">
              <CheckCircleIcon className="size-16 text-green-500" />
              <div>
                <h4 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  Pembayaran Berhasil / Lunas
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Metode: <span className="font-semibold uppercase">{paymentState.pembayaran?.metode_pembayaran ?? "-"}</span> &bull; Status Sewa telah Confirmed & dicatat di Pemasukan.
                </p>
                {paymentState.pembayaran?.settlement_time && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Waktu: {paymentState.pembayaran.settlement_time}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Pilih Metode Pembayaran</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectMetode("qris")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all ${
                      selectedMetode === "qris"
                        ? "border-brand-500 bg-brand-50/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 font-semibold shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-sm">QRIS</span>
                    <span className="text-[10px] opacity-75">Scan QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectMetode("cash")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all ${
                      selectedMetode === "cash"
                        ? "border-brand-500 bg-brand-50/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 font-semibold shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-sm">Cash</span>
                    <span className="text-[10px] opacity-75">Tunai</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectMetode("transfer")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all ${
                      selectedMetode === "transfer"
                        ? "border-brand-500 bg-brand-50/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 font-semibold shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-sm">Transfer</span>
                    <span className="text-[10px] opacity-75">Bank Transfer</span>
                  </button>
                </div>
              </div>

              {paymentLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <div className="size-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Memproses metode pembayaran...
                  </p>
                </div>
              )}

              {!paymentLoading && paymentError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  {paymentError}
                </div>
              )}

              {!paymentLoading && selectedMetode === "qris" && paymentState.pembayaran && (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-2">
                    {getPaymentStatusBadge(paymentState.pembayaran.transaction_status)}
                  </div>

                  {paymentState.pembayaran.order_id && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Order ID: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{paymentState.pembayaran.order_id}</span>
                    </p>
                  )}

                  {(paymentState.pembayaran.qr_url || paymentState.pembayaran.qr_string) && paymentState.pembayaran.transaction_status === "pending" && (
                    <div className="flex flex-col items-center gap-2">
                      {paymentState.pembayaran.qr_url && (
                        <div className="rounded-2xl border-4 border-brand-100 bg-white p-3 shadow-sm dark:border-brand-500/20 dark:bg-gray-950">
                          <img
                            src={paymentState.pembayaran.qr_url}
                            alt="QR Code Pembayaran"
                            className="size-52 object-contain"
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Scan QRIS di atas dengan aplikasi e-wallet / mobile banking.
                      </p>
                      {paymentState.pembayaran.expiry_time && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Berlaku hingga: {new Date(paymentState.pembayaran.expiry_time).toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  )}

                  {paymentState.pembayaran.transaction_status !== "pending" && paymentState.sewa?.status_pembayaran === "Pending" && (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        QRIS ini sudah tidak berlaku. Buat QR baru untuk melanjutkan pembayaran.
                      </p>
                      <button
                        type="button"
                        onClick={() => paymentState.sewa && handleInitiatePayment(paymentState.sewa.id, "qris")}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                      >
                        Buat QR Baru
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 w-full pt-2">
                    <button
                      type="button"
                      onClick={handleRefreshPaymentStatus}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-brand-500 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
                    >
                      Cek Status QRIS
                    </button>
                  </div>
                </div>
              )}

              {!paymentLoading && selectedMetode === "cash" && (
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-2 justify-center">
                    {getPaymentStatusBadge(paymentState.pembayaran?.transaction_status ?? "pending")}
                  </div>

                  <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 text-xs text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300">
                    <p className="font-semibold text-sm mb-1">Instruksi Pembayaran Tunai (Cash):</p>
                    <p>
                      Pastikan uang tunai sebesar <strong>Rp {formatRupiah(parseRupiah(paymentState.sewa?.total_biaya ?? 0))}</strong> telah diserahkan oleh pelanggan dan diterima oleh kasir/admin sebelum melakukan konfirmasi.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={paymentActionLoading}
                    onClick={handleConfirmManualPayment}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircleIcon className="size-4" />
                    {paymentActionLoading ? "Memproses..." : "Konfirmasi Uang Diterima"}
                  </button>
                </div>
              )}

              {!paymentLoading && selectedMetode === "transfer" && (
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-2 justify-center">
                    {getPaymentStatusBadge(paymentState.pembayaran?.transaction_status ?? "pending")}
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4 border border-blue-200 text-xs text-blue-900 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300 space-y-1.5">
                    <p className="font-semibold text-sm mb-1">Rekening Tujuan Transfer:</p>
                    <p>Bank: <strong>Bank Central Asia (BCA)</strong></p>
                    <p>No. Rekening: <strong className="font-mono text-sm">8830-1928-3920</strong></p>
                    <p>Atas Nama: <strong>Rental Kamera & Drone</strong></p>
                    <p className="pt-1 text-gray-600 dark:text-gray-400">
                      Total yang harus ditransfer: <strong>Rp {formatRupiah(parseRupiah(paymentState.sewa?.total_biaya ?? 0))}</strong>
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Cek mutasi bank untuk memverifikasi dana transfer telah masuk.
                  </p>

                  <button
                    type="button"
                    disabled={paymentActionLoading}
                    onClick={handleConfirmManualPayment}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircleIcon className="size-4" />
                    {paymentActionLoading ? "Memproses..." : "Verifikasi Transfer Masuk"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleClosePaymentModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Cetak Struk */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={handleCloseReceiptModal}
        className="max-w-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Printer className="size-5 text-gray-800 dark:text-gray-200" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
              Struk Transaksi Sewa
            </h3>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex flex-col gap-6 p-6 sm:p-8 max-h-[calc(85vh-140px)] overflow-y-auto custom-scrollbar">
            {receiptLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
                <div className="size-8 animate-spin rounded-full border-3 border-gray-800 border-t-transparent dark:border-white"></div>
                <span className="text-sm">Memuat struk transaksi...</span>
              </div>
            ) : receiptError ? (
              <div className="rounded-xl border border-gray-300 bg-gray-100 p-4 text-center text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {receiptError}
              </div>
            ) : receiptData ? (
              <>
                {/* Paper Receipt Preview Container (Hitam Putih Murni) */}
                <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-950/60">
                  <div
                    id="printable-receipt-content"
                    className="mx-auto max-w-sm rounded-xl border border-gray-400 bg-white p-6 shadow-sm text-black font-sans dark:border-gray-600 dark:bg-white dark:text-black"
                  >
                    {/* Header Toko */}
                    <div className="text-center pb-1">
                      <h4 className="text-base font-extrabold tracking-tight uppercase text-black">
                        {receiptData.store?.name || "SkyLens"}
                      </h4>
                      <p className="text-xs text-gray-700">
                        {receiptData.store?.address}
                      </p>
                      <p className="text-xs text-gray-700">
                        Telp / WA: {receiptData.store?.phone}
                      </p>
                    </div>

                    <div className="border-t border-dashed border-black my-2.5"></div>

                    {/* Info Transaksi */}
                    <div className="text-xs space-y-1 text-black">
                      <div className="flex justify-between">
                        <span className="text-gray-700">No. Nota:</span>
                        <span className="font-mono font-semibold">
                          {receiptData.sewa?.no_sewa || `#${receiptData.sewa?.id}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Tanggal:</span>
                        <span>{receiptData.sewa?.tgl_sewa ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Penyewa:</span>
                        <span className="font-semibold">{receiptData.sewa?.customer?.nama_lengkap ?? "-"}</span>
                      </div>
                      {receiptData.sewa?.customer?.no_hp && (
                        <div className="flex justify-between">
                          <span className="text-gray-700">No. HP:</span>
                          <span>{receiptData.sewa?.customer?.no_hp}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-700">Kasir/Petugas:</span>
                        <span>{receiptData.sewa?.user?.nama_lengkap || receiptData.sewa?.user?.username || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Periode:</span>
                        <span>
                          {receiptData.sewa?.tgl_sewa} s/d {receiptData.sewa?.tgl_akhir_sewa} ({receiptData.jumlah_hari || 1} Hari)
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-black my-2.5"></div>

                    {/* Daftar Item Sewa */}
                    <table className="w-full text-xs text-black">
                      <thead>
                        <tr className="border-b border-black text-black">
                          <th className="py-1 text-left font-semibold">Item</th>
                          <th className="py-1 text-center w-10 font-semibold">Qty</th>
                          <th className="py-1 text-right font-semibold">Harga/Hari</th>
                          <th className="py-1 text-right font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(receiptData.sewa?.details || []).map((d: any, i: number) => {
                          const itemSubtotal =
                            Number(d.harga_sewa_satuan || 0) *
                            Number(d.qty || 1) *
                            Number(receiptData.jumlah_hari || 1);
                          return (
                            <tr key={i} className="align-top">
                              <td className="py-1.5 pr-1">
                                <p className="font-medium text-black leading-tight">
                                  {d.barang?.nama_barang || "-"}
                                </p>
                                {d.barang?.merk?.nama_merk && (
                                  <span className="text-[10px] text-gray-600">
                                    {d.barang.merk.nama_merk}
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 text-center">{d.qty}</td>
                              <td className="py-1.5 text-right font-mono">
                                {formatRupiah(parseRupiah(d.harga_sewa_satuan || 0))}
                              </td>
                              <td className="py-1.5 text-right font-mono font-semibold">
                                {formatRupiah(itemSubtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="border-t-2 border-black my-2.5"></div>

                    {/* Total & Rincian Pembayaran */}
                    <div className="space-y-1 text-xs text-black">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span>TOTAL BIAYA:</span>
                        <span className="font-mono text-base text-black font-extrabold">
                          Rp {formatRupiah(parseRupiah(receiptData.sewa?.total_biaya || 0))}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-black my-2"></div>

                      <div className="flex justify-between text-gray-800">
                        <span>Metode Bayar:</span>
                        <span className="font-semibold uppercase text-black">
                          {receiptData.pembayaran?.metode_pembayaran || "CASH"}
                        </span>
                      </div>
                      {receiptData.pembayaran?.settlement_time && (
                        <div className="flex justify-between text-gray-800">
                          <span>Waktu Bayar:</span>
                          <span>{new Date(receiptData.pembayaran.settlement_time).toLocaleString("id-ID")}</span>
                        </div>
                      )}
                    </div>

                    {/* Catatan & Footer Struk */}
                    <div className="border-t border-dashed border-black my-2.5"></div>
                    <div className="text-center text-[10px] text-gray-700 space-y-1">
                      <p>{receiptData.store?.note}</p>
                      <p className="font-semibold text-black pt-1">
                        *** Terima Kasih atas Kunjungan Anda ***
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Tombol Aksi Modal */}
          <div className="flex items-center justify-between p-4 sm:px-8 border-t border-gray-200 bg-gray-50/50 rounded-b-2xl dark:border-gray-800 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={handleCloseReceiptModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Tutup
            </button>

            {receiptData && (
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white shadow-theme-xs hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors"
              >
                <Printer className="size-4" />
                <span>Cetak Struk</span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
