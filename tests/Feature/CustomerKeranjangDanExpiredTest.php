<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\Kategori;
use App\Models\Keranjang;
use App\Models\Merk;
use App\Models\Pembayaran;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Services\MidtransService;
use App\Services\RiwayatStokService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerKeranjangDanExpiredTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    private Barang $barang;

    protected function setUp(): void
    {
        parent::setUp();

        $kategori = Kategori::create(['kategori' => 'Kamera']);
        $merk = Merk::create(['merk' => 'Sony']);

        $this->barang = Barang::create([
            'nama_barang' => 'Sony FX3 Cinema Line',
            'id_kategori' => $kategori->id,
            'id_merk' => $merk->id,
            'stok' => 5,
            'harga_sewa' => 500000,
            'denda_per_hari' => 100000,
        ]);

        $this->customer = Customer::create([
            'nama_lengkap' => 'Budi Santoso',
            'no_hp' => '081234567890',
            'password' => bcrypt('password123'),
        ]);
    }

    public function test_customer_dapat_menambahkan_barang_ke_keranjang(): void
    {
        $response = $this->actingAs($this->customer, 'customer')
            ->postJson(route('customer.keranjang.store'), [
                'id_barang' => $this->barang->id,
                'qty' => 2,
            ]);

        $response->assertOk()
            ->assertJson([
                'status' => 'success',
                'cart_count' => 1,
            ]);

        $this->assertDatabaseHas('keranjang', [
            'id_customer' => $this->customer->id,
            'id_barang' => $this->barang->id,
            'qty' => 2,
        ]);
    }

    public function test_customer_dapat_mengubah_qty_keranjang(): void
    {
        $item = Keranjang::create([
            'id_customer' => $this->customer->id,
            'id_barang' => $this->barang->id,
            'qty' => 1,
        ]);

        $response = $this->actingAs($this->customer, 'customer')
            ->putJson(route('customer.keranjang.update', $item->id), [
                'qty' => 3,
            ]);

        $response->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertDatabaseHas('keranjang', [
            'id' => $item->id,
            'qty' => 3,
        ]);
    }

    public function test_customer_dapat_checkout_keranjang_menghasilkan_sewa_asal_web_dan_potong_stok(): void
    {
        $this->mockMidtransQris();

        $item = Keranjang::create([
            'id_customer' => $this->customer->id,
            'id_barang' => $this->barang->id,
            'qty' => 2,
            'tgl_sewa' => now()->toDateString(),
            'tgl_akhir_sewa' => now()->addDays(2)->toDateString(),
        ]);

        $response = $this->actingAs($this->customer, 'customer')
            ->postJson(route('customer.keranjang.checkout'), [
                'items' => [
                    [
                        'id' => $item->id,
                        'qty' => 2,
                        'tgl_sewa' => now()->toDateString(),
                        'tgl_akhir_sewa' => now()->addDays(2)->toDateString(),
                    ],
                ],
            ]);

        $response->assertOk()
            ->assertJson(['status' => 'success']);

        // Sewa dibuat dengan asal_pesanan = 'web'
        $this->assertDatabaseHas('sewa', [
            'id_customer' => $this->customer->id,
            'asal_pesanan' => 'web',
            'status_pembayaran' => 'Pending',
        ]);

        // Stok barang berkurang dari 5 menjadi 3
        $this->assertEquals(3, $this->barang->fresh()->stok);

        // Item terhapus dari keranjang
        $this->assertDatabaseMissing('keranjang', ['id' => $item->id]);
    }

    public function test_command_bersihkan_expired_otomatis_hapus_sewa_web_dan_kembalikan_stok(): void
    {
        $stokService = app(RiwayatStokService::class);

        // Buat sewa asal web yang sudah melewati batas waktu expiry
        $sewa = Sewa::create([
            'tgl_sewa' => now()->subDays(2)->toDateString(),
            'tgl_akhir_sewa' => now()->toDateString(),
            'id_customer' => $this->customer->id,
            'total_biaya' => 1000000,
            'no_sewa' => 'SEWA-EXP-001',
            'status_pembayaran' => 'Pending',
            'asal_pesanan' => 'web',
        ]);

        $detail = SewaDetail::create([
            'id_sewa' => $sewa->id,
            'id_barang' => $this->barang->id,
            'harga_sewa_satuan' => 500000,
            'qty' => 2,
        ]);

        // Kurangi stok seperti saat booking
        $stokService->kurang($this->barang->id, 2, RiwayatStokService::KELUAR, ['id_sewa_detail' => $detail->id]);
        $this->assertEquals(3, $this->barang->fresh()->stok);

        // Buat pembayaran yang sudah expire
        Pembayaran::create([
            'id_sewa' => $sewa->id,
            'order_id' => 'QRIS-EXP-12345',
            'metode_pembayaran' => 'qris',
            'gross_amount' => 1000000,
            'transaction_status' => 'expire',
            'expiry_time' => now()->subHour()->toDateTimeString(),
        ]);

        // Jalankan artisan command sewa:bersihkan-expired
        $this->artisan('sewa:bersihkan-expired')
            ->assertSuccessful();

        // Sewa dan detail harus terhapus
        $this->assertDatabaseMissing('sewa', ['id' => $sewa->id]);
        $this->assertDatabaseMissing('sewa_detail', ['id' => $detail->id]);

        // Stok unit harus kembali menjadi 5
        $this->assertEquals(5, $this->barang->fresh()->stok);
    }

    public function test_customer_dapat_membatalkan_sewa_pending_dan_kembalikan_stok(): void
    {
        $stokService = app(RiwayatStokService::class);

        $sewa = Sewa::create([
            'tgl_sewa' => now()->toDateString(),
            'tgl_akhir_sewa' => now()->addDays(2)->toDateString(),
            'id_customer' => $this->customer->id,
            'total_biaya' => 1000000,
            'no_sewa' => 'SEWA-CANCEL-001',
            'status_pembayaran' => 'Pending',
            'asal_pesanan' => 'web',
        ]);

        $detail = SewaDetail::create([
            'id_sewa' => $sewa->id,
            'id_barang' => $this->barang->id,
            'harga_sewa_satuan' => 500000,
            'qty' => 2,
        ]);

        $stokService->kurang($this->barang->id, 2, RiwayatStokService::KELUAR, ['id_sewa_detail' => $detail->id]);
        $this->assertEquals(3, $this->barang->fresh()->stok);

        $response = $this->actingAs($this->customer, 'customer')
            ->postJson(route('customer.sewa.cancel', ['sewaId' => $sewa->id]));

        $response->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertDatabaseMissing('sewa', ['id' => $sewa->id]);
        $this->assertDatabaseMissing('sewa_detail', ['id' => $detail->id]);
        $this->assertEquals(5, $this->barang->fresh()->stok);
    }

    public function test_customer_tidak_dapat_membatalkan_sewa_yang_sudah_lunas(): void
    {
        $sewa = Sewa::create([
            'tgl_sewa' => now()->toDateString(),
            'tgl_akhir_sewa' => now()->addDays(2)->toDateString(),
            'id_customer' => $this->customer->id,
            'total_biaya' => 1000000,
            'no_sewa' => 'SEWA-PAID-001',
            'status_pembayaran' => 'Confirmed',
            'asal_pesanan' => 'web',
        ]);

        $response = $this->actingAs($this->customer, 'customer')
            ->postJson(route('customer.sewa.cancel', ['sewaId' => $sewa->id]));

        $response->assertStatus(422)
            ->assertJson(['status' => 'error']);

        $this->assertDatabaseHas('sewa', ['id' => $sewa->id]);
    }

    /**
     * Stub respons QRIS Midtrans agar pengujian tidak memanggil API eksternal.
     */
    private function mockMidtransQris(): void
    {
        $this->mock(MidtransService::class, function ($mock) {
            $mock->shouldReceive('generateOrderId')->andReturn('SEWA-TEST-002');
            $mock->shouldReceive('createQrisPayment')->andReturn([
                'transaction_id' => 'trx-test-002',
                'transaction_status' => 'pending',
                'transaction_time' => now()->toDateTimeString(),
                'expiry_time' => now()->addHour()->toDateTimeString(),
                'gross_amount' => '1000000.00',
                'currency' => 'IDR',
                'actions' => [
                    ['name' => 'generate-qr-code-v2', 'url' => 'https://example.test/qr'],
                ],
                'qr_string' => 'QRIS-TEST-002',
            ]);
            $mock->shouldReceive('ambilQrUrl')->andReturn('https://example.test/qr');
            $mock->shouldReceive('ambilQrString')->andReturn('QRIS-TEST-002');
        });
    }
}
