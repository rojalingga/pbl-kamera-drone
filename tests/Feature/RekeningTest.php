<?php

namespace Tests\Feature;

use App\Models\Rekening;
use App\Models\User;
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
        $this->withoutVite();
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
}
