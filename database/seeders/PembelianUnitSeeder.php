<?php

namespace Database\Seeders;

use App\Models\Barang;
use App\Models\KategoriTransaksi;
use App\Models\PembelianUnit;
use App\Models\PembelianUnitDetail;
use App\Models\Pengeluaran;
use App\Services\RiwayatSaldoService;
use App\Services\RiwayatStokService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PembelianUnitSeeder extends Seeder
{
    public function run(): void
    {
        $stokService = app(RiwayatStokService::class);
        $saldoService = app(RiwayatSaldoService::class);

        $kategori = KategoriTransaksi::firstOrCreate(
            ['kategori' => 'Pembelian Unit', 'jenis' => 'Pengeluaran']
        );

        $list = [
            // 1. Disetujui (ACC Owner)
            [
                'tanggal' => '2026-10-02',
                'keterangan' => 'Pembelian unit tambahan Sony A7 IV dan DJI Mini 4 Pro via Focus Nusantara',
                'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
                'alasan_penolakan' => null,
                'id_rekening' => 3, // BCA
                'details' => [
                    ['nama_barang' => 'Sony Alpha A7 IV Kit 28-70mm', 'harga_beli' => 23_500_000, 'jumlah' => 1],
                    ['nama_barang' => 'DJI Mini 4 Pro Fly More Combo Plus', 'harga_beli' => 11_500_000, 'jumlah' => 1],
                ],
            ],
            // 2. Pending (Menunggu Persetujuan)
            [
                'tanggal' => Carbon::now()->subDays(2)->toDateString(),
                'keterangan' => 'Pengajuan pembelian 2 unit Canon EOS R6 Mark II untuk antisipasi lonjakan sewa akhir tahun',
                'is_owner_acc' => PembelianUnit::STATUS_PENDING,
                'alasan_penolakan' => null,
                'id_rekening' => null,
                'details' => [
                    ['nama_barang' => 'Canon EOS R6 Mark II Body Only', 'harga_beli' => 27_500_000, 'jumlah' => 2],
                ],
            ],
            // 3. Ditolak Owner
            [
                'tanggal' => '2026-10-20',
                'keterangan' => 'Pengajuan pembelian 1 unit Sony FX3 Cinema Line',
                'is_owner_acc' => PembelianUnit::STATUS_DITOLAK,
                'alasan_penolakan' => 'Anggaran pembelian dialihkan untuk perawatan rutin armada drone dan persiapan event akhir tahun.',
                'id_rekening' => null,
                'details' => [
                    ['nama_barang' => 'Sony FX3 Cinema Line', 'harga_beli' => 46_000_000, 'jumlah' => 1],
                ],
            ],
        ];

        DB::transaction(function () use ($stokService, $saldoService, $kategori, $list) {
            foreach ($list as $item) {
                $pembelian = PembelianUnit::firstOrCreate(
                    [
                        'keterangan' => $item['keterangan'],
                    ],
                    [
                        'tanggal' => $item['tanggal'],
                        'is_owner_acc' => $item['is_owner_acc'],
                        'alasan_penolakan' => $item['alasan_penolakan'],
                    ]
                );

                if ($pembelian->details()->exists()) {
                    continue;
                }

                $total = 0;

                foreach ($item['details'] as $d) {
                    $barang = Barang::where('nama_barang', $d['nama_barang'])->first();
                    if (! $barang) {
                        continue;
                    }

                    $detail = PembelianUnitDetail::create([
                        'id_pembelian_unit' => $pembelian->id,
                        'id_barang' => $barang->id,
                        'harga_beli' => $d['harga_beli'],
                        'jumlah' => $d['jumlah'],
                    ]);

                    $subtotal = (int) ($d['harga_beli'] * $d['jumlah']);
                    $total += $subtotal;

                    // Mutasi stok masuk hanya jika disetujui
                    if ($item['is_owner_acc'] === PembelianUnit::STATUS_DISETUJUI) {
                        $stokService->tambah(
                            $barang->id,
                            $d['jumlah'],
                            RiwayatStokService::MASUK,
                            ['id_pembelian_unit_detail' => $detail->id]
                        );
                    }
                }

                // Catat pengeluaran dan potong saldo hanya jika disetujui
                if ($item['is_owner_acc'] === PembelianUnit::STATUS_DISETUJUI && $item['id_rekening'] && $total > 0) {
                    $pengeluaran = Pengeluaran::create([
                        'tgl_pengeluaran' => $item['tanggal'],
                        'nominal' => $total,
                        'id_kategori_transaksi' => $kategori->id,
                        'id_rekening' => $item['id_rekening'],
                        'keterangan' => 'Pembayaran '.$item['keterangan'],
                        'id_pembelian_unit' => $pembelian->id,
                    ]);

                    $saldoService->kurang(
                        $item['id_rekening'],
                        $total,
                        RiwayatSaldoService::KELUAR,
                        ['id_pengeluaran' => $pengeluaran->id],
                        $item['tanggal']
                    );
                }
            }
        });
    }
}
