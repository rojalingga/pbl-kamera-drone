<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\PembelianUnit;
use App\Models\PembelianUnitDetail;
use App\Models\Perawatan;
use App\Models\PerawatanDetail;
use App\Models\Role;
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

    public function test_teknisi_hanya_melihat_notifikasi_perawatan(): void
    {
        $roleTeknisi = Role::firstOrCreate(['role' => 'Teknisi']);
        $teknisi = User::factory()->create(['id_role' => $roleTeknisi->id]);

        $barang = Barang::create([
            'nama_barang' => 'Lensa 50mm',
            'stok' => 1,
            'harga_sewa' => 50000,
        ]);

        // 1. Sewa telat (seharusnya tidak muncul untuk teknisi)
        $customer = Customer::create([
            'nama_lengkap' => 'Pelanggan Telat 2',
            'no_hp' => '081234567811',
            'password' => 'secret',
        ]);
        Sewa::create([
            'no_sewa' => 'SEWA-TELAT-002',
            'tgl_sewa' => Carbon::now()->subDays(5)->toDateString(),
            'tgl_akhir_sewa' => Carbon::now()->subDays(2)->toDateString(),
            'id_customer' => $customer->id,
            'total_biaya' => 200000,
            'id_users' => $this->user->id,
            'status_pembayaran' => Sewa::BAYAR_CONFIRMED,
            'asal_pesanan' => Sewa::ASAL_ADMIN,
        ]);

        // 2. Pembelian pending (seharusnya tidak muncul untuk teknisi)
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

        // 3. Perawatan pending (harus muncul untuk teknisi)
        $perawatan = Perawatan::create([
            'tgl_perawatan' => Carbon::now()->toDateString(),
            'id_user' => $teknisi->id,
            'total_biaya_perawatan' => 75000,
            'is_owner_acc' => Perawatan::STATUS_PENDING,
        ]);
        PerawatanDetail::create([
            'id_perawatan' => $perawatan->id,
            'id_barang' => $barang->id,
            'qty' => 1,
            'biaya_perawatan' => 75000,
        ]);

        $response = $this->actingAs($teknisi)->getJson(route('notifications.index'));

        $response->assertOk()
            ->assertJsonPath('is_teknisi', true)
            ->assertJsonPath('counts.perawatan', 1)
            ->assertJsonPath('total', 1);

        $data = collect($response->json('data'));
        $this->assertTrue($data->every(fn ($item) => $item['kategori'] === 'Perawatan'));
    }
}
