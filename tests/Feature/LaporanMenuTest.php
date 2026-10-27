<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\KategoriTransaksi;
use App\Models\Piutang;
use App\Models\Sewa;
use App\Models\User;
use Database\Seeders\RekeningSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LaporanMenuTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->customer = Customer::create([
            'nama_lengkap' => 'Budi',
            'no_hp' => '081234567890',
        ]);
        $this->seed(RekeningSeeder::class);
    }

    public function test_laporan_pages_render_inertia_components(): void
    {
        $this->actingAs($this->user)
            ->get('/admin/laporan/sewa')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Laporan/Sewa/Index')
                ->has('permissions')
                ->has('customers'));

        $this->actingAs($this->user)
            ->get('/admin/laporan/keuangan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Laporan/Keuangan/Index')
                ->has('permissions'));

        $this->actingAs($this->user)
            ->get('/admin/laporan/piutang-hutang')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Laporan/PiutangHutang/Index')
                ->has('permissions'));
    }

    public function test_laporan_sewa_data_mengembalikan_json_dan_filter(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 10,
            'harga_sewa' => 50000,
        ]);

        $this->actingAs($this->user)
            ->postJson(route('sewa.store'), [
                'tgl_sewa' => '2026-09-27',
                'tgl_akhir_sewa' => '2026-09-30',
                'id_customer' => $this->customer->id,
                'items' => [
                    ['id_barang' => $barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 2],
                ],
            ])
            ->assertOk();

        $response = $this->actingAs($this->user)
            ->get('/admin/laporan/sewa/data');

        $response->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);

        $this->assertSame('Budi', $response->json('data.0.customer'));
        $this->assertSame(Sewa::SEWA_PENDING, $response->json('data.0.status'));
        $this->assertSame('300.000', $response->json('data.0.total_biaya'));

        $this->actingAs($this->user)
            ->get('/admin/laporan/sewa/data?tanggal_awal=2026-10-01&tanggal_akhir=2026-10-31')
            ->assertOk()
            ->assertJson(['recordsFiltered' => 0]);
    }

    public function test_laporan_sewa_data_menolak_rentang_tanggal(): void
    {
        $this->actingAs($this->user)
            ->getJson('/admin/laporan/sewa/data?tanggal_awal=2026-10-05&tanggal_akhir=2026-10-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tanggal_akhir']);
    }

    public function test_laporan_keuangan_data_mengembalikan_total(): void
    {
        $kategori = KategoriTransaksi::create([
            'kategori' => 'Sewa Drone',
            'jenis' => 'Pemasukan',
        ]);

        $this->actingAs($this->user)
            ->post('/admin/keuangan/pemasukan', [
                'tgl_pemasukan' => '2026-09-01',
                'nominal' => 1500000,
                'id_kategori_transaksi' => $kategori->id,
                'id_rekening' => 1,
            ])
            ->assertOk();
        $response = $this->actingAs($this->user)
            ->get('/admin/laporan/keuangan/data');

        $response->assertOk()->assertJsonStructure([
            'draw',
            'recordsTotal',
            'recordsFiltered',
            'data',
            'total_masuk',
            'total_keluar',
            'saldo',
        ]);

        $this->assertSame(1500000.0, (float) $response->json('total_masuk'));
        $this->assertSame(1500000.0, (float) $response->json('saldo'));
        $this->assertSame('Pemasukan', $response->json('data.0.jenis'));
        $this->assertSame('Kas Kantor', $response->json('data.0.rekening'));
    }

    public function test_laporan_piutang_data(): void
    {
        Piutang::create([
            'tgl_piutang' => '2026-09-01',
            'nominal' => 100000,
            'terbayar' => 100000,
        ]);
        Piutang::create([
            'tgl_piutang' => '2026-09-02',
            'nominal' => 200000,
            'terbayar' => 0,
        ]);
        $semua = $this->actingAs($this->user)
            ->get('/admin/laporan/piutang-hutang/data-piutang');

        $semua->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);
        $this->assertSame(2, (int) $semua->json('recordsFiltered'));

        $lunas = $this->actingAs($this->user)
            ->get('/admin/laporan/piutang-hutang/data-piutang?status=lunas');
        $lunas->assertOk();
        $this->assertSame(1, (int) $lunas->json('recordsFiltered'));
        $this->assertSame('Lunas', $lunas->json('data.0.status'));
    }
}
