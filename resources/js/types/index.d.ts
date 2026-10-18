export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    role?: string;
    avatar?: string;
}

export interface MenuItem {
    id: number;
    id_parent: number;
    nama_menu: string;
    url: string;
    icon?: string;
    urutan: number;
    children?: MenuItem[];
}

export interface FlashMessages {
    success?: string;
    error?: string;
    message?: string;
}

export interface Customer {
    id: string;
    nama_lengkap: string;
    no_hp: string;
    cart_count?: number;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    appName: string;
    auth: {
        user: User | null;
        customer: Customer | null;
        menus: MenuItem[];
    };
    flash: FlashMessages;
    errors: Record<string, string>;
};

export interface DashboardStats {
    sewa_aktif: number;
    total_barang: number;
    stok_kritis: number;
    pemasukan_bulan: number;
    pengeluaran_bulan: number;
    piutang_belum: number;
}

export interface Permissions {
    lihat: number;
    tambah: number;
    edit: number;
    hapus: number;
}