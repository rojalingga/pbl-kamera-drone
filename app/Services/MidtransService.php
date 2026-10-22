<?php

namespace App\Services;

use App\Models\Pengembalian;
use App\Models\Sewa;
use Illuminate\Support\Str;
use Midtrans\Config;
use Midtrans\CoreApi;

class MidtransService
{
    /** Batas panjang `order_id` yang diterima Midtrans. */
    private const ORDER_ID_MAX = 50;

    public function __construct()
    {
        Config::$serverKey = config('services.midtrans.server_key');
        Config::$isProduction = (bool) config('services.midtrans.is_production', false);
        Config::$isSanitized = true;
        Config::$is3ds = true;
    }

    public function generateOrderId(Sewa $sewa): string
    {
        return $this->buildOrderId('SEWA', $sewa);
    }

    /**
     * Susun order_id yang dijamin tidak melebihi batas Midtrans.
     *
     * Midtrans menolak `transaction_details.order_id` lebih dari 50 karakter,
     * sedangkan `sewa.id` sekarang berupa UUID 36 karakter. Karena itu referensi
     * dokumen memakai `no_sewa` dan dipotong bila perlu, bukan UUID mentah.
     */
    public function buildOrderId(string $prefix, Sewa $sewa): string
    {
        $suffix = now()->format('YmdHis').strtoupper(Str::random(4));

        $referensi = $sewa->no_sewa ?: strtoupper(substr(str_replace('-', '', (string) $sewa->id), 0, 8));

        $maksReferensi = self::ORDER_ID_MAX - strlen($prefix) - 2 - strlen($suffix);
        $referensi = substr($referensi, 0, max(1, $maksReferensi));

        return $prefix.'-'.$referensi.'-'.$suffix;
    }

    public function generateDendaOrderId(Pengembalian $pengembalian): string
    {
        $sufiks = now()->format('YmdHis').strtoupper(Str::random(4));

        $referensi = $pengembalian->sewa?->no_sewa ?: ('DN'.$pengembalian->id);

        $maksReferensi = self::ORDER_ID_MAX - strlen('DENDA') - 2 - strlen($sufiks);
        $referensi = substr($referensi, 0, max(1, $maksReferensi));

        return 'DENDA-'.$referensi.'-'.$sufiks;
    }

    public function createQrisDendaPayment(Pengembalian $pengembalian, string $orderId): array
    {
        $pengembalian->loadMissing('sewa.customer');

        $customer = $pengembalian->sewa?->customer;

        $params = [
            'payment_type' => 'qris',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => (int) $pengembalian->total_denda,
            ],
            'customer_details' => [
                'first_name' => $customer?->nama_lengkap ?? 'Customer',
                'email' => $customer?->email ?? '',
                'phone' => $customer?->no_hp ?? '',
            ],
            'qris' => [
                'acquirer' => 'gopay',
            ],
        ];

        $response = CoreApi::charge($params);

        return (array) $response;
    }

    public function createQrisPayment(Sewa $sewa, string $orderId): array
    {
        $customer = $sewa->customer;

        $params = [
            'payment_type' => 'qris',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => (int) $sewa->total_biaya,
            ],
            'customer_details' => [
                'first_name' => $customer?->nama_lengkap ?? 'Customer',
                'email' => $customer?->email ?? '',
                'phone' => $customer?->no_hp ?? '',
            ],
            'qris' => [
                'acquirer' => 'gopay',
            ],
        ];

        $response = CoreApi::charge($params);

        return (array) $response;
    }

    /**
     * Ambil URL QR code dari response Midtrans.
     * Prioritaskan `generate-qr-code-v2` (URL statis, tidak butuh auth),
     * fallback ke `generate-qr-code` atau `qr_code_url`.
     */
    public function ambilQrUrl(array $response): ?string
    {
        $tautan = [];

        foreach ($response['actions'] ?? [] as $action) {
            $nama = is_array($action) ? ($action['name'] ?? '') : ($action->name ?? '');
            $tautan[$nama] = is_array($action) ? ($action['url'] ?? null) : ($action->url ?? null);
        }

        // v2 adalah URL statis tanpa autentikasi, lebih cocok untuk ditampilkan
        return $tautan['generate-qr-code-v2'] ?? $tautan['generate-qr-code'] ?? $response['qr_code_url'] ?? null;
    }

    /**
     * Ambil qr_string (data QRIS mentah) dari response Midtrans.
     * String ini digunakan oleh simulator Midtrans untuk verifikasi transaksi.
     */
    public function ambilQrString(array $response): ?string
    {
        return $response['qr_string'] ?? null;
    }

    public function verifyWebhookSignature(
        string $orderId,
        string $statusCode,
        string $grossAmount,
        string $signatureKey
    ): bool {
        $serverKey = config('services.midtrans.server_key');
        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.$serverKey);

        return hash_equals($expected, $signatureKey);
    }
}
