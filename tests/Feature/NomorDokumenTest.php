<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Rekening;
use App\Models\Sewa;
use App\Models\User;
use App\Services\NomorDokumenService;
use Database\Seeders\RekeningSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NomorDokumenTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private NomorDokumenService $nomor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->nomor = app(NomorDokumenService::class);
        $this->seed(RekeningSeeder::class);
    }

    public function test_no_sewa_format_dan_berurutan_harian(): void
    {
        $this->assertSame('SW-20260930-001', $this->nomor->noSewa('2026-09-30'));

        Sewa::create(['no_sewa' => 'SW-20260930-001', 'tgl_sewa' => '2026-09-30']);

        $this->assertSame('SW-20260930-002', $this->nomor->noSewa('2026-09-30'));
        $this->assertSame('SW-20261001-001', $this->nomor->noSewa('2026-10-01'));
    }

    public function test_no_kwitansi_format(): void
    {
        $this->assertSame('KWT-20260930-001', $this->nomor->noKwitansi('2026-09-30'));
    }

    public function test_template_keterangan_pembayaran_sewa(): void
    {
        $customer = Customer::create(['nama_lengkap' => 'Customer A', 'no_hp' => '081234567890']);
        $sewa = Sewa::create(['no_sewa' => 'SW-20260930-001', 'tgl_sewa' => '2026-09-30', 'id_customer' => $customer->id]);
        $rekening = Rekening::find(1);

        $teks = $this->nomor->keteranganPembayaranSewa($sewa, $rekening, 150000, '2026-09-30');

        $this->assertSame('Pembayaran Transaksi Sewa #SW-20260930-001 tanggal 30 September 2026 oleh Customer A dengan nominal Rp.150.000 di rekening Kas Kantor', $teks);
    }

    public function test_sewa_store_memberi_no_sewa_otomatis(): void
    {
        $customer = Customer::create(['nama_lengkap' => 'Budi', 'no_hp' => '081234567890']);
        $barang = Barang::create(['nama_barang' => 'Drone DJI', 'stok' => 10, 'harga_sewa' => 50000]);

        $this->actingAs($this->user)
            ->postJson(route('sewa.store'), [
                'tgl_sewa' => '2026-09-30',
                'tgl_akhir_sewa' => '2026-10-01',
                'id_customer' => $customer->id,
                'items' => [
                    ['id_barang' => $barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 1],
                ],
            ])
            ->assertOk();

        $sewa = Sewa::first();
        $this->assertNotNull($sewa->no_sewa);
        $this->assertMatchesRegularExpression('/^SW-20260930-\d{3}$/', $sewa->no_sewa);
    }

    public function test_pemasukan_store_memberi_no_kwitansi_otomatis(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);

        $this->actingAs($this->user)
            ->post('/admin/keuangan/pemasukan', [
                'tgl_pemasukan' => '2026-09-30',
                'nominal' => 150000,
                'id_kategori_transaksi' => $kategori->id,
                'id_rekening' => 1,
                'keterangan' => 'Catatan manual',
            ])
            ->assertOk();

        $pemasukan = Pemasukan::first();
        $this->assertMatchesRegularExpression('/^KWT-20260930-\d{3}$/', $pemasukan->no_kwitansi);
        $this->assertSame('Catatan manual', $pemasukan->keterangan);
    }

    public function test_migrasi_menyeragamkan_no_kwitansi_lama(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);

        $lama = Pemasukan::create([
            'tgl_pemasukan' => '2026-09-29',
            'nominal' => 300000,
            'id_kategori_transaksi' => $kategori->id,
            'no_kwitansi' => 'SEWA-6-20260929134352-37W7',
        ]);

        $manual = Pemasukan::create([
            'tgl_pemasukan' => '2026-09-29',
            'nominal' => 50000,
            'id_kategori_transaksi' => $kategori->id,
            'no_kwitansi' => 'KW-001',
        ]);

        $migrasi = require database_path('migrations/2026_09_30_022711_selaraskan_format_no_kwitansi.php');
        $migrasi->up();

        $this->assertMatchesRegularExpression('/^KWT-20260929-\d{3}$/', $lama->fresh()->no_kwitansi);
        $this->assertSame('KW-001', $manual->fresh()->no_kwitansi);
    }
}
