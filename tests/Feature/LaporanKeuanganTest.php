<?php

namespace Tests\Feature;

use App\Models\KategoriTransaksi;
use App\Models\Rekening;
use App\Models\User;
use Database\Seeders\MenuSeeder;
use Database\Seeders\RekeningSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LaporanKeuanganTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->seed(MenuSeeder::class);
        $this->seed(RekeningSeeder::class);
    }

    public function test_laporan_keuangan_index_returns_inertia(): void
    {
        $this->actingAs($this->user)
            ->get('/admin/laporan/keuangan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Laporan/Keuangan/Index')
                ->has('permissions'));
    }

    public function test_laporan_arus_kas_menampilkan_riwayat_saldo(): void
    {
        $kategoriMasuk = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);
        $kategoriKeluar = KategoriTransaksi::create(['kategori' => 'Operasional', 'jenis' => 'Pengeluaran']);

        $this->actingAs($this->user)->post('/admin/keuangan/pemasukan', [
            'tgl_pemasukan' => '2026-09-30',
            'nominal' => 200000,
            'id_kategori_transaksi' => $kategoriMasuk->id,
            'id_rekening' => 1,
        ])->assertOk();

        $this->actingAs($this->user)->post('/admin/keuangan/pengeluaran', [
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 50000,
            'id_kategori_transaksi' => $kategoriKeluar->id,
            'id_rekening' => 1,
        ])->assertOk();

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/laporan/keuangan/data');

        $response->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data', 'total_masuk', 'total_keluar', 'saldo']);

        $payload = $response->json();
        $this->assertCount(2, $payload['data']);
        $this->assertSame(200000.0, (float) $payload['total_masuk']);
        $this->assertSame(50000.0, (float) $payload['total_keluar']);
        $this->assertSame(150000.0, (float) $payload['saldo']);

        $barisMasuk = collect($payload['data'])->firstWhere('jenis', 'Pemasukan');
        $this->assertNotNull($barisMasuk);
        $this->assertSame('Kas Kantor', $barisMasuk['rekening']);
        $this->assertSame('200.000', $barisMasuk['nominal']);
        $this->assertSame('200.000', $barisMasuk['saldo']);

        $barisKeluar = collect($payload['data'])->firstWhere('jenis', 'Pengeluaran');
        $this->assertNotNull($barisKeluar);
        $this->assertSame('50.000', $barisKeluar['nominal']);
        $this->assertSame('150.000', $barisKeluar['saldo']);
    }

    public function test_laporan_arus_kas_filter_tanggal(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);

        $this->actingAs($this->user)->post('/admin/keuangan/pemasukan', [
            'tgl_pemasukan' => '2026-09-01',
            'nominal' => 100000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => 2,
        ])->assertOk();

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/laporan/keuangan/data?tanggal_awal=2026-09-15&tanggal_akhir=2026-09-30');

        $response->assertOk();
        $this->assertCount(0, $response->json('data'));
        $this->assertSame(100000, (int) Rekening::find(2)->saldo);
    }

    public function test_laporan_arus_kas_filter_rekening(): void
    {
        $kategoriMasuk = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);
        $kategoriKeluar = KategoriTransaksi::create(['kategori' => 'Operasional', 'jenis' => 'Pengeluaran']);

        $this->actingAs($this->user)->post('/admin/keuangan/pemasukan', [
            'tgl_pemasukan' => '2026-09-30',
            'nominal' => 200000,
            'id_kategori_transaksi' => $kategoriMasuk->id,
            'id_rekening' => 1,
        ])->assertOk();

        $this->actingAs($this->user)->post('/admin/keuangan/pengeluaran', [
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 50000,
            'id_kategori_transaksi' => $kategoriKeluar->id,
            'id_rekening' => 1,
        ])->assertOk();

        $this->actingAs($this->user)->post('/admin/keuangan/pemasukan', [
            'tgl_pemasukan' => '2026-09-30',
            'nominal' => 100000,
            'id_kategori_transaksi' => $kategoriMasuk->id,
            'id_rekening' => 3,
        ])->assertOk();

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/laporan/keuangan/data?id_rekening=1');

        $response->assertOk();
        $payload = $response->json();
        $this->assertCount(2, $payload['data']);
        $this->assertSame(200000.0, (float) $payload['total_masuk']);
        $this->assertSame(50000.0, (float) $payload['total_keluar']);
        $this->assertArrayNotHasKey('keterangan', $payload['data'][0]);

        $this->actingAs($this->user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->getJson('/admin/laporan/keuangan/data?id_rekening=999')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['id_rekening']);
    }
}
