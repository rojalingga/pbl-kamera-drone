<?php

namespace Tests\Feature;

use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Piutang;
use App\Models\Rekening;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class KeuanganMenuTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    public function test_keuangan_pages_render_inertia_components(): void
    {
        $this->actingAs($this->user)
            ->get('/admin/keuangan/pemasukan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Keuangan/Pemasukan/Index')
                ->has('permissions')
                ->has('permissions.tambah')
                ->has('kategoris')
                ->has('rekenings'));

        $this->actingAs($this->user)
            ->get('/admin/keuangan/pengeluaran')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Keuangan/Pengeluaran/Index')
                ->has('permissions')
                ->has('kategoris')
                ->has('perawatans')
                ->has('rekenings'));

        $this->actingAs($this->user)
            ->get('/admin/keuangan/piutang')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Keuangan/Piutang/Index')
                ->has('permissions'));
    }

    public function test_pemasukan_datatables_mengembalikan_json(): void
    {
        $kategori = KategoriTransaksi::create([
            'kategori' => 'Sewa Drone',
            'jenis' => 'Pemasukan',
        ]);

        Pemasukan::create([
            'tgl_pemasukan' => '2026-09-01',
            'nominal' => 1500000,
            'id_kategori_transaksi' => $kategori->id,
            'no_kwitansi' => 'KW-001',
        ]);

        $response = $this->actingAs($this->user)
            ->get('/admin/keuangan/pemasukan?datatable=1');

        $response->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);

        $this->assertSame('Sewa Drone', $response->json('data.0.kategori'));
        $this->assertSame('KW-001', $response->json('data.0.no_kwitansi'));
    }

    public function test_store_pemasukan_valid_dan_invalid(): void
    {
        $kategori = KategoriTransaksi::create([
            'kategori' => 'Iklan',
            'jenis' => 'Pemasukan',
        ]);
        $rekening = Rekening::create([
            'nama_rek' => 'BCA',
            'no_rek' => '12345678',
            'pemilik_rek' => 'Admin',
            'saldo' => 500000,
        ]);

        $this->actingAs($this->user)
            ->postJson(route('pemasukan.store'), [
                'tgl_pemasukan' => '2026-09-10',
                'nominal' => 250000,
                'id_kategori_transaksi' => $kategori->id,
                'id_rekening' => $rekening->id,
                'no_kwitansi' => 'KW-100',
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertDatabaseHas('pemasukan', [
            'tgl_pemasukan' => '2026-09-10',
            'no_kwitansi' => 'KW-100',
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $rekening->id,
        ]);

        $this->actingAs($this->user)
            ->postJson(route('pemasukan.store'), [
                'nominal' => 'bukan-angka',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tgl_pemasukan', 'nominal', 'id_rekening']);
    }

    public function test_update_piutang_ditolak_melebihi_nominal(): void
    {
        $piutang = Piutang::create([
            'tgl_piutang' => '2026-09-01',
            'nominal' => 100000,
        ]);

        $this->actingAs($this->user)
            ->putJson(route('piutang.update', $piutang->id), [
                'tgl_piutang' => '2026-09-01',
                'nominal' => 100000,
                'terbayar' => 200000,
            ])
            ->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'error' => 'Pembayaran melebihi nominal piutang.',
            ]);

        $this->assertDatabaseHas('piutang', [
            'id' => $piutang->id,
            'terbayar' => null,
        ]);
    }
}
