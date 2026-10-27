<?php

namespace Tests\Feature;

use App\Models\Kategori;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MasterDataMenuTest extends TestCase
{
    use RefreshDatabase;

    public function test_master_data_pages_render_inertia_components(): void
    {
        $user = User::factory()->create();

        $pages = [
            '/admin/master-data/kategori' => 'Admin/MasterData/Kategori/Index',
            '/admin/master-data/merk' => 'Admin/MasterData/Merk/Index',
            '/admin/master-data/barang' => 'Admin/MasterData/Barang/Index',
            '/admin/master-data/customer' => 'Admin/MasterData/Customer/Index',
            '/admin/master-data/kategori-transaksi' => 'Admin/MasterData/KategoriTransaksi/Index',
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

    public function test_master_data_datatables_endpoints_return_json(): void
    {
        $user = User::factory()->create();

        foreach (['barang', 'customer', 'kategori-transaksi'] as $slug) {
            $this->actingAs($user)
                ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
                ->get('/admin/master-data/'.$slug)
                ->assertOk()
                ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);
        }
    }

    public function test_barang_page_receives_merk_and_kategori_options(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/admin/master-data/barang')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/MasterData/Barang/Index')
                ->has('merks')
                ->has('kategoris'));
    }

    public function test_datatables_output_keeps_ampersand_as_is(): void
    {
        $user = User::factory()->create();

        Kategori::create(['kategori' => 'Cleaning & Maintenance']);

        $response = $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/master-data/kategori');

        $response->assertOk();

        $this->assertSame('Cleaning & Maintenance', $response->json('data.0.kategori'));
    }
}
