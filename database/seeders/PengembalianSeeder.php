<?php

namespace Database\Seeders;

use App\Models\DendaPengembalian;
use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Pembayaran;
use App\Models\Pengembalian;
use App\Models\PengembalianDetail;
use App\Models\Piutang;
use App\Models\Rekening;
use App\Models\Sewa;
use App\Models\User;
use App\Services\NomorDokumenService;
use App\Services\RiwayatSaldoService;
use App\Services\RiwayatStokService;
use App\Services\SupabaseStorageService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class PengembalianSeeder extends Seeder
{
    public function run(): void
    {
        $stokService = app(RiwayatStokService::class);
        $saldoService = app(RiwayatSaldoService::class);
        $nomorService = app(NomorDokumenService::class);

        $admin = User::where('username', 'admin')->first();

        $kategoriDenda = KategoriTransaksi::firstOrCreate(
            ['kategori' => 'Pembayaran Denda', 'jenis' => 'Pemasukan']
        );

        $storage = app(SupabaseStorageService::class);
        $storage->emptyFolder('pengembalian');

        $dummyFoto = 'unit_pengembalian_sample.jpg';
        $dummySumber = public_path('assets/img/1 Kamera.jpg');
        if (File::exists($dummySumber)) {
            $dummyFoto = $storage->upload($dummySumber, 'pengembalian', 'unit_pengembalian_sample.jpg');
        }

        $list = [
            // 1. Sewa 1: Tepat waktu, mulus tanpa denda, status Lunas
            [
                'no_sewa' => 'SW-20261010-001',
                'tgl_pengembalian' => '2026-10-12',
                'keterangan_unit' => 'Kamera Sony A7 IV dikembalikan tepat waktu, kondisi fisik bodi dan lensa mulus lengkap dengan lens cap dan strap.',
                'dendas' => [],
                'status_pembayaran' => 'Lunas',
                'piutang' => null,
                'pembayaran_denda' => null,
            ],
            // 2. Sewa 2: Terlambat 2 hari, denda keterlambatan Rp 200.000 langsung lunas via cash
            [
                'no_sewa' => 'SW-20261014-001',
                'tgl_pengembalian' => '2026-10-19',
                'keterangan_unit' => 'Unit Canon EOS R6 Mark II kembali dalam keadaan baik, terlambat pengembalian 2 hari.',
                'dendas' => [
                    ['jenis_denda' => 'Denda Keterlambatan', 'nominal_denda' => 200_000],
                ],
                'status_pembayaran' => 'Lunas',
                'piutang' => [
                    'nominal' => 200_000,
                    'terbayar' => 200_000,
                    'tgl_pelunasan' => '2026-10-19',
                ],
                'pembayaran_denda' => [
                    'metode' => 'cash',
                    'nominal' => 200_000,
                    'status' => 'settlement',
                    'id_rekening' => RiwayatSaldoService::REKENING_KAS, // 1
                ],
            ],
            // 3. Sewa 4: Terlambat 1 hari + lecet/kerusakan, denda Rp 450.000 Belum Lunas (QRIS pending)
            [
                'no_sewa' => 'SW-20261022-001',
                'tgl_pengembalian' => '2026-10-25',
                'keterangan_unit' => 'Drone DJI Mini 4 Pro terdapat baret pada baling-baling dan terlambat 1 hari. Customer meminta pembayaran denda via QRIS.',
                'dendas' => [
                    ['jenis_denda' => 'Denda Keterlambatan', 'nominal_denda' => 100_000],
                    ['jenis_denda' => 'Denda Kerusakan', 'nominal_denda' => 350_000],
                ],
                'status_pembayaran' => 'Belum Lunas',
                'piutang' => [
                    'nominal' => 450_000,
                    'terbayar' => 0,
                    'tgl_pelunasan' => null,
                ],
                'pembayaran_denda' => [
                    'metode' => 'qris',
                    'nominal' => 450_000,
                    'status' => 'pending',
                    'id_rekening' => null,
                ],
            ],
            // 4. Sewa 5: Tepat waktu tapi kehilangan lens cap, denda Rp 250.000 terbayar sebagian Rp 100.000
            [
                'no_sewa' => 'SW-20261028-001',
                'tgl_pengembalian' => '2026-10-30',
                'keterangan_unit' => 'Kamera Fujifilm X-T5 kembali tepat waktu, namun lens cap depan original hilang. Dikenakan denda kehilangan.',
                'dendas' => [
                    ['jenis_denda' => 'Denda Kehilangan', 'nominal_denda' => 250_000],
                ],
                'status_pembayaran' => 'Belum Lunas',
                'piutang' => [
                    'nominal' => 250_000,
                    'terbayar' => 100_000,
                    'tgl_pelunasan' => null,
                ],
                'pembayaran_denda' => [
                    'metode' => 'cash',
                    'nominal' => 100_000,
                    'status' => 'settlement',
                    'id_rekening' => RiwayatSaldoService::REKENING_KAS, // 1
                ],
            ],
        ];

        DB::transaction(function () use ($stokService, $saldoService, $nomorService, $admin, $kategoriDenda, $dummyFoto, $list) {
            foreach ($list as $item) {
                $sewa = Sewa::with('details')->where('no_sewa', $item['no_sewa'])->first();
                if (! $sewa || $sewa->pengembalians()->exists()) {
                    continue;
                }

                $totalDenda = collect($item['dendas'])->sum('nominal_denda');

                $pengembalian = Pengembalian::create([
                    'id_sewa' => $sewa->id,
                    'tgl_pengembalian' => $item['tgl_pengembalian'],
                    'id_user' => $admin?->id,
                    'total_denda' => $totalDenda,
                    'status_pembayaran' => $item['status_pembayaran'],
                ]);

                // Detail pengembalian & pengembalian stok
                foreach ($sewa->details as $sewaDetail) {
                    $detailPengembalian = PengembalianDetail::create([
                        'id_pengembalian' => $pengembalian->id,
                        'id_sewa_detail' => $sewaDetail->id,
                        'qty_pengembalian' => $sewaDetail->qty,
                        'keterangan' => $item['keterangan_unit'],
                        'foto_unit_pengembalian' => $dummyFoto,
                    ]);

                    // Mutasi stok barang masuk kembali ke gudang
                    $stokService->tambah(
                        $sewaDetail->id_barang,
                        $sewaDetail->qty,
                        RiwayatStokService::MASUK,
                        ['id_pengembalian_detail' => $detailPengembalian->id]
                    );

                    // Catat rincian denda jika ada
                    foreach ($item['dendas'] as $dnd) {
                        DendaPengembalian::create([
                            'id_pengembalian' => $pengembalian->id,
                            'id_sewa_detail' => $sewaDetail->id,
                            'jenis_denda' => $dnd['jenis_denda'],
                            'nominal_denda' => $dnd['nominal_denda'],
                        ]);
                    }
                }

                // Catat piutang jika ada denda
                if ($item['piutang'] && $totalDenda > 0) {
                    Piutang::create([
                        'tgl_piutang' => $item['tgl_pengembalian'],
                        'nominal' => $item['piutang']['nominal'],
                        'id_pengembalian' => $pengembalian->id,
                        'terbayar' => $item['piutang']['terbayar'],
                        'tgl_pelunasan' => $item['piutang']['tgl_pelunasan'],
                    ]);
                }

                // Catat pembayaran & pemasukan denda jika ada
                if ($item['pembayaran_denda']) {
                    $bayarDenda = $item['pembayaran_denda'];
                    $orderId = strtoupper($bayarDenda['metode']).'-DND-'.Carbon::parse($item['tgl_pengembalian'])->format('Ymd').'-'.$pengembalian->id;

                    $pembayaran = Pembayaran::create([
                        'id_sewa' => $sewa->id,
                        'id_pengembalian' => $pengembalian->id,
                        'order_id' => $orderId,
                        'metode_pembayaran' => $bayarDenda['metode'],
                        'payment_type' => $bayarDenda['metode'],
                        'gross_amount' => $totalDenda,
                        'currency' => 'IDR',
                        'transaction_status' => $bayarDenda['status'],
                        'transaction_time' => Carbon::parse($item['tgl_pengembalian'])->setTime(14, 0, 0),
                        'settlement_time' => $bayarDenda['status'] === 'settlement' ? Carbon::parse($item['tgl_pengembalian'])->setTime(14, 10, 0) : null,
                        'qr_url' => $bayarDenda['metode'] === 'qris' ? 'https://api.midtrans.com/v2/qris/dummy-denda/qr-code' : null,
                        'qr_string' => $bayarDenda['metode'] === 'qris' ? '00020101021226680016ID.CO.MIDTRANS0118936005230000000000' : null,
                    ]);

                    // Jika ada dana masuk yang terkonfirmasi (settlement)
                    if ($bayarDenda['status'] === 'settlement' && $bayarDenda['id_rekening'] && $bayarDenda['nominal'] > 0) {
                        $rekening = Rekening::find($bayarDenda['id_rekening']);
                        $noKwitansi = 'KWT-'.Carbon::parse($item['tgl_pengembalian'])->format('Ymd').'-DND-'.str_pad((string) $pembayaran->id, 3, '0', STR_PAD_LEFT);

                        $pemasukan = Pemasukan::create([
                            'tgl_pemasukan' => $item['tgl_pengembalian'],
                            'nominal' => $bayarDenda['nominal'],
                            'id_kategori_transaksi' => $kategoriDenda->id,
                            'id_rekening' => $bayarDenda['id_rekening'],
                            'id_sewa' => $sewa->id,
                            'id_pengembalian' => $pengembalian->id,
                            'id_pembayaran' => $pembayaran->id,
                            'no_kwitansi' => $noKwitansi,
                            'keterangan' => $nomorService->keteranganPembayaranDenda($pengembalian, $rekening, $bayarDenda['nominal'], $item['tgl_pengembalian']),
                        ]);

                        $saldoService->tambah(
                            $bayarDenda['id_rekening'],
                            $bayarDenda['nominal'],
                            RiwayatSaldoService::MASUK,
                            ['id_pemasukan' => $pemasukan->id],
                            $item['tgl_pengembalian']
                        );
                    }
                }
            }
        });
    }
}
