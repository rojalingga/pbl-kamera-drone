<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\PembelianUnit;
use App\Models\PembelianUnitDetail;
use App\Models\Perawatan;
use App\Models\PerawatanDetail;
use App\Models\Sewa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_mengambil_notifikasi_pengembalian_lewat_jatuh_tempo(): void
    {
        $customer = Customer::create([
            'nama_lengkap' => 'Pelanggan Telat',
            'no_hp' => '081234567899',
            'password' => 'secret',
        ]);

        $sewaTelat = Sewa::create([
            'no_sewa' => 'SEWA-TELAT-001',
            'tgl_sewa' => Carbon::now()->subDays(5)->toDateString(),
            'tgl_akhir_sewa' => Carbon::now()->subDays(2)->toDateString(),
            'id_customer' => $customer->id,
            'total_biaya' => 200000,
            'id_users' => $this->user->id,
            'status_pembayaran' => Sewa::BAYAR_CONFIRMED,
            'asal_pesanan' => Sewa::ASAL_ADMIN,
        ]);

        $response = $this->actingAs($this->user)->getJson(route('notifications.index'));

        $response->assertOk()
            ->assertJson(['status' => 'success'])
            ->assertJsonPath('counts.pengembalian', 1);

        $this->assertTrue(collect($response->json('data'))->contains('kategori', 'Pengembalian'));
    }

    public function test_mengambil_notifikasi_pembelian_dan_perawatan_butuh_persetujuan_owner(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Kamera Baru',
            'stok' => 0,
            'harga_sewa' => 100000,
        ]);

        $pembelian = PembelianUnit::create([
            'tanggal' => Carbon::now()->toDateString(),
            'keterangan' => 'Unit baru pending',
            'is_owner_acc' => PembelianUnit::STATUS_PENDING,
        ]);
        PembelianUnitDetail::create([
            'id_pembelian_unit' => $pembelian->id,
            'id_barang' => $barang->id,
            'harga_beli' => 5000000,
            'jumlah' => 1,
        ]);

        $perawatan = Perawatan::create([
            'tgl_perawatan' => Carbon::now()->toDateString(),
            'id_user' => $this->user->id,
            'total_biaya_perawatan' => 150000,
            'is_owner_acc' => Perawatan::STATUS_PENDING,
        ]);
        PerawatanDetail::create([
            'id_perawatan' => $perawatan->id,
            'id_barang' => $barang->id,
            'qty' => 1,
            'biaya_perawatan' => 150000,
        ]);

        $response = $this->actingAs($this->user)->getJson(route('notifications.index'));

        $response->assertOk()
            ->assertJsonPath('counts.pembelian', 1)
            ->assertJsonPath('counts.perawatan', 1)
            ->assertJsonPath('total', 2);
    }
}
