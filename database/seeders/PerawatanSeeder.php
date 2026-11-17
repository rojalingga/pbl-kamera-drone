<?php

namespace Database\Seeders;

use App\Models\Barang;
use App\Models\KategoriTransaksi;
use App\Models\Pengeluaran;
use App\Models\Perawatan;
use App\Models\PerawatanDetail;
use App\Models\User;
use App\Services\RiwayatSaldoService;
use App\Services\RiwayatStokService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PerawatanSeeder extends Seeder
{
    public function run(): void
    {
        $stokService = app(RiwayatStokService::class);
        $saldoService = app(RiwayatSaldoService::class);

        $teknisi1 = User::where('username', 'teknisi1')->first();
        $teknisi2 = User::where('username', 'teknisi2')->first();

        $kategoriPerawatan = KategoriTransaksi::firstOrCreate(
            ['kategori' => 'Perawatan', 'jenis' => 'Pengeluaran']
        );

        $list = [
            // 1. Disetujui & Sedang Berjalan (Unit sedang dirawat -> stok gudang berkurang)
            [
                'tgl_perawatan' => Carbon::now()->subDays(3)->toDateString(),
                'id_user' => $teknisi1?->id,
                'is_owner_acc' => Perawatan::STATUS_DISETUJUI,
                'status_pembayaran' => Perawatan::BAYAR_BELUM_LUNAS,
                'no_kwitansi' => null,
                'alasan_penolakan' => null,
                'id_rekening' => null,
                'details' => [
                    [
                        'nama_barang' => 'DJI Mavic 3 Pro Cine Premium Combo',
                        'qty' => 1,
                        'biaya_perawatan' => 450_000,
                        'status' => PerawatanDetail::STATUS_PERAWATAN,
                        'keterangan' => 'Pembersihan motor gimbal dan kalibrasi sensor obstacle pasca event outdoor',
                    ],
                ],
            ],
            // 2. Disetujui & Selesai & Lunas (Unit kembali ke stok & ada catatan pengeluaran)
            [
                'tgl_perawatan' => '2026-10-15',
                'id_user' => $teknisi2?->id,
                'is_owner_acc' => Perawatan::STATUS_DISETUJUI,
                'status_pembayaran' => Perawatan::BAYAR_LUNAS,
                'no_kwitansi' => 'PRT-20261015-001',
                'alasan_penolakan' => null,
                'id_rekening' => 1, // Kas Kantor
                'details' => [
                    [
                        'nama_barang' => 'Sony Alpha A7 IV Kit 28-70mm',
                        'qty' => 1,
                        'biaya_perawatan' => 650_000,
                        'status' => PerawatanDetail::STATUS_SELESAI,
                        'keterangan' => 'Deep cleaning sensor, peremajaan karet grip bodi, dan kalibrasi lensa 28-70mm',
                    ],
                ],
            ],
            // 3. Pending (Menunggu Persetujuan Owner)
            [
                'tgl_perawatan' => Carbon::now()->subDays(1)->toDateString(),
                'id_user' => $teknisi1?->id,
                'is_owner_acc' => Perawatan::STATUS_PENDING,
                'status_pembayaran' => Perawatan::BAYAR_BELUM_LUNAS,
                'no_kwitansi' => null,
                'alasan_penolakan' => null,
                'id_rekening' => null,
                'details' => [
                    [
                        'nama_barang' => 'Fujifilm X-T5 Kit 16-80mm',
                        'qty' => 1,
                        'biaya_perawatan' => 300_000,
                        'status' => PerawatanDetail::STATUS_PERAWATAN,
                        'keterangan' => 'Pembersihan debu optik internal dan kalibrasi focus ring',
                    ],
                ],
            ],
            // 4. Ditolak Owner
            [
                'tgl_perawatan' => '2026-10-25',
                'id_user' => $teknisi2?->id,
                'is_owner_acc' => Perawatan::STATUS_DITOLAK,
                'status_pembayaran' => Perawatan::BAYAR_BELUM_LUNAS,
                'no_kwitansi' => null,
                'alasan_penolakan' => 'Estimasi biaya penggantian modul terlalu tinggi, disarankan klaim garansi resmi DJI terlebih dahulu.',
                'id_rekening' => null,
                'details' => [
                    [
                        'nama_barang' => 'DJI Air 3 Fly More Combo (DJI RC 2)',
                        'qty' => 1,
                        'biaya_perawatan' => 1_500_000,
                        'status' => PerawatanDetail::STATUS_PERAWATAN,
                        'keterangan' => 'Perbaikan rotor arm drone yang retak pasca benturan ranting pohon',
                    ],
                ],
            ],
        ];

        DB::transaction(function () use ($stokService, $saldoService, $kategoriPerawatan, $list) {
            foreach ($list as $item) {
                $totalBiaya = collect($item['details'])->sum('biaya_perawatan');

                $perawatan = Perawatan::create([
                    'tgl_perawatan' => $item['tgl_perawatan'],
                    'id_user' => $item['id_user'],
                    'total_biaya_perawatan' => $totalBiaya,
                    'status_pembayaran' => $item['status_pembayaran'],
                    'no_kwitansi' => $item['no_kwitansi'],
                    'is_owner_acc' => $item['is_owner_acc'],
                    'alasan_penolakan' => $item['alasan_penolakan'],
                ]);

                foreach ($item['details'] as $d) {
                    $barang = Barang::where('nama_barang', $d['nama_barang'])->first();
                    if (! $barang) {
                        continue;
                    }

                    $detail = PerawatanDetail::create([
                        'id_perawatan' => $perawatan->id,
                        'id_barang' => $barang->id,
                        'qty' => $d['qty'],
                        'biaya_perawatan' => $d['biaya_perawatan'],
                        'status' => $d['status'],
                        'keterangan' => $d['keterangan'],
                    ]);

                    // Mutasi stok hanya jika disetujui owner
                    if ($item['is_owner_acc'] === Perawatan::STATUS_DISETUJUI) {
                        if ($d['status'] === PerawatanDetail::STATUS_PERAWATAN) {
                            // Barang keluar untuk diservis
                            $stokService->kurang(
                                $barang->id,
                                $d['qty'],
                                RiwayatStokService::KELUAR,
                                ['id_perawatan_detail' => $detail->id]
                            );
                        } elseif ($d['status'] === PerawatanDetail::STATUS_SELESAI) {
                            // Barang keluar dulu lalu kembali masuk saat selesai
                            $stokService->kurang(
                                $barang->id,
                                $d['qty'],
                                RiwayatStokService::KELUAR,
                                ['id_perawatan_detail' => $detail->id]
                            );
                            $stokService->tambah(
                                $barang->id,
                                $d['qty'],
                                RiwayatStokService::MASUK,
                                ['id_perawatan_detail' => $detail->id]
                            );
                        }
                    }
                }

                // Jika sudah lunas, catat pengeluaran dan potong saldo rekening
                if ($item['is_owner_acc'] === Perawatan::STATUS_DISETUJUI
                    && $item['status_pembayaran'] === Perawatan::BAYAR_LUNAS
                    && $item['id_rekening']
                    && $totalBiaya > 0) {
                    $pengeluaran = Pengeluaran::create([
                        'tgl_pengeluaran' => $item['tgl_perawatan'],
                        'nominal' => $totalBiaya,
                        'id_kategori_transaksi' => $kategoriPerawatan->id,
                        'id_rekening' => $item['id_rekening'],
                        'id_perawatan' => $perawatan->id,
                        'lampiran' => $item['no_kwitansi'],
                        'keterangan' => 'Pembayaran Perawatan #'.($item['no_kwitansi'] ?? $perawatan->id),
                    ]);

                    $saldoService->kurang(
                        $item['id_rekening'],
                        $totalBiaya,
                        RiwayatSaldoService::KELUAR,
                        ['id_pengeluaran' => $pengeluaran->id],
                        $item['tgl_perawatan']
                    );
                }
            }
        });
    }
}
