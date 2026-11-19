<?php

namespace Database\Seeders;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Pembayaran;
use App\Models\Rekening;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Models\User;
use App\Services\NomorDokumenService;
use App\Services\RiwayatSaldoService;
use App\Services\RiwayatStokService;
use App\Services\SupabaseStorageService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class SewaSeeder extends Seeder
{
    public function run(): void
    {
        $stokService = app(RiwayatStokService::class);
        $saldoService = app(RiwayatSaldoService::class);
        $nomorService = app(NomorDokumenService::class);

        $admin = User::where('username', 'admin')->first();

        $kategoriSewa = KategoriTransaksi::firstOrCreate(
            ['kategori' => 'Sewa', 'jenis' => 'Pemasukan']
        );

        $storage = app(SupabaseStorageService::class);
        $storage->emptyFolder('jaminan');

        $dummyJaminan = 'jaminan_ktp_sample.jpg';
        $dummySumber = public_path('assets/img/1 Drone.jpg');
        if (File::exists($dummySumber)) {
            $dummyJaminan = $storage->upload($dummySumber, 'jaminan', 'jaminan_ktp_sample.jpg');
        }

        $list = [
            // 1. Manual Admin: Tepat waktu (akan dikembalikan di PengembalianSeeder)
            [
                'no_sewa' => 'SW-20261010-001',
                'customer_nama' => 'Budi Santoso',
                'asal_pesanan' => Sewa::ASAL_ADMIN,
                'is_admin' => true,
                'tgl_sewa' => '2026-10-10',
                'tgl_akhir_sewa' => '2026-10-12',
                'metode_pembayaran' => 'cash',
                'id_rekening' => RiwayatSaldoService::REKENING_KAS, // 1
                'items' => [
                    ['nama_barang' => 'Sony Alpha A7 IV Kit 28-70mm', 'qty' => 1],
                ],
            ],
            // 2. Manual Admin: Terlambat & Denda Lunas (akan dikembalikan di PengembalianSeeder)
            [
                'no_sewa' => 'SW-20261014-001',
                'customer_nama' => 'Siti Aminah',
                'asal_pesanan' => Sewa::ASAL_ADMIN,
                'is_admin' => true,
                'tgl_sewa' => '2026-10-14',
                'tgl_akhir_sewa' => '2026-10-17',
                'metode_pembayaran' => 'transfer',
                'id_rekening' => RiwayatSaldoService::REKENING_BCA, // 3
                'items' => [
                    ['nama_barang' => 'Canon EOS R6 Mark II Body Only', 'qty' => 1],
                ],
            ],
            // 3. Manual Admin: SEDANG BERJALAN AKTIF (Status sewa: "Proses Sewa")
            [
                'no_sewa' => 'SW-'.Carbon::now()->subDays(1)->format('Ymd').'-001',
                'customer_nama' => 'Rizky Pratama',
                'asal_pesanan' => Sewa::ASAL_ADMIN,
                'is_admin' => true,
                'tgl_sewa' => Carbon::now()->subDays(1)->toDateString(),
                'tgl_akhir_sewa' => Carbon::now()->addDays(2)->toDateString(),
                'metode_pembayaran' => 'cash',
                'id_rekening' => RiwayatSaldoService::REKENING_KAS, // 1
                'items' => [
                    ['nama_barang' => 'Sony Alpha A6700 Kit 16-50mm', 'qty' => 1],
                ],
            ],
            // 4. Public Web: Denda Kerusakan Belum Lunas (akan dikembalikan di PengembalianSeeder)
            [
                'no_sewa' => 'SW-20261022-001',
                'customer_nama' => 'Dewi Lestari',
                'asal_pesanan' => Sewa::ASAL_WEB,
                'is_admin' => false,
                'tgl_sewa' => '2026-10-22',
                'tgl_akhir_sewa' => '2026-10-24',
                'metode_pembayaran' => 'qris',
                'id_rekening' => RiwayatSaldoService::REKENING_QRIS, // 2
                'items' => [
                    ['nama_barang' => 'DJI Mini 4 Pro Fly More Combo Plus', 'qty' => 1],
                ],
            ],
            // 5. Public Web: Denda Kehilangan Parsial (akan dikembalikan di PengembalianSeeder)
            [
                'no_sewa' => 'SW-20261028-001',
                'customer_nama' => 'Ahmad Fauzi',
                'asal_pesanan' => Sewa::ASAL_WEB,
                'is_admin' => false,
                'tgl_sewa' => '2026-10-28',
                'tgl_akhir_sewa' => '2026-10-30',
                'metode_pembayaran' => 'qris',
                'id_rekening' => RiwayatSaldoService::REKENING_QRIS, // 2
                'items' => [
                    ['nama_barang' => 'Fujifilm X-T5 Kit 16-80mm', 'qty' => 1],
                ],
            ],
            // 6. Public Web: TERLAMBAT BELUM DIKEMBALIKAN (Status sewa: "Terlambat 2 hari")
            [
                'no_sewa' => 'SW-'.Carbon::now()->subDays(6)->format('Ymd').'-001',
                'customer_nama' => 'Budi Santoso',
                'asal_pesanan' => Sewa::ASAL_WEB,
                'is_admin' => false,
                'tgl_sewa' => Carbon::now()->subDays(6)->toDateString(),
                'tgl_akhir_sewa' => Carbon::now()->subDays(2)->toDateString(),
                'metode_pembayaran' => 'qris',
                'id_rekening' => RiwayatSaldoService::REKENING_QRIS, // 2
                'items' => [
                    ['nama_barang' => 'Sony FX3 Cinema Line', 'qty' => 1],
                ],
            ],
        ];

        DB::transaction(function () use ($stokService, $saldoService, $nomorService, $admin, $kategoriSewa, $dummyJaminan, $list) {
            foreach ($list as $item) {
                $customer = Customer::where('nama_lengkap', $item['customer_nama'])->first();
                if (! $customer) {
                    continue;
                }

                $tglMulai = Carbon::parse($item['tgl_sewa']);
                $tglSelesai = Carbon::parse($item['tgl_akhir_sewa']);
                $jumlahHari = max(1, (int) $tglMulai->diffInDays($tglSelesai));

                $totalBiaya = 0;
                $detailsData = [];

                foreach ($item['items'] as $it) {
                    $barang = Barang::where('nama_barang', $it['nama_barang'])->first();
                    if (! $barang) {
                        continue;
                    }
                    $hargaSatuan = (int) $barang->harga_sewa;
                    $subtotal = $hargaSatuan * $it['qty'] * $jumlahHari;
                    $totalBiaya += $subtotal;

                    $detailsData[] = [
                        'barang' => $barang,
                        'qty' => $it['qty'],
                        'harga_satuan' => $hargaSatuan,
                    ];
                }

                $sewa = Sewa::create([
                    'no_sewa' => $item['no_sewa'],
                    'tgl_sewa' => $item['tgl_sewa'],
                    'tgl_akhir_sewa' => $item['tgl_akhir_sewa'],
                    'id_customer' => $customer->id,
                    'total_biaya' => $totalBiaya,
                    'foto_jaminan' => $dummyJaminan,
                    'id_users' => ($item['asal_pesanan'] === Sewa::ASAL_ADMIN) ? $admin?->id : null,
                    'status_pembayaran' => Sewa::BAYAR_CONFIRMED,
                    'asal_pesanan' => $item['asal_pesanan'],
                ]);

                foreach ($detailsData as $d) {
                    $detail = SewaDetail::create([
                        'id_sewa' => $sewa->id,
                        'id_barang' => $d['barang']->id,
                        'harga_sewa_satuan' => $d['harga_satuan'],
                        'qty' => $d['qty'],
                    ]);

                    // Mutasi stok keluar saat disewa
                    $stokService->kurang(
                        $d['barang']->id,
                        $d['qty'],
                        RiwayatStokService::KELUAR,
                        ['id_sewa_detail' => $detail->id]
                    );
                }

                // Catat transaksi pembayaran
                $metode = $item['metode_pembayaran'];
                $prefixOrder = strtoupper($metode);
                $orderId = $prefixOrder.'-SW-'.Carbon::parse($item['tgl_sewa'])->format('Ymd').'-'.substr($sewa->id, 0, 5);

                $pembayaran = Pembayaran::create([
                    'id_sewa' => $sewa->id,
                    'order_id' => $orderId,
                    'metode_pembayaran' => $metode,
                    'payment_type' => $metode,
                    'gross_amount' => $totalBiaya,
                    'currency' => 'IDR',
                    'transaction_status' => 'settlement',
                    'transaction_time' => Carbon::parse($item['tgl_sewa'])->setTime(9, 0, 0),
                    'settlement_time' => Carbon::parse($item['tgl_sewa'])->setTime(9, 5, 0),
                    'qr_url' => $metode === 'qris' ? 'https://api.midtrans.com/v2/qris/dummy/qr-code' : null,
                    'qr_string' => $metode === 'qris' ? '00020101021226680016ID.CO.MIDTRANS0118936005230000000000' : null,
                ]);

                // Catat pemasukan kas/bank
                $idRekening = $item['id_rekening'];
                $rekening = Rekening::find($idRekening);
                $noKwitansi = 'KWT-'.Carbon::parse($item['tgl_sewa'])->format('Ymd').'-'.str_pad((string) $pembayaran->id, 3, '0', STR_PAD_LEFT);

                $pemasukan = Pemasukan::create([
                    'tgl_pemasukan' => $item['tgl_sewa'],
                    'nominal' => $totalBiaya,
                    'id_kategori_transaksi' => $kategoriSewa->id,
                    'id_rekening' => $idRekening,
                    'id_sewa' => $sewa->id,
                    'id_pembayaran' => $pembayaran->id,
                    'no_kwitansi' => $noKwitansi,
                    'keterangan' => $nomorService->keteranganPembayaranSewa($sewa, $rekening, $totalBiaya, $item['tgl_sewa']),
                ]);

                $saldoService->tambah(
                    $idRekening,
                    $totalBiaya,
                    RiwayatSaldoService::MASUK,
                    ['id_pemasukan' => $pemasukan->id],
                    $item['tgl_sewa']
                );
            }
        });
    }
}
