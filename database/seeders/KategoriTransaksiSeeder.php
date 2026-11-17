<?php

namespace Database\Seeders;

use App\Models\KategoriTransaksi;
use Illuminate\Database\Seeder;

class KategoriTransaksiSeeder extends Seeder
{
    /**
     * Kategori bawaan yang dipakai kode aplikasi dan form keuangan.
     *
     * - `Sewa` & `Pembayaran Denda` dicari eksplisit oleh PembayaranService.
     * - `Pembelian Unit` & `Perawatan` dipakai sebagai kategori pengeluaran
     *   otomatis untuk transaksi pembelian unit dan pembayaran perawatan.
     * - Sisanya kategori operasional agar dropdown Pengeluaran tidak kosong.
     *
     * @var array<int, array{kategori: string, jenis: string}>
     */
    private array $kategori = [
        ['kategori' => 'Sewa', 'jenis' => 'Pemasukan'],
        ['kategori' => 'Pembayaran Denda', 'jenis' => 'Pemasukan'],
        ['kategori' => 'Pembelian Unit', 'jenis' => 'Pengeluaran'],
        ['kategori' => 'Perawatan', 'jenis' => 'Pengeluaran'],
        ['kategori' => 'Operasional', 'jenis' => 'Pengeluaran'],
        ['kategori' => 'Gaji Karyawan', 'jenis' => 'Pengeluaran'],
        ['kategori' => 'Sewa Tempat', 'jenis' => 'Pengeluaran'],
        ['kategori' => 'Listrik & Internet', 'jenis' => 'Pengeluaran'],
        ['kategori' => 'Lain-lain', 'jenis' => 'Pengeluaran'],
    ];

    public function run(): void
    {
        foreach ($this->kategori as $row) {
            KategoriTransaksi::firstOrCreate($row);
        }
    }
}
