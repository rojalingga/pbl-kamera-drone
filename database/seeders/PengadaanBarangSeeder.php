<?php

namespace Database\Seeders;

use App\Models\Barang;
use App\Models\PengadaanBarang;
use App\Models\PengadaanBarangDetail;
use App\Services\RiwayatStokService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PengadaanBarangSeeder extends Seeder
{
    public function run(): void
    {
        $stokService = app(RiwayatStokService::class);

        $batches = [
            [
                'tgl_pengadaan' => '2026-09-05',
                'keterangan' => 'Pengadaan batch 1: Kamera Full-Frame Sony & Canon dari Distributor Resmi',
                'items' => [
                    'Sony Alpha A7 IV Kit 28-70mm' => 5,
                    'Canon EOS R6 Mark II Body Only' => 4,
                    'Sony FX3 Cinema Line' => 3,
                ],
            ],
            [
                'tgl_pengadaan' => '2026-09-12',
                'keterangan' => 'Pengadaan batch 2: Kamera Fujifilm & Drone DJI dari Distributor Resmi',
                'items' => [
                    'Fujifilm X-T5 Kit 16-80mm' => 4,
                    'Sony Alpha A6700 Kit 16-50mm' => 5,
                    'DJI Mini 4 Pro Fly More Combo Plus' => 4,
                    'DJI Air 3 Fly More Combo (DJI RC 2)' => 4,
                    'DJI Mavic 3 Pro Cine Premium Combo' => 3,
                ],
            ],
        ];

        DB::transaction(function () use ($stokService, $batches) {
            foreach ($batches as $batch) {
                // Hindari duplikasi jika sudah pernah di-seed
                $pengadaan = PengadaanBarang::firstOrCreate(
                    [
                        'tgl_pengadaan' => $batch['tgl_pengadaan'],
                        'keterangan' => $batch['keterangan'],
                    ]
                );

                if ($pengadaan->details()->exists()) {
                    continue;
                }

                foreach ($batch['items'] as $namaBarang => $jumlah) {
                    $barang = Barang::where('nama_barang', $namaBarang)->first();
                    if (! $barang) {
                        continue;
                    }

                    $detail = PengadaanBarangDetail::create([
                        'id_pengadaan_barang' => $pengadaan->id,
                        'id_barang' => $barang->id,
                        'jumlah' => $jumlah,
                    ]);

                    $stokService->tambah(
                        $barang->id,
                        $jumlah,
                        RiwayatStokService::MASUK,
                        ['id_pengadaan_barang_detail' => $detail->id]
                    );
                }
            }
        });
    }
}
