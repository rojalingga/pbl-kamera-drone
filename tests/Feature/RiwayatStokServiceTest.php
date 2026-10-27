<?php

namespace Tests\Feature;

use App\Exceptions\StokTidakCukupException;
use App\Models\Barang;
use App\Models\Customer;
use App\Models\FotoBarang;
use App\Models\Kategori;
use App\Models\Merk;
use App\Models\Perawatan;
use App\Models\PerawatanDetail;
use App\Models\RiwayatStok;
use App\Models\Sewa;
use App\Models\User;
use App\Services\RiwayatStokService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class RiwayatStokServiceTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<int, string> */
    private array $files = [];

    private User $user;

    private Barang $barang;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->barang = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 5,
            'harga_sewa' => 100000,
        ]);
    }

    protected function tearDown(): void
    {
        foreach ($this->files as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }

        parent::tearDown();
    }

    public function test_store_barang_tanpa_stok_awal_dan_tanpa_riwayat(): void
    {
        $merk = Merk::create(['merk' => 'DJI']);
        $kategori = Kategori::create(['kategori' => 'Drone']);

        $response = $this->actingAs($this->user)->postJson(route('barang.store'), [
            'nama_barang' => 'Mavic 3',
            'id_merk' => $merk->id,
            'id_kategori' => $kategori->id,
            'harga_sewa' => 200000,
            'foto' => [UploadedFile::fake()->image('mavic.jpg')],
        ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        $barang = Barang::where('nama_barang', 'Mavic 3')->firstOrFail();
        $this->registerFotoFiles();

        $this->assertSame(0, (int) $barang->stok);
        $this->assertSame(0, RiwayatStok::where('id_barang', $barang->id)->count());
    }

    public function test_store_sewa_menulis_riwayat_keluar(): void
    {
        $customer = Customer::create([
            'nama_lengkap' => 'Budi',
            'no_hp' => '081234567890',
        ]);

        $this->actingAs($this->user)->postJson(route('sewa.store'), [
            'tgl_sewa' => '2026-09-27',
            'tgl_akhir_sewa' => '2026-09-30',
            'id_customer' => $customer->id,
            'items' => [
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 100000, 'qty' => 2],
            ],
        ])->assertOk()->assertJson(['status' => 'success']);

        $this->assertSame(3, (int) $this->barang->fresh()->stok);

        $riwayat = RiwayatStok::where('id_barang', $this->barang->id)->get();
        $this->assertCount(1, $riwayat);
        $this->assertSame('Keluar', $riwayat->first()->jenis);
        $this->assertSame(2, (int) $riwayat->first()->jumlah);
        $this->assertSame(3, (int) $riwayat->first()->stok);
    }

    public function test_batalkan_masuk_mengembalikan_stok_dan_menghapus_riwayat_sumber(): void
    {
        $service = app(RiwayatStokService::class);
        $service->tambah($this->barang->id, 2, RiwayatStokService::MASUK, ['id_pengadaan_barang_detail' => 99]);

        $this->assertSame(7, (int) $this->barang->fresh()->stok);
        $this->assertSame(1, RiwayatStok::count());

        $dihapus = $service->batalkanMasuk($this->barang->id, 2, ['id_pengadaan_barang_detail' => 99]);

        $this->assertSame(1, $dihapus);
        $this->assertSame(5, (int) $this->barang->fresh()->stok);
        $this->assertSame(0, RiwayatStok::count());
    }

    public function test_batalkan_masuk_ditolak_bila_stok_tidak_cukupi(): void
    {
        $service = app(RiwayatStokService::class);
        $service->tambah($this->barang->id, 2, RiwayatStokService::MASUK, ['id_pengadaan_barang_detail' => 99]);
        $service->kurang($this->barang->id, 6);

        try {
            $service->batalkanMasuk($this->barang->id, 2, ['id_pengadaan_barang_detail' => 99]);
            $this->fail('Seharusnya melempar StokTidakCukupException.');
        } catch (StokTidakCukupException $e) {
            $this->assertSame('Stok tidak mencukupi.', $e->getMessage());
        }

        $this->assertSame(1, (int) $this->barang->fresh()->stok);
        $this->assertSame(2, RiwayatStok::count());
    }

    public function test_batalkan_keluar_mengembalikan_stok_dan_menghapus_riwayat_sumber(): void
    {
        $service = app(RiwayatStokService::class);
        $service->kurang($this->barang->id, 2, RiwayatStokService::KELUAR, ['id_sewa_detail' => 77]);

        $this->assertSame(3, (int) $this->barang->fresh()->stok);
        $this->assertSame(1, RiwayatStok::count());

        $dihapus = $service->batalkanKeluar($this->barang->id, 2, ['id_sewa_detail' => 77]);

        $this->assertSame(1, $dihapus);
        $this->assertSame(5, (int) $this->barang->fresh()->stok);
        $this->assertSame(0, RiwayatStok::count());
    }

    public function test_batalkan_keluar_mengembalikan_stok_utuh_saat_sumber_punya_beberapa_riwayat(): void
    {
        $service = app(RiwayatStokService::class);
        $sumber = ['id_perawatan_detail' => 55];

        $service->kurang($this->barang->id, 1, RiwayatStokService::KELUAR, $sumber);
        $service->tambah($this->barang->id, 1, RiwayatStokService::MASUK, $sumber);
        $service->kurang($this->barang->id, 1, RiwayatStokService::KELUAR, $sumber);
        $service->tambah($this->barang->id, 1, RiwayatStokService::MASUK, ['id_pengadaan_barang_detail' => 88]);

        $this->assertSame(5, (int) $this->barang->fresh()->stok);

        $dihapus = $service->batalkanKeluar($this->barang->id, 1, $sumber);

        $this->assertSame(3, $dihapus);
        $this->assertSame(6, (int) $this->barang->fresh()->stok);
        $this->assertSame(1, RiwayatStok::count());

        $pengadaan = RiwayatStok::firstOrFail();
        $this->assertSame(6, (int) $pengadaan->stok);
    }

    public function test_batalkan_sumber_tanpa_riwayat_tidak_mengubah_stok(): void
    {
        $service = app(RiwayatStokService::class);

        $dihapus = $service->batalkanKeluar($this->barang->id, 3, ['id_sewa_detail' => 404]);

        $this->assertSame(0, $dihapus);
        $this->assertSame(5, (int) $this->barang->fresh()->stok);
    }

    public function test_adjustment_manual_menambah_stok_dan_menulis_riwayat(): void
    {
        $riwayat = app(RiwayatStokService::class)->tambah($this->barang->id, 2);

        $this->assertSame(7, (int) $this->barang->fresh()->stok);

        $this->assertNotNull($riwayat);
        $this->assertSame('Masuk', $riwayat->jenis);
        $this->assertSame(2, (int) $riwayat->jumlah);
        $this->assertSame(7, (int) $riwayat->stok);
    }

    public function test_adjustment_manual_ditolak_bila_stok_tidak_cukupi(): void
    {
        try {
            app(RiwayatStokService::class)->kurang($this->barang->id, 10);
            $this->fail('Seharusnya melempar StokTidakCukupException.');
        } catch (StokTidakCukupException $e) {
            $this->assertSame('Stok tidak mencukupi.', $e->getMessage());
        }

        $this->assertSame(5, (int) $this->barang->fresh()->stok);
        $this->assertSame(0, RiwayatStok::count());
    }

    public function test_store_sewa_melebihi_stok_ditolak_dan_transaksi_rollback(): void
    {
        $customer = Customer::create([
            'nama_lengkap' => 'Budi',
            'no_hp' => '081234567890',
        ]);

        $this->actingAs($this->user)->postJson(route('sewa.store'), [
            'tgl_sewa' => '2026-09-27',
            'tgl_akhir_sewa' => '2026-09-30',
            'id_customer' => $customer->id,
            'items' => [
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 100000, 'qty' => 10],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors('items.0.id_barang');

        $this->assertSame(0, Sewa::count());
        $this->assertSame(5, (int) $this->barang->fresh()->stok);
        $this->assertSame(0, RiwayatStok::count());
    }

    public function test_destroy_barang_menghapus_seluruh_riwayat_stok(): void
    {
        app(RiwayatStokService::class)->tambah($this->barang->id, 2);
        $this->assertSame(1, RiwayatStok::count());

        $this->actingAs($this->user)
            ->deleteJson(route('barang.destroy', $this->barang->id))
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(0, RiwayatStok::count());
        $this->assertSame(0, Barang::count());
    }

    public function test_riwayat_stok_menyimpan_kolom_sumber_dan_tanggal_dari_tanggal_dokumen_sewa(): void
    {
        $customer = Customer::create([
            'nama_lengkap' => 'Budi',
            'no_hp' => '081234567890',
        ]);

        $this->actingAs($this->user)->postJson(route('sewa.store'), [
            'tgl_sewa' => '2026-01-15',
            'tgl_akhir_sewa' => '2026-01-18',
            'id_customer' => $customer->id,
            'items' => [
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 100000, 'qty' => 2],
            ],
        ])->assertOk()->assertJson(['status' => 'success']);

        $riwayat = RiwayatStok::where('id_barang', $this->barang->id)->firstOrFail();

        $this->assertSame($this->barang->id, $riwayat->id_barang);
        $this->assertSame(RiwayatStokService::KELUAR, $riwayat->jenis);
        $this->assertSame(2, (int) $riwayat->jumlah);
        $this->assertSame(3, (int) $riwayat->stok);
        $this->assertNotNull($riwayat->id_sewa_detail);
        $this->assertNull($riwayat->id_pengadaan_barang_detail);
        $this->assertNull($riwayat->id_pengembalian_detail);
        $this->assertNull($riwayat->id_perawatan_detail);
        $this->assertSame('2026-01-15', $riwayat->tanggal->toDateString());
        $this->assertNotSame(now()->toDateString(), $riwayat->tanggal->toDateString());
    }

    public function test_tanggal_riwayat_dari_dokumen_perawatan_menggunakan_tgl_perawatan(): void
    {
        $perawatan = Perawatan::create([
            'tgl_perawatan' => '2026-01-15',
            'total_biaya_perawatan' => 50000,
            'status_pembayaran' => Perawatan::BAYAR_BELUM_LUNAS,
        ]);

        $detail = PerawatanDetail::create([
            'id_perawatan' => $perawatan->id,
            'id_barang' => $this->barang->id,
            'qty' => 1,
            'biaya_perawatan' => 50000,
            'status' => PerawatanDetail::STATUS_PERAWATAN,
            'keterangan' => 'Ganti gimbal',
        ]);

        $riwayat = app(RiwayatStokService::class)->catat(
            $this->barang->id,
            RiwayatStokService::MASUK,
            1,
            6,
            ['id_perawatan_detail' => $detail->id]
        );

        $this->assertSame($detail->id, (int) $riwayat->id_perawatan_detail);
        $this->assertSame('2026-01-15', $riwayat->tanggal->toDateString());
    }

    public function test_batalkan_masuk_menyesuaikan_snapshot_riwayat_susulan(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Kamera Sony',
            'stok' => 0,
            'harga_sewa' => 150000,
        ]);

        $service = app(RiwayatStokService::class);
        $service->tambah($barang->id, 5, RiwayatStokService::MASUK, ['id_pengadaan_barang_detail' => 1]);
        $service->tambah($barang->id, 3, RiwayatStokService::MASUK, ['id_pengadaan_barang_detail' => 2]);
        $service->tambah($barang->id, 6, RiwayatStokService::MASUK, ['id_pengadaan_barang_detail' => 3]);

        $this->assertSame(14, (int) $barang->fresh()->stok);

        $service->batalkanMasuk($barang->id, 3, ['id_pengadaan_barang_detail' => 2]);

        $this->assertSame(11, (int) $barang->fresh()->stok);

        $sisa = RiwayatStok::where('id_barang', $barang->id)->orderBy('id')->get();
        $this->assertCount(2, $sisa);
        $this->assertSame(5, (int) $sisa[0]->stok);
        $this->assertSame(11, (int) $sisa[1]->stok);
    }

    public function test_batalkan_keluar_menyesuaikan_snapshot_riwayat_susulan(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Drone Mini',
            'stok' => 0,
            'harga_sewa' => 120000,
        ]);

        $service = app(RiwayatStokService::class);
        $service->tambah($barang->id, 14, RiwayatStokService::MASUK, ['id_pengadaan_barang_detail' => 1]);
        $service->kurang($barang->id, 4, RiwayatStokService::KELUAR, ['id_sewa_detail' => 2]);
        $service->tambah($barang->id, 2, RiwayatStokService::MASUK, ['id_pengadaan_barang_detail' => 3]);

        $this->assertSame(12, (int) $barang->fresh()->stok);

        $service->batalkanKeluar($barang->id, 4, ['id_sewa_detail' => 2]);

        $this->assertSame(16, (int) $barang->fresh()->stok);

        $sisa = RiwayatStok::where('id_barang', $barang->id)->orderBy('id')->get();
        $this->assertCount(2, $sisa);
        $this->assertSame(14, (int) $sisa[0]->stok);
        $this->assertSame(16, (int) $sisa[1]->stok);
    }

    private function registerFotoFiles(): void
    {
        foreach (FotoBarang::all() as $foto) {
            $this->files[] = public_path('assets/barang/'.$foto->foto);
        }
    }
}
