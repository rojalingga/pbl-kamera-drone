<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\KategoriTransaksi;
use App\Models\PembelianUnit;
use App\Models\PengadaanBarang;
use App\Models\Pengembalian;
use App\Models\Perawatan;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use App\Models\RiwayatStok;
use App\Models\Sewa;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_berjalan_sempurna_dan_semua_kondisi_terpenuhi(): void
    {
        $this->seed(DatabaseSeeder::class);

        // 1. Verifikasi Sewa: Total 6 data (3 admin, 3 web)
        $this->assertSame(6, Sewa::count());
        $this->assertSame(3, Sewa::where('asal_pesanan', Sewa::ASAL_ADMIN)->count());
        $this->assertSame(3, Sewa::where('asal_pesanan', Sewa::ASAL_WEB)->count());
        $this->assertSame(3, Sewa::where('asal_pesanan', Sewa::ASAL_ADMIN)->whereNotNull('id_users')->count(), 'Sewa dari admin harus ada petugas');
        $this->assertSame(3, Sewa::where('asal_pesanan', Sewa::ASAL_WEB)->whereNull('id_users')->count(), 'Sewa dari public page id_users harus null');

        $sewas = Sewa::withExists('pengembalians')->get();
        $statusSewaList = $sewas->pluck('status_sewa')->all();

        // 4 sudah pengembalian, 1 proses sewa, 1 terlambat
        $countPengembalian = count(array_filter($statusSewaList, fn ($s) => $s === Sewa::SEWA_PENGEMBALIAN));
        $countProses = count(array_filter($statusSewaList, fn ($s) => $s === Sewa::SEWA_PROSES));
        $countTerlambat = count(array_filter($statusSewaList, fn ($s) => str_starts_with($s, 'Terlambat')));

        $this->assertSame(4, $countPengembalian);
        $this->assertSame(1, $countProses);
        $this->assertSame(1, $countTerlambat);

        // 2. Verifikasi Pengembalian: Total 4 data mencakup berbagai kondisi
        $this->assertSame(4, Pengembalian::count());
        $pengembalians = Pengembalian::with(['dendas', 'piutangs'])->get();

        $lunasTanpaDenda = $pengembalians->first(fn ($p) => (float) $p->total_denda == 0 && $p->status_pembayaran === 'Lunas');
        $lunasDenganDenda = $pengembalians->first(fn ($p) => (float) $p->total_denda > 0 && $p->status_pembayaran === 'Lunas');
        $belumLunasBelumBayar = $pengembalians->first(fn ($p) => $p->status_pembayaran === 'Belum Lunas' && $p->piutangs->first()?->terbayar == 0);
        $belumLunasSebagian = $pengembalians->first(fn ($p) => $p->status_pembayaran === 'Belum Lunas' && $p->piutangs->first()?->terbayar > 0);

        $this->assertNotNull($lunasTanpaDenda, 'Harus ada pengembalian lunas tanpa denda');
        $this->assertNotNull($lunasDenganDenda, 'Harus ada pengembalian dengan denda yang lunas');
        $this->assertNotNull($belumLunasBelumBayar, 'Harus ada pengembalian dengan denda belum lunas (terbayar 0)');
        $this->assertNotNull($belumLunasSebagian, 'Harus ada pengembalian dengan denda belum lunas (terbayar sebagian)');

        // 3. Verifikasi Pembelian Unit: Mencakup Disetujui, Pending, dan Ditolak
        $this->assertSame(3, PembelianUnit::count());
        $this->assertTrue(PembelianUnit::where('is_owner_acc', PembelianUnit::STATUS_DISETUJUI)->exists());
        $this->assertTrue(PembelianUnit::where('is_owner_acc', PembelianUnit::STATUS_PENDING)->exists());
        $this->assertTrue(PembelianUnit::where('is_owner_acc', PembelianUnit::STATUS_DITOLAK)->whereNotNull('alasan_penolakan')->exists());

        // 4. Verifikasi Perawatan: Mencakup Disetujui (Perawatan & Selesai), Pending, dan Ditolak
        $this->assertSame(4, Perawatan::count());
        $this->assertTrue(Perawatan::where('is_owner_acc', Perawatan::STATUS_DISETUJUI)->where('status_pembayaran', 'Belum Lunas')->exists());
        $this->assertTrue(Perawatan::where('is_owner_acc', Perawatan::STATUS_DISETUJUI)->where('status_pembayaran', 'Lunas')->exists());
        $this->assertTrue(Perawatan::where('is_owner_acc', Perawatan::STATUS_PENDING)->exists());
        $this->assertTrue(Perawatan::where('is_owner_acc', Perawatan::STATUS_DITOLAK)->whereNotNull('alasan_penolakan')->exists());

        // 5. Verifikasi Pengadaan Barang
        $this->assertSame(2, PengadaanBarang::count());

        // 6. Verifikasi Riwayat Stok: Semua stok barang harus > 0 dan tidak boleh ada stok negatif
        $barangs = Barang::all();
        $this->assertGreaterThanOrEqual(8, $barangs->count());

        foreach ($barangs as $barang) {
            $this->assertGreaterThan(0, (int) $barang->stok, "Stok {$barang->nama_barang} harus lebih dari 0");

            // Snapshot stok terakhir di riwayat_stok harus sama persis dengan barang.stok
            $stokTerakhirRiwayat = RiwayatStok::where('id_barang', $barang->id)->latest('id')->value('stok');
            $this->assertSame((int) $barang->stok, (int) $stokTerakhirRiwayat, "Stok {$barang->nama_barang} di riwayat_stok harus sinkron");
        }

        // 7. Verifikasi Saldo Rekening: Semua saldo harus sinkron dengan snapshot riwayat_saldo
        $rekenings = Rekening::all();
        foreach ($rekenings as $rekening) {
            $saldoTerakhirRiwayat = RiwayatSaldo::where('id_rekening', $rekening->id)->latest('id')->value('saldo');
            $this->assertSame((int) $rekening->saldo, (int) $saldoTerakhirRiwayat, "Saldo rekening {$rekening->nama_rek} harus sinkron");
        }

        // 8. Verifikasi stt_fix Kategori Transaksi
        $kategoriFix = ['Sewa', 'Pembayaran Denda', 'Pembelian Unit', 'Perawatan'];
        foreach ($kategoriFix as $namaKat) {
            $kat = KategoriTransaksi::where('kategori', $namaKat)->first();
            $this->assertNotNull($kat, "Kategori {$namaKat} harus ada");
            $this->assertTrue((bool) $kat->stt_fix, "Kategori {$namaKat} harus berstatus stt_fix = true");
        }
        $katNonFix = KategoriTransaksi::whereNotIn('kategori', $kategoriFix)->get();
        foreach ($katNonFix as $kat) {
            $this->assertFalse((bool) $kat->stt_fix, "Kategori {$kat->kategori} harus berstatus stt_fix = false");
        }
    }
}
