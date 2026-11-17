<?php
namespace Database\Seeders;

use App\Models\Barang;
use App\Models\FotoBarang;
use App\Models\Kategori;
use App\Models\Merk;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class BarangSeeder extends Seeder
{
    public function run(): void
    {
        $kategoriKamera = Kategori::firstOrCreate(['kategori' => 'Kamera']);
        $kategoriDrone  = Kategori::firstOrCreate(['kategori' => 'Drone']);

        $merkSony  = Merk::firstOrCreate(['merk' => 'Sony']);
        $merkCanon = Merk::firstOrCreate(['merk' => 'Canon']);
        $merkFuji  = Merk::firstOrCreate(['merk' => 'Fujifilm']);
        $merkDji   = Merk::firstOrCreate(['merk' => 'DJI']);

        $targetDir = public_path('assets/barang');
        if (! File::isDirectory($targetDir)) {
            File::makeDirectory($targetDir, 0755, true);
        }

        $items = [
            // 5 Kamera
            [
                'nama_barang'    => 'Sony Alpha A7 IV Kit 28-70mm',
                'id_merk'        => $merkSony->id,
                'id_kategori'    => $kategoriKamera->id,
                'stok'           => 0,
                'keterangan'     => 'Kamera hybrid 33MP full-frame dengan kemampuan perekaman 4K 60p.',
                'harga_sewa'     => 350000,
                'denda_per_hari' => 100000,
                'foto_sumber'    => [
                    'contoh_foto/barang/kamera/kamera-1-a.jpg',
                    'contoh_foto/barang/kamera/kamera-1-b.jpg',
                ],
            ],
            [
                'nama_barang'    => 'Canon EOS R6 Mark II Body Only',
                'id_merk'        => $merkCanon->id,
                'id_kategori'    => $kategoriKamera->id,
                'stok'           => 0,
                'keterangan'     => 'Sensor CMOS 24.2MP full-frame, burst shooting hingga 40 fps.',
                'harga_sewa'     => 320000,
                'denda_per_hari' => 100000,
                'foto_sumber'    => [
                    'contoh_foto/barang/kamera/kamera-2-a.jpg',
                    'contoh_foto/barang/kamera/kamera-2-b.jpg',
                ],
            ],
            [
                'nama_barang'    => 'Sony FX3 Cinema Line',
                'id_merk'        => $merkSony->id,
                'id_kategori'    => $kategoriKamera->id,
                'stok'           => 0,
                'keterangan'     => 'Kamera cinema ringkas full-frame dengan S-Cinetone dan pendingin kipas internal.',
                'harga_sewa'     => 550000,
                'denda_per_hari' => 150000,
                'foto_sumber'    => [
                    'contoh_foto/barang/kamera/kamera-3-a.jpg',
                    'contoh_foto/barang/kamera/kamera-3-b.jpg',
                ],
            ],
            [
                'nama_barang'    => 'Fujifilm X-T5 Kit 16-80mm',
                'id_merk'        => $merkFuji->id,
                'id_kategori'    => $kategoriKamera->id,
                'stok'           => 0,
                'keterangan'     => 'Sensor 40.2MP X-Trans CMOS 5 HR dengan simulasi film klasik legendaris.',
                'harga_sewa'     => 250000,
                'denda_per_hari' => 75000,
                'foto_sumber'    => [
                    'contoh_foto/barang/kamera/kamera-4-a.jpg',
                    'contoh_foto/barang/kamera/kamera-4-b.jpg',
                ],
            ],
            [
                'nama_barang'    => 'Sony Alpha A6700 Kit 16-50mm',
                'id_merk'        => $merkSony->id,
                'id_kategori'    => $kategoriKamera->id,
                'stok'           => 0,
                'keterangan'     => 'Sensor APS-C 26MP dengan autofokus berbasis kecerdasan buatan (AI).',
                'harga_sewa'     => 200000,
                'denda_per_hari' => 60000,
                'foto_sumber'    => [
                    'contoh_foto/barang/kamera/kamera-5-a.jpg',
                    'contoh_foto/barang/kamera/kamera-5-b.jpg',
                ],
            ],
            // 3 Drone
            [
                'nama_barang'    => 'DJI Mini 4 Pro Fly More Combo Plus',
                'id_merk'        => $merkDji->id,
                'id_kategori'    => $kategoriDrone->id,
                'stok'           => 0,
                'keterangan'     => 'Drone ringan di bawah 249g dengan sensor rintangan segala arah dan video HDR 4K/60fps.',
                'harga_sewa'     => 300000,
                'denda_per_hari' => 100000,
                'foto_sumber'    => [
                    'contoh_foto/barang/drone/drone-1-a.jpg',
                    'contoh_foto/barang/drone/drone-1-b.jpg',
                ],
            ],
            [
                'nama_barang'    => 'DJI Air 3 Fly More Combo (DJI RC 2)',
                'id_merk'        => $merkDji->id,
                'id_kategori'    => $kategoriDrone->id,
                'stok'           => 0,
                'keterangan'     => 'Sistem kamera ganda primer (wide + 3x telephoto) dengan daya tahan terbang hingga 46 menit.',
                'harga_sewa'     => 450000,
                'denda_per_hari' => 120000,
                'foto_sumber'    => [
                    'contoh_foto/barang/drone/drone-2-a.jpg',
                    'contoh_foto/barang/drone/drone-2-b.jpg',
                ],
            ],
            [
                'nama_barang'    => 'DJI Mavic 3 Pro Cine Premium Combo',
                'id_merk'        => $merkDji->id,
                'id_kategori'    => $kategoriDrone->id,
                'stok'           => 0,
                'keterangan'     => 'Sistem tiga kamera optik Hasselblad dengan dukungan Apple ProRes 422 HQ.',
                'harga_sewa'     => 750000,
                'denda_per_hari' => 200000,
                'foto_sumber'    => [
                    'contoh_foto/barang/drone/drone-3-a.jpg',
                    'contoh_foto/barang/drone/drone-3-b.jpg',
                ],
            ],
        ];

        foreach ($items as $item) {
            $barang = Barang::firstOrCreate(
                ['nama_barang' => $item['nama_barang']],
                [
                    'id_merk'        => $item['id_merk'],
                    'id_kategori'    => $item['id_kategori'],
                    'stok'           => $item['stok'],
                    'keterangan'     => $item['keterangan'],
                    'harga_sewa'     => $item['harga_sewa'],
                    'denda_per_hari' => $item['denda_per_hari'],
                ]
            );

            // Jika foto barang belum ada, generate dari foto sumber
            if ($barang->fotos()->count() === 0) {
                foreach ($item['foto_sumber'] as $pathSumber) {
                    $sumberLengkap = public_path($pathSumber);
                    if (File::exists($sumberLengkap)) {
                        $ext           = pathinfo($sumberLengkap, PATHINFO_EXTENSION) ?: 'jpg';
                        $namaAcak      = Str::random(25) . '.' . $ext;
                        $tujuanLengkap = $targetDir . '/' . $namaAcak;

                        File::copy($sumberLengkap, $tujuanLengkap);

                        FotoBarang::create([
                            'id_barang' => $barang->id,
                            'foto'      => $namaAcak,
                        ]);
                    }
                }
            }
        }
    }
}
