<?php

namespace Tests\Feature;

use App\Models\KategoriTransaksi;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use App\Models\User;
use App\Services\RiwayatSaldoService;
use Database\Seeders\MenuSeeder;
use Database\Seeders\RekeningSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RekeningTest extends TestCase
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

    public function test_rekening_index_returns_inertia(): void
    {
        $this->actingAs($this->user)
            ->get('/admin/master-data/rekening')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/MasterData/Rekening/Index')
                ->has('permissions'));
    }

    public function test_rekening_datatable_returns_json(): void
    {
        $this->actingAs($this->user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/master-data/rekening?datatable=1')
            ->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);
    }

    public function test_rekening_update_hanya_mengubah_identitas_saldo_tetap(): void
    {
        $response = $this->actingAs($this->user)
            ->post('/admin/master-data/rekening/1', [
                'nama_rek' => 'Kas Kantor Baru',
                'no_rek' => '999',
                'pemilik_rek' => 'Admin',
                'saldo' => 5000000,
                '_method' => 'PUT',
            ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        $rekening = Rekening::find(1);
        $this->assertSame('Kas Kantor Baru', $rekening->nama_rek);
        $this->assertSame('999', $rekening->no_rek);
        $this->assertSame(0, (int) $rekening->saldo);
    }

    public function test_pemasukan_menambah_saldo_dan_riwayat(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);

        $response = $this->actingAs($this->user)
            ->post('/admin/keuangan/pemasukan', [
                'tgl_pemasukan' => '2026-09-30',
                'nominal' => 150000,
                'id_kategori_transaksi' => $kategori->id,
                'id_rekening' => 1,
            ]);

        $response->assertOk()->assertJson(['status' => 'success']);
        $this->assertSame(150000, (int) Rekening::find(1)->saldo);
        $this->assertSame(1, RiwayatSaldo::where('id_rekening', 1)->count());
    }

    public function test_pengeluaran_mengurangi_saldo_dan_riwayat(): void
    {
        $kategoriMasuk = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);
        $kategoriKeluar = KategoriTransaksi::create(['kategori' => 'Operasional', 'jenis' => 'Pengeluaran']);

        $this->actingAs($this->user)->post('/admin/keuangan/pemasukan', [
            'tgl_pemasukan' => '2026-09-30',
            'nominal' => 200000,
            'id_kategori_transaksi' => $kategoriMasuk->id,
            'id_rekening' => 3,
        ])->assertOk();

        $this->actingAs($this->user)->post('/admin/keuangan/pengeluaran', [
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 50000,
            'id_kategori_transaksi' => $kategoriKeluar->id,
            'id_rekening' => 3,
        ])->assertOk();

        $this->assertSame(150000, (int) Rekening::find(3)->saldo);
        $this->assertSame(2, RiwayatSaldo::where('id_rekening', 3)->count());
    }

    public function test_pemetaan_metode_ke_rekening(): void
    {
        $this->assertSame(1, RiwayatSaldoService::rekeningUntukMetode('cash'));
        $this->assertSame(2, RiwayatSaldoService::rekeningUntukMetode('qris'));
        $this->assertSame(3, RiwayatSaldoService::rekeningUntukMetode('transfer'));
        $this->assertNull(RiwayatSaldoService::rekeningUntukMetode('lainnya'));
    }
}
