<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\Kategori;
use App\Models\Merk;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use App\Models\RiwayatStok;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Models\User;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiCsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_public_ai_chat_accessible_without_auth(): void
    {
        $mock = $this->mock(GeminiService::class);
        $mock->shouldReceive('chat')
            ->once()
            ->withArgs(function ($history, $message, $scope) {
                return $message === 'Halo ada kamera apa aja?' && $scope === 'public';
            })
            ->andReturn('Kami punya kamera Sony dan Canon.');

        $response = $this->postJson('/ai-cs/chat', [
            'message' => 'Halo ada kamera apa aja?',
        ]);

        $response->assertOk()
            ->assertJson([
                'status' => 'success',
                'message' => 'Kami punya kamera Sony dan Canon.',
            ]);
    }

    public function test_public_ai_chat_validates_empty_message(): void
    {
        $response = $this->postJson('/ai-cs/chat', [
            'message' => '',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['message']);
    }

    public function test_admin_ai_chat_requires_authentication(): void
    {
        $response = $this->postJson('/admin/ai-cs/chat', [
            'message' => 'Cek laporan keuangan',
        ]);

        $response->assertUnauthorized();
    }

    public function test_admin_ai_chat_accessible_with_auth_and_calls_admin_scope(): void
    {
        $mock = $this->mock(GeminiService::class);
        $mock->shouldReceive('chat')
            ->once()
            ->withArgs(function ($history, $message, $scope) {
                return $message === 'Cek sewa jatuh tempo' && $scope === 'admin';
            })
            ->andReturn('Ada 1 transaksi yang jatuh tempo.');

        $response = $this->actingAs($this->user)->postJson('/admin/ai-cs/chat', [
            'message' => 'Cek sewa jatuh tempo',
        ]);

        $response->assertOk()
            ->assertJson([
                'status' => 'success',
                'message' => 'Ada 1 transaksi yang jatuh tempo.',
            ]);
    }

    public function test_gemini_service_blocks_admin_tools_in_public_scope(): void
    {
        $service = app(GeminiService::class);
        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('executeTool');

        $result = $method->invoke($service, 'admin_cek_transaksi_sewa', [], 'public');

        $this->assertArrayHasKey('error', $result);
        $this->assertStringContainsString('Akses ditolak', $result['error']);
    }

    public function test_gemini_service_executes_admin_tools_in_admin_scope(): void
    {
        $kategori = Kategori::create(['kategori' => 'Kamera']);
        $merk = Merk::create(['merk' => 'Sony']);
        $barang = Barang::create([
            'nama_barang' => 'Sony FX3 Cinema',
            'id_kategori' => $kategori->id,
            'id_merk' => $merk->id,
            'harga_sewa' => 500000,
            'stok' => 3,
        ]);

        $customer = Customer::create([
            'nama_lengkap' => 'Budi Santoso',
            'no_hp' => '08123456789',
        ]);

        $sewa = Sewa::create([
            'no_sewa' => 'SEWA-202610-0099',
            'tgl_sewa' => '2026-10-01',
            'tgl_akhir_sewa' => '2026-10-05',
            'id_customer' => $customer->id,
            'total_biaya' => 2000000,
            'status_pembayaran' => Sewa::BAYAR_PENDING,
            'id_users' => $this->user->id,
        ]);

        SewaDetail::create([
            'id_sewa' => $sewa->id,
            'id_barang' => $barang->id,
            'harga_sewa_satuan' => 500000,
            'qty' => 1,
        ]);

        $rekening = Rekening::create([
            'nama_rek' => 'BCA Bisnis',
            'no_rek' => '1234567890',
            'pemilik_rek' => 'SkyLens Rental',
            'saldo' => 15000000,
        ]);

        RiwayatSaldo::create([
            'id_rekening' => $rekening->id,
            'tanggal' => '2026-10-02',
            'jenis' => 'masuk',
            'nominal' => 2000000,
            'saldo_akhir' => 17000000,
        ]);

        RiwayatStok::create([
            'id_barang' => $barang->id,
            'tanggal' => '2026-10-01',
            'jenis' => 'keluar',
            'jumlah' => 1,
            'stok' => 2,
        ]);

        $service = app(GeminiService::class);
        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('executeTool');

        // Test 1: Cek transaksi sewa admin
        $resSewa = $method->invoke($service, 'admin_cek_transaksi_sewa', ['search' => 'Budi'], 'admin');
        $this->assertEquals(1, $resSewa['total_ditemukan']);
        $this->assertEquals('SEWA-202610-0099', $resSewa['transaksi'][0]['no_sewa']);

        // Test 2: Cek sewa jatuh tempo
        $resJatuhTempo = $method->invoke($service, 'admin_cek_sewa_jatuh_tempo', [], 'admin');
        $this->assertGreaterThanOrEqual(1, $resJatuhTempo['total_terlambat']);

        // Test 3: Cek ringkasan laporan keuangan
        $resKeuangan = $method->invoke($service, 'admin_ringkasan_laporan_keuangan', [], 'admin');
        $this->assertArrayHasKey('total_pemasukan', $resKeuangan);
        $this->assertArrayHasKey('total_saldo_semua_rekening', $resKeuangan);

        // Test 4: Cek mutasi riwayat stok
        $resMutasi = $method->invoke($service, 'admin_cek_inventori_mutasi_stok', ['nama_barang' => 'Sony'], 'admin');
        $this->assertEquals(1, $resMutasi['total_catatan']);
        $this->assertEquals('Sony FX3 Cinema', $resMutasi['riwayat_mutasi'][0]['barang']);
    }
}
