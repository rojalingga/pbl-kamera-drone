<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\Role;
use App\Models\RoleUser;
use Illuminate\Database\Seeder;

class RoleUserSeeder extends Seeder
{
    /**
     * Template izin per role, ditulis dengan route_name menu (bukan id) supaya
     * tetap benar walaupun id menu berubah.
     *
     * Kunci pada matriks:
     * - halaman  -> route_name menu, mis. "kategori.index"
     * - grup     -> judul menu yang route_name-nya "#", mis. "Laporan"
     *
     * Nilai: [lihat, tambah, edit, hapus]. Menu yang tidak disebut otomatis 0
     * (tidak ada akses sama sekali), termasuk grup yang tidak disebutkan.
     *
     * @var array<string, array<string, array<int, int>>>
     */
    private array $matriks = [
        'Admin' => [
            'dashboard.index' => [1, 1, 1, 1],
            'kategori.index' => [1, 1, 1, 1],
            'merk.index' => [1, 1, 1, 1],
            'barang.index' => [1, 1, 1, 1],
            'customer.index' => [1, 1, 1, 1],
            'kategori-transaksi.index' => [1, 1, 1, 1],
            'rekening.index' => [1, 0, 1, 0],
            'sewa.index' => [1, 1, 1, 1],
            'pengembalian.index' => [1, 1, 1, 1],
            'perawatan.index' => [1, 1, 1, 1],
            'pembelian-unit.index' => [1, 1, 1, 1],
            'pemasukan.index' => [1, 1, 1, 1],
            'pengeluaran.index' => [1, 1, 1, 1],
            'piutang.index' => [1, 1, 1, 1],
            'riwayat-stok.index' => [1, 1, 0, 1],
            'pengadaan-barang.index' => [1, 1, 1, 1],
            'pengguna.index' => [1, 1, 1, 1],
            'hak-akses.index' => [1, 0, 1, 0],

            'laporan-sewa.index' => [0, 0, 0, 0],
            'laporan-keuangan.index' => [0, 0, 0, 0],
            'laporan-piutang-hutang.index' => [0, 0, 0, 0],

            'Master Data' => [1, 0, 0, 0],
            'Transaksi' => [1, 0, 0, 0],
            'Keuangan' => [1, 0, 0, 0],
            'Inventori' => [1, 0, 0, 0],
            'Pengaturan' => [1, 0, 0, 0],
            'Laporan' => [0, 0, 0, 0],
        ],
        'Owner' => [
            'dashboard.index' => [1, 1, 1, 1],
            'kategori.index' => [1, 1, 1, 1],
            'merk.index' => [1, 1, 1, 1],
            'barang.index' => [1, 1, 1, 1],
            'customer.index' => [1, 1, 1, 1],
            'kategori-transaksi.index' => [1, 1, 1, 1],
            'rekening.index' => [1, 1, 1, 1],
            'sewa.index' => [1, 1, 1, 1],
            'pengembalian.index' => [1, 1, 1, 1],
            'perawatan.index' => [1, 1, 1, 1],
            'pembelian-unit.index' => [1, 1, 1, 1],
            'pemasukan.index' => [1, 1, 1, 1],
            'pengeluaran.index' => [1, 1, 1, 1],
            'piutang.index' => [1, 1, 1, 1],
            'riwayat-stok.index' => [1, 1, 1, 1],
            'pengadaan-barang.index' => [1, 1, 1, 1],
            'laporan-sewa.index' => [1, 1, 1, 1],
            'laporan-keuangan.index' => [1, 1, 1, 1],
            'laporan-piutang-hutang.index' => [1, 1, 1, 1],
            'pengguna.index' => [1, 1, 1, 1],
            'hak-akses.index' => [1, 1, 1, 1],

            'Master Data' => [1, 0, 0, 0],
            'Transaksi' => [1, 0, 0, 0],
            'Keuangan' => [1, 0, 0, 0],
            'Inventori' => [1, 0, 0, 0],
            'Laporan' => [1, 0, 0, 0],
            'Pengaturan' => [1, 0, 0, 0],
        ],
        'Teknisi' => [
            'perawatan.index' => [1, 1, 1, 1],

            'Transaksi' => [1, 0, 0, 0],
        ],
    ];

    public function run(): void
    {
        $menus = Menu::all();

        foreach (Role::all() as $role) {
            $izin = $this->matriks[$role->role] ?? null;

            if ($izin === null) {
                continue;
            }

            foreach ($menus as $menu) {
                $kunci = $menu->route_name === '#' ? $menu->title : $menu->route_name;

                $flag = $izin[$kunci] ?? [0, 0, 0, 0];

                RoleUser::upsert(
                    [
                        'id_role' => $role->id,
                        'id_menu' => $menu->id,
                        'lihat' => $flag[0],
                        'tambah' => $flag[1],
                        'edit' => $flag[2],
                        'hapus' => $flag[3],
                    ],
                    ['id_role', 'id_menu'],
                    ['lihat', 'tambah', 'edit', 'hapus']
                );
            }
        }
    }
}
