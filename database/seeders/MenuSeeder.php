<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;

class MenuSeeder extends Seeder
{
    /**
     * Daftar menu sidebar admin CMS.
     * Kolom route_name harus PERSIS sama dengan nama route supaya
     * HakAksesController::getUserPermissions() menemukan menunya, dan
     * kolom lihat/tambah/edit/hapus adalah batas atas izin yang boleh
     * diberikan lewat halaman Hak Akses.
     *
     * Format: [id, id_parent, title, route_name, icon, urutan, lihat, tambah, edit, hapus]
     *
     * @var array<int, array<int, int|string>>
     */
    private array $menus = [
        [1,  0,  'Dashboard',              'dashboard.index',             'fas fa-tachometer-alt', 1,  1, 0, 0, 0],
        [2,  0,  'Master Data',          '#',                           'fas fa-database',       2,  1, 0, 0, 0],
        [3,  2,  'Kategori',             'kategori.index',              'fas fa-tags',           1,  1, 1, 1, 1],
        [4,  2,  'Merk',                 'merk.index',                  'fas fa-copyright',      2,  1, 1, 1, 1],
        [5,  2,  'Barang',               'barang.index',                'fas fa-camera',         3,  1, 1, 1, 1],
        [6,  2,  'Customer',             'customer.index',              'fas fa-user-tag',       4,  1, 1, 1, 1],
        [7,  2,  'Kategori Transaksi',   'kategori-transaksi.index',    'fas fa-exchange',       5,  1, 1, 1, 1],
        [8,  2,  'Rekening',             'rekening.index',              'fas fa-university',     6,  1, 0, 1, 0],
        [9,  0,  'Transaksi',            '#',                           'fas fa-file-invoice',   3,  1, 0, 0, 0],
        [10, 9,  'Penyewaan',            'sewa.index',                  'fas fa-file-signature', 1,  1, 1, 1, 1],
        [11, 9,  'Pengembalian',         'pengembalian.index',          'fas fa-undo',           2,  1, 1, 1, 1],
        [12, 9,  'Perawatan',             'perawatan.index',             'fas fa-tools',          3,  1, 1, 1, 1],
        [13, 9,  'Pembelian Unit',       'pembelian-unit.index',        'fas fa-shopping-cart',  4,  1, 1, 1, 1],
        [14, 0,  'Keuangan',             '#',                           'fas fa-wallet',         4,  1, 0, 0, 0],
        [15, 14, 'Pemasukan',            'pemasukan.index',             'fas fa-arrow-down',     1,  1, 1, 1, 1],
        [16, 14, 'Pengeluaran',          'pengeluaran.index',           'fas fa-arrow-up',       2,  1, 1, 1, 1],
        [17, 14, 'Piutang',              'piutang.index',               'fas fa-hand-holding-usd', 3, 1, 1, 1, 1],
        [18, 0,  'Inventori',            '#',                           'fas fa-boxes',          5,  1, 0, 0, 0],
        [19, 18, 'Riwayat Stok',         'riwayat-stok.index',          'fas fa-history',        1,  1, 1, 0, 1],
        [20, 18, 'Pengadaan Barang',     'pengadaan-barang.index',      'fas fa-box-open',       2,  1, 1, 1, 1],
        [21, 0,  'Laporan',              '#',                           'fas fa-chart-bar',      6,  1, 0, 0, 0],
        [22, 21, 'Laporan Sewa',         'laporan-sewa.index',          'fas fa-file-contract',  1,  1, 0, 0, 0],
        [23, 21, 'Laporan Keuangan',     'laporan-keuangan.index',      'fas fa-chart-pie',      2,  1, 0, 0, 0],
        [24, 21, 'Laporan Piutang',      'laporan-piutang-hutang.index', 'fas fa-balance-scale',  3,  1, 0, 0, 0],
        [25, 0,  'Pengaturan',           '#',                           'fas fa-cog',            7,  1, 0, 0, 0],
        [26, 25, 'Pengguna',             'pengguna.index',              'fas fa-users',          1,  1, 1, 1, 1],
        [27, 25, 'Hak Akses',            'hak-akses.index',             'fas fa-lock',           2,  1, 0, 1, 0],
    ];

    public function run(): void
    {
        $rows = collect($this->menus)->map(fn ($menu) => [
            'id' => $menu[0],
            'id_parent' => $menu[1],
            'title' => $menu[2],
            'route_name' => $menu[3],
            'icon' => $menu[4],
            'urutan' => $menu[5],
            'lihat' => $menu[6],
            'tambah' => $menu[7],
            'edit' => $menu[8],
            'hapus' => $menu[9],
        ])->toArray();

        Menu::upsert($rows, ['id'], [
            'id_parent', 'title', 'route_name', 'icon', 'urutan', 'lihat', 'tambah', 'edit', 'hapus',
        ]);
    }
}
