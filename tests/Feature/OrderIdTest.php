<?php

namespace Tests\Feature;

use App\Models\Sewa;
use App\Services\MidtransService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderIdTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_id_tidak_melebihi_batas_midtrans(): void
    {
        $sewa = Sewa::create([
            'no_sewa' => 'SW-20261013-001',
            'tgl_sewa' => '2026-10-13',
            'tgl_akhir_sewa' => '2026-10-14',
            'total_biaya' => 100000,
            'status_pembayaran' => Sewa::BAYAR_PENDING,
        ]);

        $mid = app(MidtransService::class);

        foreach (['SEWA', 'CASH', 'TRF'] as $prefix) {
            $this->assertLessThanOrEqual(50, strlen($mid->buildOrderId($prefix, $sewa)));
        }

        $this->assertLessThanOrEqual(50, strlen($mid->generateOrderId($sewa)));
    }

    public function test_order_id_tetap_valid_tanpa_nomor_dokumen(): void
    {
        $sewa = Sewa::create([
            'no_sewa' => null,
            'tgl_sewa' => '2026-10-13',
            'tgl_akhir_sewa' => '2026-10-14',
            'total_biaya' => 100000,
            'status_pembayaran' => Sewa::BAYAR_PENDING,
        ]);

        $orderId = app(MidtransService::class)->generateOrderId($sewa);

        $this->assertLessThanOrEqual(50, strlen($orderId));
        $this->assertStringStartsWith('SEWA-', $orderId);
    }

    public function test_order_id_memotong_referensi_yang_terlalu_panjang(): void
    {
        $sewa = Sewa::create([
            'no_sewa' => str_repeat('X', 200),
            'tgl_sewa' => '2026-10-13',
            'tgl_akhir_sewa' => '2026-10-14',
            'total_biaya' => 100000,
            'status_pembayaran' => Sewa::BAYAR_PENDING,
        ]);

        $this->assertLessThanOrEqual(50, strlen(app(MidtransService::class)->generateOrderId($sewa)));
    }
}
