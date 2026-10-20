<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\User;
use App\Services\RiwayatStokService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InventoriMenuTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventori_pages_render_inertia_components(): void
    {
        $user = User::factory()->create();

        $pages = [
            '/admin/inventori/riwayat-stok' => 'Admin/Inventori/RiwayatStok/Index',
            '/admin/inventori/pengadaan-barang' => 'Admin/Inventori/PengadaanBarang/Index',
        ];

        foreach ($pages as $url => $component) {
            $this->actingAs($user)
                ->get($url)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component($component)
                    ->has('permissions')
                    ->has('permissions.tambah')
                    ->has('permissions.edit')
                    ->has('permissions.hapus'));
        }
    }

    public function test_pengadaan_page_menerima_daftar_barang(): void
    {
        $user = User::factory()->create();

        Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 5,
            'harga_sewa' => 100000,
        ]);

        $this->actingAs($user)
            ->get('/admin/inventori/pengadaan-barang')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Inventori/PengadaanBarang/Index')
                ->has('barangs')
                ->where('barangs.0.nama_barang', 'Drone DJI'));
    }

    public function test_riwayat_stok_datatables_endpoints_return_json_daftar_barang(): void
    {
        $user = User::factory()->create();

        Barang::create([
            'nama_barang' => 'Kamera Sony A7',
            'stok' => 2,
            'harga_sewa' => 75000,
        ]);

        $response = $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/inventori/riwayat-stok');

        $response->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);

        $this->assertSame('Kamera Sony A7', $response->json('data.0.nama_barang'));
    }

    public function test_pengadaan_datatables_endpoints_return_json(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/inventori/pengadaan-barang')
            ->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);
    }

    public function test_riwayat_stok_data_endpoint_mengembalikan_riwayat_per_barang(): void
    {
        $user = User::factory()->create();

        $barang = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 5,
            'harga_sewa' => 100000,
        ]);

        app(RiwayatStokService::class)->tambah($barang->id, 2);

        $response = $this->actingAs($user)
            ->getJson('/admin/inventori/riwayat-stok/data?id_barang='.$barang->id);

        $response->assertOk()->assertJson(['status' => 'success']);
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Masuk', $response->json('data.0.jenis'));
        $this->assertSame(2, $response->json('data.0.jumlah'));
        $this->assertSame(7, $response->json('data.0.stok'));
        $this->assertNotEmpty($response->json('data.0.tanggal'));
    }

    public function test_riwayat_stok_data_endpoint_validasi_id_barang(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/admin/inventori/riwayat-stok/data')
            ->assertStatus(422);

        $this->actingAs($user)
            ->getJson('/admin/inventori/riwayat-stok/data?id_barang=9999')
            ->assertStatus(422);
    }
}
