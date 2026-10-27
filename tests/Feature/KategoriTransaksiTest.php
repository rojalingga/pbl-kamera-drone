<?php

namespace Tests\Feature;

use App\Models\KategoriTransaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KategoriTransaksiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    public function test_store_menerima_jenis_pemasukan_dan_pengeluaran(): void
    {
        foreach (['Pemasukan', 'Pengeluaran'] as $jenis) {
            $this->actingAs($this->user)
                ->postJson(route('kategori-transaksi.store'), [
                    'kategori' => 'Sewa '.$jenis,
                    'jenis' => $jenis,
                ])
                ->assertOk()
                ->assertJson(['status' => 'success']);
        }

        $this->assertSame(2, KategoriTransaksi::count());
        $this->assertSame(
            ['Pemasukan', 'Pengeluaran'],
            KategoriTransaksi::orderBy('id')->pluck('jenis')->all()
        );
    }

    public function test_store_menolak_jenis_di_luar_pilihan(): void
    {
        $this->actingAs($this->user)
            ->postJson(route('kategori-transaksi.store'), [
                'kategori' => 'Sewa Harian',
                'jenis' => 'Masuk',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['jenis']);

        $this->assertSame(0, KategoriTransaksi::count());
    }

    public function test_update_menolak_jenis_di_luar_pilihan(): void
    {
        $kategori = KategoriTransaksi::create([
            'kategori' => 'Sewa Harian',
            'jenis' => 'Pemasukan',
        ]);

        $this->actingAs($this->user)
            ->putJson(route('kategori-transaksi.update', $kategori->id), [
                'kategori' => 'Sewa Harian',
                'jenis' => 'Keluar',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['jenis']);

        $this->assertSame('Pemasukan', $kategori->fresh()->jenis);
    }
}
