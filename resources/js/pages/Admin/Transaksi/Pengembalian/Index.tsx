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
import FieldError, { fieldErrorProps, firstError, hasError } from "@/components/form/FieldError";
import ModalFooter from "@/components/common/ModalFooter";
import TableFilterToolbar from "@/components/common/TableFilterToolbar";
import TablePagination from "@/components/common/TablePagination";
import Rupiah from "@/components/common/Rupiah";
import RupiahInput from '@/components/common/RupiahInput';
import { formatInteger, formatRupiah, parseRupiah } from "@/utils/format";
import { Permissions } from "@/types";
import { confirmDelete } from '@/utils/confirm';
import { playSound } from '@/utils/sound';
import { handleFormError } from "@/utils/form-error";
import { notifyError, notifySuccess } from "@/utils/toast";
import {
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
  DollarLineIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertIcon,
} from "@/icons";

interface CustomerRef {
  id: number;
  nama_lengkap: string;
}

interface SewaOption {
  id: string;
  no_sewa?: string | null;
  customer?: CustomerRef | null;
}

interface UserItem {
  id: number;
  nama_lengkap: string;
}

interface BarangRef {
  id: number;
  nama_barang: string;
  denda_per_hari?: string | number | null;
}

interface SewaDetailRef {
  id: number;
  qty?: string | number | null;
  barang?: BarangRef | null;
}

interface PengembalianRow {
  id: number;
  DT_RowIndex?: number;
  id_sewa: string | null;
  tgl_pengembalian: string | null;
  id_user: number | null;
  total_denda: string | number | null;
  status_pembayaran: string | null;
  sewa?: string;
  petugas?: string;
  jumlah_item?: number;
}

interface ItemRow {
  key: number;
  id: number | null;
  id_sewa_detail: string;
  qty_keluar: string;
  qty_pengembalian: string;
  keterangan: string;
  fotoFile: File | null;
  fotoLama: string;
  detailLabel: string;
}

interface DendaRow {
  key: number;
  id: number | null;
  id_sewa_detail: string;
  jenis_denda: string;
  nominal: string;
  otomatis: boolean;
}

interface DendaPembayaranData {
  id: number;
  id_sewa: string | null;
  id_pengembalian: number | null;
  order_id: string | null;
  transaction_id: string | null;
  payment_type: string | null;
  metode_pembayaran: string | null;
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

interface DendaPaymentState {
  pengembalian: {
    id: number;
    no_sewa?: string | null;
    customer?: string | null;
    tgl_pengembalian: string | null;
    total_denda: string | number | null;
    status_pembayaran: string | null;
  } | null;
  pembayaran: DendaPembayaranData | null;
}

interface IndexProps {
  permissions: Permissions;
  sewas: SewaOption[];
  users: UserItem[];
}

export default function PengembalianIndex({
  permissions,
  sewas,
  users,
}: IndexProps) {
  const [data, setData] = useState<PengembalianRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Tambah Pengembalian");
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [isEditLunas, setIsEditLunas] = useState<boolean>(false);
  const [sewaInput, setSewaInput] = useState<string>("");
  const [tglInput, setTglInput] = useState<string>("");

  const [dendaInput, setDendaInput] = useState<string>("");
  const [dendas, setDendas] = useState<DendaRow[]>([]);
  const dendasRef = useRef<DendaRow[]>([]);
  const dendaKeyRef = useRef<number>(1);
  const [isBayarModalOpen, setIsBayarModalOpen] = useState<boolean>(false);
  const [metodeBayar, setMetodeBayar] = useState<'qris' | 'cash' | 'transfer'>('qris');
  const [bayarState, setBayarState] = useState<DendaPaymentState>({ pengembalian: null, pembayaran: null });
  const [bayarLoading, setBayarLoading] = useState<boolean>(false);
  const [bayarActionLoading, setBayarActionLoading] = useState<boolean>(false);
  const [bayarError, setBayarError] = useState<string>('');
  const bayarTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const itemTarifRef = useRef<Record<string, number>>({});
  const itemsRef = useRef<ItemRow[]>([]);
  const itemSewaRef = useRef<string>("");
  const JENIS_DENDA = ['Denda Keterlambatan', 'Denda Kerusakan', 'Denda Kehilangan'];

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    dendasRef.current = dendas;
  }, [dendas]);

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admin/transaksi/pengembalian", {
        params: { datatable: 1 },
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data pengembalian:", err);
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

    return [item.tgl_pengembalian, item.sewa, item.petugas, item.status_pembayaran].some((value) =>
      (value ?? "").toLowerCase().includes(keyword)
    );
  });

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const sewaOptions = (sewas ?? []).map((row) => ({
    value: String(row.id),
    label: `${row.no_sewa ?? "-"} (${row.customer?.nama_lengkap ?? "-"})`,
  }));

  const hitungHariTerlambat = (tglAkhir: string, tglKembali: string) => {
    if (!tglAkhir || !tglKembali) return 0;
    const akhir = new Date(tglAkhir);
    const kembali = new Date(tglKembali);
    const selisih = Math.floor((kembali - akhir) / 86400000);
    return selisih > 0 ? selisih : 0;
  };

  const loadSewaDetails = useCallback(
    async (sewaId: string, tglKembali: string) => {
      if (!sewaId) {
        setItems([]);
        setDendas([]);
        setDendaInput(String());
        return;
      }
      try {
        const res = await axios.get('/admin/transaksi/sewa/' + sewaId + '/edit');
        const sewa = res.data?.data;
        const details: any[] = sewa?.details ?? [];
        const tglAkhir = sewa?.tgl_akhir_sewa ?? String();
        const terlambat = hitungHariTerlambat(tglAkhir, tglKembali);
        const tarif: Record<string, number> = {};
        const rows: ItemRow[] = details.map((d: any, index: number) => {
          const qty = String(d.qty ?? 1);
          const perHari = Number(d.barang?.denda_per_hari ?? 0);
          tarif[String(d.id)] = perHari;
          return {
            key: index + 1,
            id: null,
            id_sewa_detail: String(d.id),
            qty_keluar: qty,
            qty_pengembalian: qty,
            keterangan: String(),
            fotoFile: null,
            fotoLama: String(),
            detailLabel: d.barang?.nama_barang ?? '-',
          };
        });
        itemTarifRef.current = tarif;
        itemSewaRef.current = String(tglAkhir ?? String());
        setItems(rows);
        const auto: DendaRow[] = [];
        rows.forEach((row) => {
          const perHari = tarif[row.id_sewa_detail] ?? 0;
          const nominal = terlambat > 0 ? perHari * Number(row.qty_pengembalian || 0) * terlambat : 0;
          if (nominal > 0) {
            auto.push({
              key: dendaKeyRef.current++,
              id: null,
              id_sewa_detail: row.id_sewa_detail,
              jenis_denda: 'Denda Keterlambatan',
              nominal: formatInteger(String(nominal)),
              otomatis: true,
            });
          }
        });
        setDendas(auto);
        setDendaInput(hitungTotalDenda(auto));
      } catch (err) {
        console.error('Gagal memuat item sewa:', err);
        setItems([]);
        setDendas([]);
        setDendaInput(String());
      }
    },
    []
  );
  const hariIni = () => {
    const d = new Date();
    const bulan = String(d.getMonth() + 1).padStart(2, "0");
    const hari = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${bulan}-${hari}`;
  };

  const resetForm = () => {
    setSewaInput(String());
    setTglInput(hariIni());
    setDendaInput(String());
    setItems([]);
    setDendas([]);
    dendaKeyRef.current = 1;
    itemsRef.current = [];
    dendasRef.current = [];
    itemTarifRef.current = {};
    itemSewaRef.current = String();
    setErrors({});
    setIsSubmitting(false);
    setIsEditLunas(false);
  };
  const emptyItem = (key: number): ItemRow => ({
    key,
    id: null,
    id_sewa_detail: "",
    qty_keluar: "",
    qty_pengembalian: "1",
    keterangan: "",
    fotoFile: null,
    fotoLama: "",
    detailLabel: "",
  });

  const handleOpenAddModal = () => {
    setPrimaryId(null);
    resetForm();
    setModalTitle("Form Tambah Pengembalian");
    setItems([emptyItem(1)]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (id: number) => {
    resetForm();
    setEditingId(id);
    setPrimaryId(id);
    try {
      const res = await axios.get('/admin/transaksi/pengembalian/' + id + '/edit');
      if (res.data && res.data.data) {
        const row = res.data.data;
        setSewaInput(row.id_sewa != null ? String(row.id_sewa) : String());
        setTglInput(row.tgl_pengembalian ?? String());
        const details = row.details ?? [];
        const tglAkhirEdit = row.sewa?.tgl_akhir_sewa ?? String();
        const tarifEdit: Record<string, number> = {};
        (details as any[]).forEach((d: any) => {
          const sd = (d.sewa_detail ?? d.sewaDetail ?? null) as SewaDetailRef | null;
          tarifEdit[String(d.id_sewa_detail ?? String())] = Number(sd?.barang?.denda_per_hari ?? 0);
        });
        itemTarifRef.current = tarifEdit;
        itemSewaRef.current = String(tglAkhirEdit ?? String());
        setItems(
          details.map((d: any, idx: number) => {
            const sd = (d.sewa_detail ?? d.sewaDetail ?? null) as SewaDetailRef | null;
            const namaBarang = sd?.barang?.nama_barang ?? '-';
            return {
              key: idx + 1,
              id: d.id ?? null,
              id_sewa_detail: String(d.id_sewa_detail ?? String()),
              qty_keluar: String(sd?.qty ?? d.qty_pengembalian ?? 1),
              qty_pengembalian: String(d.qty_pengembalian ?? 1),
              keterangan: d.keterangan ?? String(),
              fotoFile: null,
              fotoLama: d.foto_unit_pengembalian ?? String(),
              detailLabel: namaBarang.slice(0, 80),
            };
          })
        );
        if (details.length === 0) setItems([emptyItem(1)]);
        const tersimpan = row.dendas ?? [];
        setDendas(
          (tersimpan as any[]).map((d: any, idx: number) => ({
            key: idx + 1,
            id: d.id ?? null,
            id_sewa_detail: String(d.id_sewa_detail ?? String()),
            jenis_denda: String(d.jenis_denda ?? 'Denda Kerusakan'),
            nominal: d.nominal_denda != null && String(d.nominal_denda) !== String() ? formatInteger(d.nominal_denda) : String(),
            otomatis: false,
          }))
        );
        dendaKeyRef.current = (tersimpan as any[]).length + 1;
        setDendaInput(row.total_denda != null && String(row.total_denda) !== String() ? String(Math.floor(Number(row.total_denda) || 0)) : String());
        setIsEditLunas(row.status_pembayaran === 'Lunas');
        setModalTitle('Form Edit Pengembalian');
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Gagal mengambil detail pengembalian:', err);
      notifyError('Gagal mengambil data pengembalian!');
    } finally {
      setEditingId(null);
    }
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPrimaryId(null);
    resetForm();
  };


  const handleChangeFileItem = (key: number, file: File | null) => {
    setItems((prev) =>
      prev.map((row) => (row.key === key ? { ...row, fotoFile: file } : row))
    );
  };

  const hitungTotalDenda = useCallback((rows: DendaRow[]) => {
    const total = rows.reduce((sum, row) => sum + Number(String(row.nominal).replace(/[^0-9]/g, String()) || 0), 0);
    return total > 0 ? String(total) : String();
  }, []);

  const segarkanDendaOtomatis = useCallback(
    (daftarItem: ItemRow[], tglKembali: string) => {
      const terlambat = hitungHariTerlambat(itemSewaRef.current, tglKembali);
      const next = dendasRef.current.map((row) => {
        if (!row.otomatis || row.jenis_denda !== 'Denda Keterlambatan') {
          return row;
        }
        const perHari = itemTarifRef.current[row.id_sewa_detail] ?? 0;
        const cari = daftarItem.find((it) => it.id_sewa_detail === row.id_sewa_detail);
        const qty = Number(cari?.qty_pengembalian || 0);
        const nominal = terlambat > 0 ? perHari * qty * terlambat : 0;
        return { ...row, nominal: nominal > 0 ? formatInteger(String(nominal)) : String() };
      });
      setDendas(next);
      setDendaInput(hitungTotalDenda(next));
    },
    [hitungTotalDenda]
  );
  const handleChangeItem = (
    key: number,
    field: 'qty_pengembalian' | 'keterangan',
    value: string
  ) => {
    const next = itemsRef.current.map((row) =>
      row.key === key ? { ...row, [field]: value } : row
    );
    setItems(next);
    segarkanDendaOtomatis(next, tglInput);
  };
  const handleSewaChange = async (val: string) => {
    setSewaInput(val);

    if (errors.id_sewa) {
      setErrors((prev) => ({ ...prev, id_sewa: [] }));
    }

    await loadSewaDetails(val, tglInput || hariIni());
  };

  const itemErrorMessages = Object.entries(errors)
    .filter(([key]) => key.startsWith("details"))
    .map(([, msgs]) => msgs[0])
    .filter((msg, idx, arr) => arr.indexOf(msg) === idx);

  const kelasTombolMetode = (metode: string) =>
    'flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all ' +
    (metodeBayar === metode
      ? 'border-brand-500 bg-brand-50/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 font-semibold shadow-sm'
      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300');
  const dendaItemOptions = items
    .filter((it) => it.id_sewa_detail)
    .map((it) => ({ value: it.id_sewa_detail, label: it.detailLabel || it.id_sewa_detail }));

  const tambahDenda = () => {
    setDendas((prev) => [
      ...prev,
      {
        key: dendaKeyRef.current++,
        id: null,
        id_sewa_detail: String(),
        jenis_denda: String(),
        nominal: String(),
        otomatis: false,
      },
    ]);
  };

  const hapusDenda = (key: number) => {
    const sisa = dendasRef.current.filter((row) => row.key !== key);
    setDendas(sisa);
    setDendaInput(hitungTotalDenda(sisa));
    setErrors((prev) => {
      const next: Record<string, string[]> = {};
      Object.keys(prev).forEach((k) => {
        if (!k.startsWith('dendas.')) {
          next[k] = prev[k];
        }
      });
      return next;
    });
  };

  const ubahDenda = (
    key: number,
    field: 'id_sewa_detail' | 'jenis_denda' | 'nominal',
    value: string
  ) => {
    const next = dendasRef.current.map((row) =>
      row.key === key ? { ...row, [field]: value, otomatis: false } : row
    );
    setDendas(next);
    setDendaInput(hitungTotalDenda(next));
    const idx = dendasRef.current.findIndex((row) => row.key === key);
    const namaKolom = field === 'nominal' ? 'nominal_denda' : field;
    const kunci = idx >= 0 ? 'dendas.' + idx + '.' + namaKolom : String();
    if (kunci && errors[kunci]) {
      setErrors((prev) => ({ ...prev, [kunci]: [] }));
    }
  };

  const dendaErrorMessages = Object.entries(errors)
    .filter(([key]) => key.startsWith('dendas'))
    .map(([, msgs]) => msgs[0])
    .filter((msg, idx, arr) => arr.indexOf(msg) === idx);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    const url = primaryId
      ? '/admin/transaksi/pengembalian/' + primaryId
      : '/admin/transaksi/pengembalian';
    const fd = new FormData();
    if (!primaryId) fd.append('id_sewa', sewaInput);
    fd.append('tgl_pengembalian', tglInput);
    const totalDenda = dendas.reduce((sum, row) => sum + Number(String(row.nominal).replace(/[^0-9]/g, String()) || 0), 0);
    fd.append('total_denda', String(totalDenda));
    items.forEach((row, index) => {
      if (primaryId && row.id) {
        fd.append('details[' + index + '][id]', String(row.id));
      }
      fd.append('details[' + index + '][id_sewa_detail]', row.id_sewa_detail);
      fd.append('details[' + index + '][qty_pengembalian]', row.qty_pengembalian);
      if (row.keterangan) {
        fd.append('details[' + index + '][keterangan]', row.keterangan);
      }
      if (row.fotoFile) {
        fd.append('details[' + index + '][foto_unit]', row.fotoFile);
      }
    });
    dendas.forEach((row, index) => {
      if (primaryId && row.id) {
        fd.append('dendas[' + index + '][id]', String(row.id));
      }
      fd.append('dendas[' + index + '][id_sewa_detail]', row.id_sewa_detail);
      fd.append('dendas[' + index + '][jenis_denda]', row.jenis_denda);
      fd.append('dendas[' + index + '][nominal_denda]', String(row.nominal).replace(/[^0-9]/g, String()) || '0');
    });
    if (primaryId) fd.append('_method', 'PUT');
    try {
      const response = await axios.post(url, fd);
      if (response.data && response.data.status === 'success') {
        handleCloseModal();
        notifySuccess(primaryId ? 'Pengembalian berhasil diupdate!' : 'Pengembalian berhasil ditambahkan!');
        fetchData();
      }
    } catch (err: any) {
      handleFormError(err, setErrors, { businessError: true, includeMessage: true });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleOpenBayarModal = async (item: PengembalianRow) => {
    setBayarError(String());
    setBayarState({ pengembalian: null, pembayaran: null });
    setIsBayarModalOpen(true);
    setBayarLoading(true);
    setMetodeBayar('qris');
    try {
      const res = await axios.get('/admin/transaksi/pengembalian/' + item.id + '/pembayaran');
      if (res.data?.status === 'success') {
        const { pengembalian, pembayaran } = res.data.data;
        setBayarState({ pengembalian, pembayaran });
        if (pembayaran?.metode_pembayaran) {
          setMetodeBayar(pembayaran.metode_pembayaran as any);
        }
        if (!pembayaran) {
          await handleInitiateDendaPayment(item.id, 'qris');
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data pembayaran denda:', err);
      setBayarError('Gagal mengambil data pembayaran.');
    } finally {
      setBayarLoading(false);
    }
  };

  const handleInitiateDendaPayment = async (id: number, metode: string) => {
    setBayarLoading(true);
    setBayarError('');
    try {
      const res = await axios.post('/admin/transaksi/pengembalian/' + id + '/pembayaran', {
        metode_pembayaran: metode,
      });
      if (res.data?.status === 'success') {
        setBayarState((prev) => ({ ...prev, pembayaran: res.data.data }));
      } else {
        setBayarError(res.data?.error || 'Gagal memproses metode pembayaran.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Gagal memproses metode pembayaran.';
      setBayarError(msg);
      notifyError(msg);
    } finally {
      setBayarLoading(false);
    }
  };

  const handleSelectMetodeBayar = async (metode: string) => {
    setMetodeBayar(metode);
    if (!bayarState.pengembalian) return;
    if (bayarState.pembayaran?.metode_pembayaran === metode && bayarState.pembayaran?.transaction_status === 'pending') {
      return;
    }
    if (bayarState.pengembalian.status_pembayaran !== 'Lunas') {
      await handleInitiateDendaPayment(bayarState.pengembalian.id, metode);
    }
  };

  const handleConfirmDendaPayment = async () => {
    if (!bayarState.pembayaran?.id) return;
    setBayarActionLoading(true);
    setBayarError('');
    try {
      const res = await axios.post('/admin/transaksi/pembayaran/' + bayarState.pembayaran.id + '/confirm');
      if (res.data?.status === 'success') {
        setBayarState((prev) => ({
          ...prev,
          pembayaran: res.data.data,
          pengembalian: prev.pengembalian ? { ...prev.pengembalian, status_pembayaran: 'Lunas' } : null,
        }));
        playSound('success');
        notifySuccess('Pembayaran denda berhasil dikonfirmasi!', 'Denda kini telah lunas.');
        fetchData();
      } else {
        setBayarError(res.data?.error || 'Gagal mengonfirmasi pembayaran.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Gagal mengonfirmasi pembayaran.';
      setBayarError(msg);
      notifyError(msg);
    } finally {
      setBayarActionLoading(false);
    }
  };

  const handleRefreshDendaStatus = async () => {
    if (!bayarState.pengembalian) return;
    setBayarLoading(true);
    setBayarError('');
    try {
      const res = await axios.get('/admin/transaksi/pengembalian/' + bayarState.pengembalian.id + '/pembayaran?refresh=1');
      if (res.data?.status === 'success') {
        const { pengembalian, pembayaran } = res.data.data;
        setBayarState({ pengembalian, pembayaran });
        if (pengembalian?.status_pembayaran === 'Lunas' || pembayaran?.transaction_status === 'settlement') {
          playSound('success');
          fetchData();
        }
      }
    } catch (err) {
      setBayarError('Gagal memperbarui status.');
    } finally {
      setBayarLoading(false);
    }
  };

  const handleCloseBayarModal = () => {
    if (bayarTimerRef.current) {
      clearInterval(bayarTimerRef.current);
      bayarTimerRef.current = null;
    }
    setIsBayarModalOpen(false);
    setBayarState({ pengembalian: null, pembayaran: null });
    setBayarError('');
    fetchData();
  };

  useEffect(() => {
    if (
      isBayarModalOpen &&
      metodeBayar === 'qris' &&
      bayarState.pengembalian?.status_pembayaran !== 'Lunas' &&
      bayarState.pembayaran?.transaction_status === 'pending'
    ) {
      bayarTimerRef.current = setInterval(() => {
        if (!bayarState.pengembalian?.id) return;
        axios
          .get('/admin/transaksi/pengembalian/' + bayarState.pengembalian.id + '/pembayaran')
          .then((res) => {
            if (res.data?.status === 'success') {
              const { pengembalian, pembayaran } = res.data.data;
              const berubah =
                pengembalian?.status_pembayaran !== bayarState.pengembalian?.status_pembayaran ||
                pembayaran?.transaction_status !== bayarState.pembayaran?.transaction_status ||
                pembayaran?.id !== bayarState.pembayaran?.id;
              if (berubah) {
                setBayarState({ pengembalian, pembayaran });
              }
              if (pengembalian?.status_pembayaran === 'Lunas' || pembayaran?.transaction_status === 'settlement') {
                setBayarState({ pengembalian, pembayaran });
                playSound('success');
                fetchData();
              }
            }
          })
          .catch(() => {});
      }, 4000);
    }
    return () => {
      if (bayarTimerRef.current) {
        clearInterval(bayarTimerRef.current);
        bayarTimerRef.current = null;
      }
    };
  }, [isBayarModalOpen, metodeBayar, bayarState.pengembalian?.id, bayarState.pengembalian?.status_pembayaran, bayarState.pembayaran?.transaction_status, fetchData]);

  const handleDelete = (id: number, label: string) => {
    confirmDelete({
      message: `Pengembalian "${label}" akan dihapus permanen! Stok akan disesuaikan dan piutang denda ikut dihapus.`,
      url: `/admin/transaksi/pengembalian/${id}`,
      successText: "Pengembalian telah dihapus.",
      onDeleted: fetchData,
    });
  };

  const getPaymentStatusBadge = (status: string | null) => {
    if (status === 'settlement' || status === 'success') {
      return (
        <span className='inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'>
          <CheckCircleIcon className='size-3.5' />
          Settlement / Lunas
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'>
          <ClockIcon className='size-3.5' />
          Menunggu Pembayaran
        </span>
      );
    }
    if (status === 'expire' || status === 'cancel' || status === 'deny') {
      return (
        <span className='inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700'>
          <AlertIcon className='size-3.5' />
          {status.toUpperCase()}
        </span>
      );
    }
    return (
      <span className='inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700'>
        {status ?? 'Belum Bayar'}
      </span>
    );
  };

  const showActionColumn = permissions?.edit === 1 || permissions?.hapus === 1;
  return (
    <AppLayout>
      <Head title="Transaksi Pengembalian - Admin" />
      <PageBreadcrumb parent="Transaksi" pageTitle="Pengembalian" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Pengembalian
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Proses pengembalian unit, denda, dan penyesuaian stok otomatis.
            </p>
          </div>

          {permissions?.tambah === 1 && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors focus:outline-none"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Pengembalian</span>
            </button>
          )}
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari tanggal, sewa, status..."
          setSearch={setSearch}
          setPerPage={setPerPage}
          setCurrentPage={setCurrentPage}
        />

        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Tgl Kembali</th>
                <th className="px-6 py-4">Sewa</th>
                <th className="px-6 py-4">Petugas</th>
                <th className="px-6 py-4 text-center">Item</th>
                <th className="px-6 py-4 text-right">Denda</th>
                <th className='px-6 py-4 text-center'>Status Bayar</th>
                {showActionColumn && (
                  <th className="px-6 py-4 w-36 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={showActionColumn ? 9 : 8}
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
                    colSpan={showActionColumn ? 9 : 8}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {search
                      ? "Tidak ditemukan pengembalian yang sesuai pencarian."
                      : "Belum ada data pengembalian."}
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
                        {item.tgl_pengembalian}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">
                        {item.sewa ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.petugas ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                        {item.jumlah_item ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-white/90">
                        <Rupiah value={item.total_denda} />
                      </td>
                      <td className='px-6 py-4 text-center'>
                        {item.status_pembayaran === 'Lunas' ? (
                          <span className='inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700'>
                            Lunas
                          </span>
                        ) : (
                          <span className='inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700'>
                            {item.status_pembayaran ?? 'Belum Lunas'}
                          </span>
                        )}
                      </td>
                      {showActionColumn && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                                                        {permissions?.tambah === 1 && parseRupiah(item.total_denda ?? 0) > 0 && item.status_pembayaran !== 'Lunas' && (
                              <button
                                type='button'
                                onClick={() => handleOpenBayarModal(item)}
                                title='Bayar Denda'
                                className='flex size-8 items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20'
                             >
                                <DollarLineIcon className='size-4' />
                              </button>
                            )}

{permissions?.edit === 1 && (
                              <button
                                onClick={() => handleOpenEditModal(item.id)}
                                disabled={editingId === item.id}
                                title="Edit Pengembalian"
                                className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 disabled:opacity-50 disabled:cursor-wait transition-colors"
                              >
                                {editingId === item.id ? (
                                  <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
                                ) : (
                                  <PencilIcon className="size-4" />
                                )}
                              </button>
                            )}
                            {permissions?.hapus === 1 && item.status_pembayaran !== 'Lunas' && (
                              <button
                                onClick={() =>
                                  handleDelete(
                                    item.id,
                                    `${item.tgl_pengembalian} - ${
                                      item.sewa ?? "-"
                                    }`
                                  )
                                }
                                title="Hapus Pengembalian"
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
            {isEditLunas && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400">
                Pembayaran sudah lunas. Hanya keterangan dan foto unit yang dapat diubah.
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tgl_pengembalian">
                  Tanggal Pengembalian <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  id="tgl_pengembalian"
                  placeholder="Pilih tanggal"
                  defaultDate={tglInput || undefined}
                  disabled={isEditLunas}
                  onChange={(_dates: Date[], dateStr: string) => {
                    setTglInput(dateStr);
                    segarkanDendaOtomatis(itemsRef.current, dateStr);
                    if (errors.tgl_pengembalian) {
                      setErrors((prev) => ({ ...prev, tgl_pengembalian: [] }));
                    }
                  }}
                />
                <FieldError error={errors.tgl_pengembalian} />
              </div>


              <div className="space-y-2">
                <Label htmlFor="id_sewa">
                  Sewa <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="id_sewa"
                  options={sewaOptions}
                  placeholder="- Pilih sewa -"
                  value={sewaInput}
                  onChange={handleSewaChange}
                  disabled={Boolean(primaryId)}
                  error={hasError(errors, "id_sewa")}
                  hint={
                    firstError(errors, "id_sewa") ||
                    (primaryId ? "Sewa tidak dapat diubah." : "")
                  }
                />
              </div>


              <div className="space-y-2">
                <Label htmlFor="total_denda">Total Denda</Label>
                <div className="relative">
                  <Input
                    id="total_denda"
                    type="text"
                    value={dendaInput ? formatRupiah(dendaInput) : ""}
                    placeholder="Dihitung otomatis dari sewa"
                    readOnly
                    className="bg-gray-50 ps-14 dark:bg-gray-800/60"
                    {...fieldErrorProps(errors, "total_denda")}
                  />
                  <span className="absolute start-0 top-0 flex h-11 items-center border-e border-gray-200 px-3.5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    Rp.
                  </span>
                </div>
              </div>

            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Item Pengembalian <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Item mengikuti data sewa, tidak dapat ditambah atau dihapus.
                </p>
              </div>

              {!sewaInput && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pilih sewa terlebih dahulu untuk memuat daftar item yang
                  dapat dikembalikan.
                </p>
              )}

              {itemErrorMessages.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  <ul className="list-inside list-disc space-y-1">
                    {itemErrorMessages.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="max-h-[28rem] overflow-y-auto custom-scrollbar">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">#</th>
                        <th className="px-4 py-3 w-52">Item Sewa</th>
                        <th className="px-4 py-3 w-24 text-center">Qty Keluar</th>
                        <th className="px-4 py-3 w-24 text-center">Qty Masuk</th>
                        <th className="px-4 py-3">Keterangan</th>
                        <th className="px-4 py-3 w-40">Foto Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {items.map((row, index) => (
                        <tr key={row.key}>
                          <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              id={`item-detail-${row.key}`}
                              type="text"
                              readOnly
                              value={row.detailLabel}
                              className="bg-gray-50 dark:bg-gray-800/60"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              id={`item-qty-keluar-${row.key}`}
                              type="number"
                              value={row.qty_keluar}
                              readOnly
                              className="bg-gray-50 text-center dark:bg-gray-800/60"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              id={`item-qty-${row.key}`}
                              name={`details[${index}][qty_pengembalian]`}
                              type="number"
                              min="1"
                              readOnly={isEditLunas}
                              className={isEditLunas ? "bg-gray-50 text-center dark:bg-gray-800/60" : "text-center"}
                              value={row.qty_pengembalian}
                              onChange={(e) =>
                                handleChangeItem(
                                  row.key,
                                  "qty_pengembalian",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              id={`item-keterangan-${row.key}`}
                              name={`details[${index}][keterangan]`}
                              type="text"
                              placeholder="Opsional"
                              value={row.keterangan}
                              onChange={(e) =>
                                handleChangeItem(
                                  row.key,
                                  "keterangan",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            {row.fotoLama && !row.fotoFile && (
                              <p className="mb-1 truncate text-[11px] text-gray-500 dark:text-gray-400">
                                <a
                                  href={`/assets/pengembalian/${row.fotoLama}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-500 underline"
                                >
                                  Lihat foto
                                </a>
                              </p>
                            )}
                            <input
                              id={`item-foto-${row.key}`}
                              name={`details[${index}][foto_unit]`}
                              type="file"
                              accept=".jpeg,.jpg,.png,.webp"
                              onChange={(e) =>
                                handleChangeFileItem(
                                  row.key,
                                  e.target.files?.[0] ?? null
                                )
                              }
                              className="block w-full cursor-pointer rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label>
                  Denda Pengembalian
                </Label>
                {!isEditLunas && (
                <button
                  type='button'
                  onClick={tambahDenda}
                  className='inline-flex items-center gap-1 rounded-lg border border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100'
                >
                  <PlusIcon className='size-3.5' />
                  Tambah Denda
                </button>
                )}
              </div>
              <p className='text-xs text-gray-500'>
                {isEditLunas
                  ? 'Pembayaran sudah lunas, data denda tidak dapat diubah.'
                  : 'Denda keterlambatan terisi otomatis bila ada. Baris denda dapat ditambah atau dihapus.'}
              </p>
              {dendaErrorMessages.length > 0 && (
                <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600'>
                  <ul className='list-inside list-disc space-y-1'>
                    {dendaErrorMessages.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
              {dendas.length === 0 ? (
                <p className='rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-xs text-gray-500'>
                  Belum ada denda. Pilih sewa untuk menghitung otomatis atau tekan Tambah Denda.
                </p>
              ) : (
                <div className='space-y-3'>
                  {dendas.map((row, index) => (
                    <div
                      key={row.key}
                      className='rounded-xl border border-gray-200 p-4 dark:border-gray-800'
                    >
                      <div className='grid items-start gap-4 sm:grid-cols-12'>
                        <div className='sm:col-span-5'>
                          <Label>Item</Label>
                          <Select
                            id={'denda-item-' + row.key}
                            options={dendaItemOptions}
                            placeholder='- Pilih item -'
                            value={row.id_sewa_detail}
                            disabled={isEditLunas}
                            onChange={(val) => ubahDenda(row.key, 'id_sewa_detail', val)}
                            error={hasError(errors, 'dendas.' + index + '.id_sewa_detail')}
                            hint={firstError(errors, 'dendas.' + index + '.id_sewa_detail')}
                          />
                        </div>
                        <div className='sm:col-span-4'>
                          <Label>Jenis Denda</Label>
                          <Select
                            id={'denda-jenis-' + row.key}
                            options={JENIS_DENDA.map((j) => ({ value: j, label: j }))}
                            placeholder='- Pilih jenis -'
                            value={row.jenis_denda}
                            disabled={isEditLunas}
                            onChange={(val) => ubahDenda(row.key, 'jenis_denda', val)}
                            error={hasError(errors, 'dendas.' + index + '.jenis_denda')}
                            hint={firstError(errors, 'dendas.' + index + '.jenis_denda')}
                          />
                        </div>
                        <div className='sm:col-span-2'>
                          <Label>Nominal</Label>
                          <RupiahInput
                            id={'denda-nominal-' + row.key}
                            value={row.nominal}
                            disabled={isEditLunas}
                            onChange={(val) => ubahDenda(row.key, 'nominal', val)}
                            placeholder='Contoh: 50.000'
                            error={hasError(errors, 'dendas.' + index + '.nominal_denda')}
                            hint={firstError(errors, 'dendas.' + index + '.nominal_denda')}
                          />
                        </div>
                        {!isEditLunas && (
                        <div className='sm:col-span-1 flex justify-end pt-[26px]'>
                          <button
                            type='button'
                            onClick={() => hapusDenda(row.key)}
                            title='Hapus denda'
                            className='flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100'
                          >
                            <TrashBinIcon className='size-4' />
                          </button>
                        </div>
                        )}
                      </div>
                    </div>
                  ))}
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
      <Modal
        isOpen={isBayarModalOpen}
        onClose={handleCloseBayarModal}
        className='max-w-xl'>
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800'>
          <div>
            <h3 className='text-lg font-bold text-gray-800'>
              Pembayaran Denda
            </h3>
            {bayarState.pengembalian && (
              <p className='mt-0.5 text-sm text-gray-500'>
                {bayarState.pengembalian.no_sewa ?? '-'} &bull; {bayarState.pengembalian.customer}
              </p>
            )}
          </div>
        </div>
        <div className='flex flex-col gap-5 p-6 max-h-[calc(85vh-130px)] overflow-y-auto'>
          {bayarState.pengembalian && (
            <div className='rounded-xl border border-gray-200 bg-gray-50 p-4'>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div>
                  <p className='text-xs text-gray-500'>Tanggal Kembali</p>
                  <p className='font-medium text-gray-800'>{bayarState.pengembalian.tgl_pengembalian ?? '-'}</p>
                </div>
                <div>
                  <p className='text-xs text-gray-500'>Customer</p>
                  <p className='font-medium text-gray-800'>{bayarState.pengembalian.customer ?? '-'}</p>
                </div>
                <div className='col-span-2 pt-2 border-t border-gray-200'>
                  <p className='text-xs text-gray-500'>Total Denda</p>
                  <p className='text-2xl font-bold text-brand-600'>
                    <Rupiah value={bayarState.pengembalian.total_denda} />
                  </p>
                </div>
              </div>
            </div>
          )}
          {bayarState.pengembalian?.status_pembayaran === 'Lunas' || bayarState.pembayaran?.transaction_status === 'settlement' ? (
            <div className='flex flex-col items-center gap-3 rounded-2xl border border-green-200 bg-green-50/70 p-6 text-center dark:border-green-500/30 dark:bg-green-500/10'>
              <CheckCircleIcon className='size-16 text-green-500' />
              <div>
                <h4 className='text-lg font-bold text-gray-800 dark:text-white/90'>
                  Pembayaran Berhasil / Lunas
                </h4>
                <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                  Metode: <span className='font-semibold uppercase'>{bayarState.pembayaran?.metode_pembayaran ?? '-'}</span> &bull; Denda telah lunas & dicatat di Pemasukan.
                </p>
                {bayarState.pembayaran?.settlement_time && (
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                    Waktu: {bayarState.pembayaran.settlement_time}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div>
                <Label>Pilih Metode Pembayaran</Label>
                <div className='grid grid-cols-3 gap-2 mt-1'>
                  <button
                    type='button' onClick={() => handleSelectMetodeBayar('qris')} className={kelasTombolMetode('qris')}>
                    <span className='text-sm'>QRIS</span>
                    <span className='text-[10px] opacity-75'>Scan QR</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => handleSelectMetodeBayar('cash')}
                    className={kelasTombolMetode('cash')}
                  >
                    <span className='text-sm'>Cash</span>
                    <span className='text-[10px] opacity-75'>Tunai</span>
                  </button>

                  <button
                    type='button'
                    onClick={() => handleSelectMetodeBayar('transfer')}
                    className={kelasTombolMetode('transfer')}
                  >
                    <span className='text-sm'>Transfer</span>
                    <span className='text-[10px] opacity-75'>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {bayarLoading && (
                <div className='flex flex-col items-center justify-center gap-3 py-8'>
                  <div className='size-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent'></div>
                  <p className='text-sm text-gray-500'>
                    Memproses metode pembayaran...
                  </p>
                </div>
              )}

              {!bayarLoading && bayarError && (
                <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600'>
                  {bayarError}
                </div>
              )}
              {!bayarLoading && metodeBayar === 'qris' && bayarState.pembayaran && (
                <div className='flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-5'>
                  <div className='flex items-center gap-2'>
                    {getPaymentStatusBadge(bayarState.pembayaran.transaction_status)}
                  </div>
                  {bayarState.pembayaran.order_id && (
                    <p className='text-xs text-gray-500'>
                      Order ID: ' '
                      <span className='font-mono font-medium text-gray-700'>{bayarState.pembayaran.order_id}</span>
                    </p>
                  )}
                  {(bayarState.pembayaran.qr_url || bayarState.pembayaran.qr_string) && bayarState.pembayaran.transaction_status === 'pending' && (
                    <div className='flex flex-col items-center gap-2'>
                      {bayarState.pembayaran.qr_url && (
                        <div className='rounded-2xl border-4 border-brand-100 bg-white p-3 shadow-sm'>
                          <img
                            src={bayarState.pembayaran.qr_url}
                            alt='QR Code Pembayaran'
                            className='size-52 object-contain' />
                        </div>
                      )}
                      <p className='text-xs text-gray-500 text-center'>
                        Scan QRIS di atas dengan aplikasi e-wallet / mobile banking.
                      </p>
                    </div>
                  )}
                  {bayarState.pembayaran.transaction_status !== 'pending' && bayarState.pengembalian?.status_pembayaran !== 'Lunas' && (
                    <div className='flex flex-col items-center gap-3 text-center'>
                      <p className='text-sm text-gray-600'>
                        QRIS ini sudah tidak berlaku. Buat QR baru untuk melanjutkan pembayaran.
                      </p>
                      <button
                        type='button'
                        onClick={() => bayarState.pengembalian && handleInitiateDendaPayment(bayarState.pengembalian.id, 'qris')}
                        className='inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors'>
                        Buat QR Baru
                      </button>
                    </div>
                  )}
                  <div className='flex items-center gap-2 w-full pt-2'>
                    <button
                      type='button'
                      onClick={handleRefreshDendaStatus}
                      className='flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-brand-500 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors'>
                      Cek Status QRIS
                    </button>
                  </div>
                </div>
              )}
              {!bayarLoading && metodeBayar === 'cash' && (
                <div className='flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5'>
                  <div className='flex items-center gap-2 justify-center'>
                    {getPaymentStatusBadge(bayarState.pembayaran?.transaction_status ?? 'pending')}
                  </div>
                  <div className='rounded-lg bg-amber-50 p-4 border border-amber-200 text-xs text-amber-800'>
                    <p className='font-semibold text-sm mb-1'>Instruksi Pembayaran Tunai (Cash):</p>
                    <p>
                      Pastikan uang tunai telah diserahkan oleh pelanggan dan diterima oleh kasir/admin sebelum melakukan konfirmasi.
                    </p>
                  </div>
                  <button
                    type='button'
                    disabled={bayarActionLoading}
                    onClick={handleConfirmDendaPayment}
                    className='w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors'>
                    <CheckCircleIcon className='size-4' />
                    {bayarActionLoading ? 'Memproses...' : 'Konfirmasi Uang Diterima'}
                  </button>
                </div>
              )}
              {!bayarLoading && metodeBayar === 'transfer' && (
                <div className='flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5'>
                  <div className='flex items-center gap-2 justify-center'>
                    {getPaymentStatusBadge(bayarState.pembayaran?.transaction_status ?? 'pending')}
                  </div>
                  <div className='rounded-lg bg-blue-50 p-4 border border-blue-200 text-xs text-blue-900 space-y-1.5'>
                    <p className='font-semibold text-sm mb-1'>Rekening Tujuan Transfer:</p>
                    <p>Bank: <strong>Bank Central Asia (BCA)</strong></p>
                    <p>No. Rekening: <strong className='font-mono text-sm'>8830-1928-3920</strong></p>
                    <p>Atas Nama: <strong>Rental Kamera dan Drone</strong></p>
                  </div>
                  <p className='text-xs text-gray-500 text-center'>
                    Cek mutasi bank untuk memverifikasi dana transfer telah masuk.
                  </p>
                  <button
                    type='button'
                    disabled={bayarActionLoading}
                    onClick={handleConfirmDendaPayment}
                    className='w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors'>
                    <CheckCircleIcon className='size-4' />
                    {bayarActionLoading ? 'Memproses...' : 'Verifikasi Transfer Masuk'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className='flex justify-end pt-2 border-t border-gray-200'>
            <button
              type='button'
              onClick={handleCloseBayarModal}
              className='inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors'>
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
