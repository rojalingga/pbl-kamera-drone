<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\RiwayatStok;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SewaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    private Barang $barang;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->customer = Customer::create([
            'nama_lengkap' => 'Budi',
            'no_hp' => '081234567890',
        ]);
        $this->barang = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 10,
            'harga_sewa' => 50000,
        ]);
    }

    public function test_index_sewa_menampilkan_halaman_inertia(): void
    {
        $this->actingAs($this->user)
            ->get(route('sewa.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Transaksi/Sewa/Index')
                ->has('permissions')
                ->has('customers')
                ->has('barangs'));
    }

    public function test_store_sewa_with_items_reduces_stock(): void
    {
        $response = $this->actingAs($this->user)->postJson(route('sewa.store'), [
            'tgl_sewa' => '2026-09-27',
            'tgl_akhir_sewa' => '2026-09-30',
            'id_customer' => $this->customer->id,
            'items' => [
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 2],
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 1],
            ],
        ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        $sewa = Sewa::first();
        $this->assertNotNull($sewa);
        $this->assertSame(7, (int) $this->barang->fresh()->stok);
        $this->assertSame(2, SewaDetail::where('id_sewa', $sewa->id)->count());
        $this->assertSame(450000.0, (float) $sewa->total_biaya);
        $this->assertSame(Sewa::BAYAR_PENDING, $sewa->status_pembayaran);
        $this->assertSame(Sewa::ASAL_ADMIN, $sewa->asal_pesanan);
        $this->assertStringStartsWith('SW-', (string) $sewa->no_sewa);
    }

    public function test_update_sewa_syncs_items_and_stock(): void
    {
        $this->storeSewaDefault();

        $sewa = Sewa::first();
        $details = SewaDetail::where('id_sewa', $sewa->id)->orderBy('id')->get();

        $response = $this->actingAs($this->user)->putJson(route('sewa.update', $sewa->id), [
            'tgl_sewa' => '2026-09-27',
            'tgl_akhir_sewa' => '2026-09-30',
            'id_customer' => $this->customer->id,
            'items' => [
                ['id' => $details[0]->id, 'id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 1],
            ],
        ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        // 7 + 1 (qty 2->1) + 1 (item kedua dihapus) = 9
        $this->assertSame(9, (int) $this->barang->fresh()->stok);
        $this->assertSame(1, SewaDetail::where('id_sewa', $sewa->id)->count());
        $this->assertSame(150000.0, (float) $sewa->fresh()->total_biaya);
    }

    public function test_store_sewa_ditolak_bila_stok_tidak_cukup(): void
    {
        $response = $this->actingAs($this->user)->postJson(route('sewa.store'), [
            'tgl_sewa' => '2026-09-27',
            'tgl_akhir_sewa' => '2026-09-30',
            'id_customer' => $this->customer->id,
            'items' => [
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 11],
            ],
        ]);

        $response->assertStatus(422);

        // Kunci error memakai nama field apa adanya (mengandung titik).
        $this->assertSame(
            'Stok tidak mencukupi. Tersedia 10 unit.',
            $response->json('errors')['items.0.id_barang'][0] ?? null
        );

        // Transaksi di-rollback: stok utuh dan tidak ada sewa tersimpan.
        $this->assertSame(10, (int) $this->barang->fresh()->stok);
        $this->assertSame(0, Sewa::count());
        $this->assertSame(0, SewaDetail::count());
        $this->assertSame(0, RiwayatStok::count());
    }

    public function test_destroy_sewa_restores_stock(): void
    {
        $this->storeSewaDefault();

        $sewa = Sewa::first();

        $this->actingAs($this->user)
            ->deleteJson(route('sewa.destroy', $sewa->id))
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(10, (int) $this->barang->fresh()->stok);
        $this->assertSame(0, SewaDetail::count());
        $this->assertSame(0, Sewa::count());
        $this->assertSame(0, RiwayatStok::count());
    }

    public function test_store_sewa_ditolak_bila_tgl_akhir_sama_dengan_tgl_sewa(): void
    {
        $response = $this->actingAs($this->user)->postJson(route('sewa.store'), [
            'tgl_sewa' => '2026-09-27',
            'tgl_akhir_sewa' => '2026-09-27',
            'id_customer' => $this->customer->id,
            'items' => [
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tgl_akhir_sewa'])
            ->assertJsonPath('errors.tgl_akhir_sewa.0', 'Tanggal akhir sewa harus setelah tanggal sewa.');

        $this->assertSame(0, Sewa::count());
    }

    private function storeSewaDefault(): void
    {
        $this->actingAs($this->user)->postJson(route('sewa.store'), [
            'tgl_sewa' => '2026-09-27',
            'tgl_akhir_sewa' => '2026-09-30',
            'id_customer' => $this->customer->id,
            'items' => [
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 2],
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 1],
            ],
        ])->assertOk();
    }
}
