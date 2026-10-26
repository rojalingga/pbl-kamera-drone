<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\Kategori;
use App\Models\Merk;
use App\Models\Sewa;
use App\Services\MidtransService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class CustomerPublicFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_landing_and_catalog_accessible(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);

        $responseCatalog = $this->get('/katalog');
        $responseCatalog->assertStatus(200);

        $this->get('/catalog')->assertRedirect('/katalog');
        $this->get('/about-us')->assertRedirect('/tentang-kami');
    }

    public function test_customer_registration_and_login(): void
    {
        // 1. Register
        $registerRes = $this->postJson('/customer/register', [
            'nama_lengkap' => 'Budi Santoso',
            'no_hp' => '081234567890',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $registerRes->assertStatus(200);
        $registerRes->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('customer', [
            'nama_lengkap' => 'Budi Santoso',
            'no_hp' => '081234567890',
        ]);
        $this->assertTrue(Auth::guard('customer')->check());

        // 2. Logout
        $this->postJson('/customer/logout');
        $this->assertFalse(Auth::guard('customer')->check());

        // 3. Login
        $loginRes = $this->postJson('/customer/login', [
            'no_hp' => '081234567890',
            'password' => 'secret123',
        ]);

        $loginRes->assertStatus(200);
        $loginRes->assertJsonPath('status', 'success');
        $this->assertTrue(Auth::guard('customer')->check());
    }

    public function test_customer_booking_creates_sewa_and_deducts_stock(): void
    {
        $kategori = Kategori::create(['kategori' => 'Kamera']);
        $merk = Merk::create(['merk' => 'Sony']);
        $barang = Barang::create([
            'nama_barang' => 'Sony A7 IV',
            'id_kategori' => $kategori->id,
            'id_merk' => $merk->id,
            'harga_sewa' => 350000,
            'denda_per_hari' => 100000,
            'stok' => 5,
        ]);

        $customer = Customer::create([
            'nama_lengkap' => 'Rian Pratama',
            'no_hp' => '081299998888',
            'password' => 'password123',
        ]);

        $this->mockMidtransQris();

        $today = Carbon::today()->toDateString();
        $tomorrow = Carbon::today()->addDays(2)->toDateString();

        $response = $this->actingAs($customer, 'customer')->postJson('/booking', [
            'id_barang' => $barang->id,
            'qty' => 2,
            'tgl_sewa' => $today,
            'tgl_akhir_sewa' => $tomorrow,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');

        // Check stock deducted: 5 - 2 = 3
        $barang->refresh();
        $this->assertEquals(3, $barang->stok);

        // Check database sewa record
        $this->assertDatabaseHas('sewa', [
            'id_customer' => $customer->id,
            'total_biaya' => 350000 * 2 * 2, // 2 units * 2 days * 350k = 1,400,000
            'status_pembayaran' => Sewa::BAYAR_PENDING,
        ]);
    }

    public function test_customer_booking_fails_when_stock_insufficient(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Drone Mavic 3',
            'harga_sewa' => 500000,
            'stok' => 1,
        ]);

        $customer = Customer::create([
            'nama_lengkap' => 'Siti Aminah',
            'no_hp' => '08111222333',
            'password' => 'password123',
        ]);

        $response = $this->actingAs($customer, 'customer')->postJson('/booking', [
            'id_barang' => $barang->id,
            'qty' => 3, // exceeds stock of 1
            'tgl_sewa' => Carbon::today()->toDateString(),
            'tgl_akhir_sewa' => Carbon::today()->addDays(1)->toDateString(),
        ]);

        $response->assertStatus(422);
    }

    public function test_customer_authorization_on_payment_info(): void
    {
        $customer1 = Customer::create([
            'nama_lengkap' => 'Customer Satu',
            'no_hp' => '08110001',
            'password' => 'password123',
        ]);
        $customer2 = Customer::create([
            'nama_lengkap' => 'Customer Dua',
            'no_hp' => '08110002',
            'password' => 'password123',
        ]);

        $sewa1 = Sewa::create([
            'id_customer' => $customer1->id,
            'tgl_sewa' => Carbon::today()->toDateString(),
            'tgl_akhir_sewa' => Carbon::today()->addDay()->toDateString(),
            'total_biaya' => 300000,
            'status_pembayaran' => Sewa::BAYAR_PENDING,
        ]);

        // Customer 2 tries to access Customer 1's payment info
        $res = $this->actingAs($customer2, 'customer')->getJson("/customer/payment/{$sewa1->id}");
        $res->assertStatus(404);

        // Customer 1 can access own payment info
        $resOwner = $this->actingAs($customer1, 'customer')->getJson("/customer/payment/{$sewa1->id}");
        $resOwner->assertStatus(200);
    }

    public function test_guest_redirected_when_accessing_riwayat_sewa(): void
    {
        $response = $this->get('/riwayat-sewa');
        $response->assertRedirect('/');
    }

    /**
     * Stub respons QRIS Midtrans agar pengujian tidak memanggil API eksternal.
     */
    private function mockMidtransQris(): void
    {
        $this->mock(MidtransService::class, function ($mock) {
            $mock->shouldReceive('generateOrderId')->andReturn('SEWA-TEST-001');
            $mock->shouldReceive('createQrisPayment')->andReturn([
                'transaction_id' => 'trx-test-001',
                'transaction_status' => 'pending',
                'transaction_time' => now()->toDateTimeString(),
                'expiry_time' => now()->addHour()->toDateTimeString(),
                'gross_amount' => '1400000.00',
                'currency' => 'IDR',
                'actions' => [
                    ['name' => 'generate-qr-code-v2', 'url' => 'https://example.test/qr'],
                ],
                'qr_string' => 'QRIS-TEST-001',
            ]);
            $mock->shouldReceive('ambilQrUrl')->andReturn('https://example.test/qr');
            $mock->shouldReceive('ambilQrString')->andReturn('QRIS-TEST-001');
        });
    }
}
