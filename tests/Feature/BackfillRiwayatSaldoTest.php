<?php

namespace Tests\Feature;

use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Pembayaran;
use App\Models\Pengeluaran;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use App\Models\User;
use Database\Seeders\RekeningSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackfillRiwayatSaldoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        User::factory()->create();
        $this->seed(RekeningSeeder::class);
    }

    private function jalankanBackfill(): void
    {
        $migrasi = require database_path('migrations/2026_09_30_020540_backfill_rekening_dan_riwayat_saldo.php');
        $migrasi->up();
    }

    public function test_backfill_memetakan_rekening_dari_metode_pembayaran(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);

        $pembayaran = Pembayaran::create([
            'order_id' => 'TRF-1-20260930000000',
            'metode_pembayaran' => 'transfer',
            'gross_amount' => 300000,
            'currency' => 'IDR',
            'transaction_status' => 'settlement',
        ]);

        Pemasukan::create([
            'tgl_pemasukan' => '2026-09-29',
            'nominal' => 300000,
            'id_kategori_transaksi' => $kategori->id,
            'id_pembayaran' => $pembayaran->id,
            'no_kwitansi' => $pembayaran->order_id,
        ]);

        $this->jalankanBackfill();

        $pemasukan = Pemasukan::first();
        $this->assertSame(3, (int) $pemasukan->id_rekening);

        $riwayat = RiwayatSaldo::where('id_pemasukan', $pemasukan->id)->first();
        $this->assertNotNull($riwayat);
        $this->assertSame(3, (int) $riwayat->id_rekening);
        $this->assertSame('Masuk', $riwayat->jenis);
        $this->assertSame(300000, (int) $riwayat->nominal);
        $this->assertSame(300000, (int) $riwayat->saldo);
        $this->assertSame(300000, (int) Rekening::find(3)->saldo);
    }

    public function test_backfill_manual_ke_kas_dan_bisa_dijalankan_ulang(): void
    {
        $kategoriMasuk = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);
        $kategoriKeluar = KategoriTransaksi::create(['kategori' => 'Operasional', 'jenis' => 'Pengeluaran']);

        $pemasukan = Pemasukan::create([
            'tgl_pemasukan' => '2026-09-01',
            'nominal' => 200000,
            'id_kategori_transaksi' => $kategoriMasuk->id,
        ]);

        $pengeluaran = Pengeluaran::create([
            'tgl_pengeluaran' => '2026-09-02',
            'nominal' => 50000,
            'id_kategori_transaksi' => $kategoriKeluar->id,
        ]);

        $this->jalankanBackfill();
        $this->jalankanBackfill();

        $this->assertSame(1, (int) $pemasukan->fresh()->id_rekening);
        $this->assertSame(1, (int) $pengeluaran->fresh()->id_rekening);
        $this->assertSame(2, RiwayatSaldo::where('id_rekening', 1)->count());
        $this->assertSame(150000, (int) Rekening::find(1)->saldo);
        $this->assertSame(150000, (int) RiwayatSaldo::where('id_pengeluaran', $pengeluaran->id)->first()->saldo);
    }
}
