<?php

namespace Database\Seeders;

use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Rekening;
use App\Services\RiwayatSaldoService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SaldoAwalSeeder extends Seeder
{
    public function run(): void
    {
        $saldoService = app(RiwayatSaldoService::class);

        $kategori = KategoriTransaksi::firstOrCreate(
            ['kategori' => 'Modal Usaha', 'jenis' => 'Pemasukan']
        );

        $tgl = '2026-09-01';

        $modalAwal = [
            1 => ['nominal' => 25_000_000],
            2 => ['nominal' => 10_000_000],
            3 => ['nominal' => 100_000_000],
        ];

        DB::transaction(function () use ($saldoService, $kategori, $tgl, $modalAwal) {
            foreach ($modalAwal as $idRekening => $info) {
                $rekening = Rekening::find($idRekening);
                if (! $rekening) {
                    continue;
                }

                $sudahAda = Pemasukan::where('id_rekening', $idRekening)
                    ->where('id_kategori_transaksi', $kategori->id)
                    ->exists();

                if ($sudahAda) {
                    continue;
                }

                $pemasukan = Pemasukan::create([
                    'tgl_pemasukan' => $tgl,
                    'nominal' => $info['nominal'],
                    'id_kategori_transaksi' => $kategori->id,
                    'id_rekening' => $idRekening,
                    'no_kwitansi' => 'KWT-20260901-00'.$idRekening,
                    'keterangan' => 'Setoran modal awal operasional rekening '.$rekening->nama_rek,
                ]);

                $saldoService->tambah(
                    $idRekening,
                    $info['nominal'],
                    RiwayatSaldoService::MASUK,
                    ['id_pemasukan' => $pemasukan->id],
                    $tgl
                );
            }
        });
    }
}
