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
        ['kategori' => 'Sewa', 'jenis' => 'Pemasukan', 'stt_fix' => true],
        ['kategori' => 'Pembayaran Denda', 'jenis' => 'Pemasukan', 'stt_fix' => true],
        ['kategori' => 'Pembelian Unit', 'jenis' => 'Pengeluaran', 'stt_fix' => true],
        ['kategori' => 'Perawatan', 'jenis' => 'Pengeluaran', 'stt_fix' => true],
        ['kategori' => 'Operasional', 'jenis' => 'Pengeluaran', 'stt_fix' => false],
        ['kategori' => 'Gaji Karyawan', 'jenis' => 'Pengeluaran', 'stt_fix' => false],
        ['kategori' => 'Sewa Tempat', 'jenis' => 'Pengeluaran', 'stt_fix' => false],
        ['kategori' => 'Listrik & Internet', 'jenis' => 'Pengeluaran', 'stt_fix' => false],
        ['kategori' => 'Lain-lain', 'jenis' => 'Pengeluaran', 'stt_fix' => false],
    ];

    public function run(): void
    {
        foreach ($this->kategori as $row) {
            KategoriTransaksi::updateOrCreate(
                ['kategori' => $row['kategori'], 'jenis' => $row['jenis']],
                ['stt_fix' => $row['stt_fix']]
            );
        }
    }
}
