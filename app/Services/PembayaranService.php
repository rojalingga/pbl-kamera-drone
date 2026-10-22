<?php

namespace App\Services;

use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Pembayaran;
use App\Models\Pengembalian;
use App\Models\Piutang;
use App\Models\Rekening;
use App\Models\Sewa;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Midtrans\Transaction;

class PembayaranService
{
    public function __construct(
        private MidtransService $midtrans,
        private RiwayatSaldoService $saldo,
        private NomorDokumenService $nomor,
        private RiwayatStokService $stok
    ) {}

    public function getPaymentInfo(string $sewaId, bool $syncMidtrans = false): array
    {
        $sewa = Sewa::with(['customer'])->withExists('pengembalians')->findOrFail($sewaId);

        $pembayaran = Pembayaran::where('id_sewa', $sewaId)
            ->orderByDesc('id')
            ->first();

        if ($pembayaran && $pembayaran->metode_pembayaran === 'qris' && $pembayaran->transaction_status === 'pending') {
            $pembayaran = $this->sinkronStatusQris($pembayaran, $syncMidtrans);
            if ($pembayaran === null) {
                return [
                    'sewa' => null,
                    'pembayaran' => null,
                    'is_expired_cancelled' => true,
                    'message' => 'Waktu pembayaran QRIS telah kedaluwarsa. Pemesanan sewa otomatis dibatalkan dan unit dikembalikan.',
                ];
            }
        }

        return [
            'sewa' => [
                'id' => $sewa->id,
                'no_sewa' => $sewa->no_sewa ?? 'SEWA-'.str_pad((string) $sewa->id, 5, '0', STR_PAD_LEFT),
                'customer' => $sewa->customer?->nama_lengkap ?? '-',
                'tgl_sewa' => $sewa->tgl_sewa ? Carbon::parse($sewa->tgl_sewa)->locale('id')->translatedFormat('j F Y') : '-',
                'tgl_akhir' => $sewa->tgl_akhir_sewa ? Carbon::parse($sewa->tgl_akhir_sewa)->locale('id')->translatedFormat('j F Y') : '-',
                'total_biaya' => number_format((float) ($sewa->total_biaya ?? 0), 0, ',', '.'),
                'status_pembayaran' => $sewa->status_pembayaran,
                'status_sewa' => $sewa->status_sewa,
                'status' => $sewa->status_pembayaran,
            ],
            'pembayaran' => $pembayaran,
        ];
    }

    public function initiatePayment(string $sewaId, string $metode): Pembayaran
    {
        $sewa = Sewa::with(['customer'])->withExists('pengembalians')->findOrFail($sewaId);

        if ($sewa->status_pembayaran !== Sewa::BAYAR_PENDING) {
            throw new \DomainException('Sewa ini tidak dapat dibayar karena statusnya bukan pending.');
        }

        if ($metode === 'qris') {
            return $this->initiateQris($sewa);
        }

        if ($metode === 'cash') {
            return $this->initiateCash($sewa);
        }

        if ($metode === 'transfer') {
            return $this->initiateTransfer($sewa);
        }

        throw new \InvalidArgumentException('Metode pembayaran tidak valid.');
    }

    /**
     * Info pembayaran denda untuk modal Bayar di menu pengembalian.
     *
     * @return array{pengembalian: array<string, mixed>, piutang: array<string, mixed>|null, pembayaran: ?Pembayaran}
     */
    public function getDendaPaymentInfo(int $pengembalianId, bool $syncMidtrans = false): array
    {
        $pengembalian = Pengembalian::with(['sewa.customer', 'dendas'])->findOrFail($pengembalianId);

        $piutang = Piutang::where('id_pengembalian', $pengembalianId)->first();

        $pembayaran = Pembayaran::where('id_pengembalian', $pengembalianId)
            ->orderByDesc('id')
            ->first();

        if ($pembayaran && $pembayaran->metode_pembayaran === 'qris' && $pembayaran->transaction_status === 'pending') {
            $pembayaran = $this->sinkronStatusQris($pembayaran, $syncMidtrans);
        }

        return [
            'pengembalian' => [
                'id' => $pengembalian->id,
                'no_sewa' => $pengembalian->sewa?->no_sewa ?? '-',
                'customer' => $pengembalian->sewa?->customer?->nama_lengkap ?? '-',
                'tgl_pengembalian' => $pengembalian->tgl_pengembalian ? Carbon::parse($pengembalian->tgl_pengembalian)->locale('id')->translatedFormat('j F Y') : '-',
                'total_denda' => number_format((float) ($pengembalian->total_denda ?? 0), 0, ',', '.'),
                'status_pembayaran' => $pengembalian->status_pembayaran,
            ],
            'piutang' => $piutang ? [
                'nominal' => (float) $piutang->nominal,
                'terbayar' => (float) ($piutang->terbayar ?? 0),
            ] : null,
            'pembayaran' => $pembayaran,
        ];
    }

    public function initiateDendaPayment(int $pengembalianId, string $metode): Pembayaran
    {
        $pengembalian = Pengembalian::with(['sewa.customer'])->findOrFail($pengembalianId);

        if ((float) ($pengembalian->total_denda ?? 0) <= 0) {
            throw new \DomainException('Pengembalian ini tidak memiliki denda yang harus dibayar.');
        }

        if ($pengembalian->status_pembayaran === 'Lunas') {
            throw new \DomainException('Denda pengembalian ini sudah lunas.');
        }

        if (! $pengembalian->sewa) {
            throw new \DomainException('Data sewa pengembalian tidak ditemukan.');
        }

        if ($metode === 'qris') {
            return $this->initiateDendaQris($pengembalian);
        }

        if ($metode === 'cash') {
            return $this->initiateDendaCash($pengembalian);
        }

        if ($metode === 'transfer') {
            return $this->initiateDendaTransfer($pengembalian);
        }

        throw new \InvalidArgumentException('Metode pembayaran tidak valid.');
    }

    private function pembayaranDendaAktif(Pengembalian $pengembalian, string $metode): ?Pembayaran
    {
        return Pembayaran::where('id_pengembalian', $pengembalian->id)
            ->where('metode_pembayaran', $metode)
            ->where('transaction_status', 'pending')
            ->when($metode === 'qris', fn ($query) => $query->where(function ($w) {
                $w->whereNull('expiry_time')->orWhere('expiry_time', '>', now('Asia/Jakarta'));
            }))
            ->latest()
            ->first();
    }

    private function initiateDendaQris(Pengembalian $pengembalian): Pembayaran
    {
        $aktif = $this->pembayaranDendaAktif($pengembalian, 'qris');

        if ($aktif) {
            return $aktif;
        }

        $orderId = $this->midtrans->generateDendaOrderId($pengembalian);
        $response = $this->midtrans->createQrisDendaPayment($pengembalian, $orderId);

        $expiryTime = null;
        $transId = $response['transaction_id'] ?? null;
        $transStatus = $response['transaction_status'] ?? 'pending';
        $transTime = $response['transaction_time'] ?? null;
        $currency = $response['currency'] ?? 'IDR';
        $grossAmount = $response['gross_amount'] ?? $pengembalian->total_denda;

        $qrUrl = $this->midtrans->ambilQrUrl($response);
        $qrString = $this->midtrans->ambilQrString($response);

        if (! empty($response['expiry_time'])) {
            $expiryTime = Carbon::parse($response['expiry_time'])->toDateTimeString();
        }

        return Pembayaran::create([
            'id_sewa' => $pengembalian->id_sewa,
            'id_pengembalian' => $pengembalian->id,
            'order_id' => $orderId,
            'transaction_id' => $transId,
            'payment_type' => 'qris',
            'metode_pembayaran' => 'qris',
            'gross_amount' => $grossAmount,
            'currency' => $currency,
            'transaction_status' => $transStatus,
            'fraud_status' => $response['fraud_status'] ?? null,
            'qr_url' => $qrUrl,
            'qr_string' => $qrString,
            'transaction_time' => $transTime ? Carbon::parse($transTime)->toDateTimeString() : now(),
            'expiry_time' => $expiryTime,
        ]);
    }

    private function initiateDendaCash(Pengembalian $pengembalian): Pembayaran
    {
        $aktif = $this->pembayaranDendaAktif($pengembalian, 'cash');

        if ($aktif) {
            return $aktif;
        }

        return Pembayaran::create([
            'id_sewa' => $pengembalian->id_sewa,
            'id_pengembalian' => $pengembalian->id,
            'order_id' => $this->midtrans->buildOrderId('CASH', $pengembalian->sewa),
            'metode_pembayaran' => 'cash',
            'payment_type' => 'cash',
            'gross_amount' => $pengembalian->total_denda,
            'currency' => 'IDR',
            'transaction_status' => 'pending',
            'transaction_time' => now(),
        ]);
    }

    private function initiateDendaTransfer(Pengembalian $pengembalian): Pembayaran
    {
        $aktif = $this->pembayaranDendaAktif($pengembalian, 'transfer');

        if ($aktif) {
            return $aktif;
        }

        return Pembayaran::create([
            'id_sewa' => $pengembalian->id_sewa,
            'id_pengembalian' => $pengembalian->id,
            'order_id' => $this->midtrans->buildOrderId('TRF', $pengembalian->sewa),
            'metode_pembayaran' => 'transfer',
            'payment_type' => 'transfer',
            'gross_amount' => $pengembalian->total_denda,
            'currency' => 'IDR',
            'transaction_status' => 'pending',
            'transaction_time' => now(),
        ]);
    }

    /**
     * Terapkan pelunasan denda: piutang lunas, pengembalian Lunas,
     * pemasukan kategori Pembayaran Denda, dan saldo rekening.
     *
     * Dipanggil di dalam transaksi database oleh pemanggil.
     */
    private function terapkanPelunasanDenda(Pembayaran $pembayaran, Pengembalian $pengembalian, string $tglPemasukan): void
    {
        $piutang = Piutang::where('id_pengembalian', $pengembalian->id)->first();

        if ($piutang) {
            $piutang->update([
                'nominal' => $pengembalian->total_denda,
                'terbayar' => $pengembalian->total_denda,
                'tgl_pelunasan' => now()->toDateString(),
            ]);
        }

        $pengembalian->update(['status_pembayaran' => 'Lunas']);

        $sudahAdaPemasukan = Pemasukan::where('id_pembayaran', $pembayaran->id)->exists();

        if (! $sudahAdaPemasukan) {
            $kategori = KategoriTransaksi::where('kategori', 'Pembayaran Denda')
                ->where('jenis', 'Pemasukan')
                ->first()
                ?? KategoriTransaksi::where('jenis', 'Pemasukan')->first();

            $idRekening = RiwayatSaldoService::rekeningUntukMetode($pembayaran->metode_pembayaran);

            $rekening = $idRekening ? Rekening::find($idRekening) : null;
            $nominal = (int) $pembayaran->gross_amount;

            $pemasukan = Pemasukan::create([
                'tgl_pemasukan' => $tglPemasukan,
                'nominal' => $nominal,
                'id_kategori_transaksi' => $kategori?->id,
                'id_rekening' => $idRekening,
                'id_sewa' => $pengembalian->id_sewa,
                'id_pengembalian' => $pengembalian->id,
                'id_pembayaran' => $pembayaran->id,
                'no_kwitansi' => $this->nomor->noKwitansi($tglPemasukan),
                'keterangan' => $this->nomor->keteranganPembayaranDenda($pengembalian, $rekening, $nominal, $tglPemasukan),
            ]);

            if ($idRekening) {
                $this->saldo->tambah($idRekening, $nominal, RiwayatSaldoService::MASUK, ['id_pemasukan' => $pemasukan->id], $pemasukan->tgl_pemasukan);
            }
        }
    }

    /**
     * Selesaikan pembayaran denda manual (cash/transfer terkonfirmasi atau QRIS simulate).
     */
    private function selesaikanDenda(Pembayaran $pembayaran): Pembayaran
    {
        return DB::transaction(function () use ($pembayaran) {
            $pembayaran = Pembayaran::lockForUpdate()->findOrFail($pembayaran->id);

            if ($pembayaran->transaction_status === 'settlement') {
                return $pembayaran;
            }

            $pengembalian = Pengembalian::lockForUpdate()->findOrFail($pembayaran->id_pengembalian);

            $pembayaran->update([
                'transaction_status' => 'settlement',
                'settlement_time' => now(),
            ]);

            $this->terapkanPelunasanDenda($pembayaran, $pengembalian, now()->toDateString());

            return $pembayaran;
        });
    }

    /**
     * Batalkan sewa yang berasal dari web dan kembalikan stoknya jika pembayaran kadaluwarsa/batal.
     */
    public function batalkanSewaWebExpired(Sewa $sewa): bool
    {
        if ($sewa->asal_pesanan !== Sewa::ASAL_WEB || $sewa->status_pembayaran === Sewa::BAYAR_CONFIRMED) {
            return false;
        }

        return DB::transaction(function () use ($sewa) {
            $sewa->loadMissing('details');

            foreach ($sewa->details as $detail) {
                $this->stok->batalkanKeluar(
                    $detail->id_barang,
                    (int) $detail->qty,
                    ['id_sewa_detail' => $detail->id]
                );
                $detail->delete();
            }

            Pembayaran::where('id_sewa', $sewa->id)->delete();
            $sewa->delete();

            Log::info("Sewa web {$sewa->no_sewa} otomatis dihapus dan stok dikembalikan karena pembayaran expired.");

            return true;
        });
    }

    private function sinkronStatusQris(Pembayaran $pembayaran, bool $syncMidtrans): ?Pembayaran
    {
        $isExpiredLocal = $pembayaran->expiry_time && Carbon::parse($pembayaran->expiry_time, 'Asia/Jakarta')->isPast();

        if ($isExpiredLocal) {
            $pembayaran->update(['transaction_status' => 'expire']);

            if ($pembayaran->id_sewa) {
                $sewa = Sewa::find($pembayaran->id_sewa);
                if ($sewa && $sewa->asal_pesanan === Sewa::ASAL_WEB) {
                    $this->batalkanSewaWebExpired($sewa);

                    return null;
                }
            }

            return $pembayaran->fresh();
        }

        if (! $syncMidtrans) {
            return $pembayaran;
        }

        try {
            $status = (array) Transaction::status((string) $pembayaran->order_id);
        } catch (\Exception $e) {
            Log::warning('Gagal sinkron status Midtrans: '.$e->getMessage());

            return $pembayaran;
        }

        $statusMidtrans = $status['transaction_status'] ?? null;

        if ($statusMidtrans === 'settlement') {
            return $this->confirmManualPayment($pembayaran->id);
        }

        if (in_array($statusMidtrans, ['expire', 'cancel', 'deny', 'failure'], true)) {
            $pembayaran->update(['transaction_status' => $statusMidtrans]);

            if ($pembayaran->id_sewa) {
                $sewa = Sewa::find($pembayaran->id_sewa);
                if ($sewa && $sewa->asal_pesanan === Sewa::ASAL_WEB) {
                    $this->batalkanSewaWebExpired($sewa);

                    return null;
                }
            }

            return $pembayaran->fresh();
        }

        return $pembayaran;
    }

    private function initiateQris(Sewa $sewa): Pembayaran
    {
        $pembayaranAktif = Pembayaran::where('id_sewa', $sewa->id)
            ->where('metode_pembayaran', 'qris')
            ->where('transaction_status', 'pending')
            ->where(function ($query) {
                $query->whereNull('expiry_time')
                    ->orWhere('expiry_time', '>', now('Asia/Jakarta'));
            })
            ->latest()
            ->first();

        if ($pembayaranAktif) {
            return $pembayaranAktif;
        }

        $orderId = $this->midtrans->generateOrderId($sewa);
        $response = $this->midtrans->createQrisPayment($sewa, $orderId);

        $expiryTime = null;
        $transId = $response['transaction_id'] ?? null;
        $transStatus = $response['transaction_status'] ?? 'pending';
        $transTime = $response['transaction_time'] ?? null;
        $currency = $response['currency'] ?? 'IDR';
        $grossAmount = $response['gross_amount'] ?? $sewa->total_biaya;

        $qrUrl = $this->midtrans->ambilQrUrl($response);
        $qrString = $this->midtrans->ambilQrString($response);

        if (! empty($response['expiry_time'])) {
            $expiryTime = Carbon::parse($response['expiry_time'])->toDateTimeString();
        }

        return Pembayaran::create([
            'id_sewa' => $sewa->id,
            'order_id' => $orderId,
            'transaction_id' => $transId,
            'payment_type' => 'qris',
            'metode_pembayaran' => 'qris',
            'gross_amount' => $grossAmount,
            'currency' => $currency,
            'transaction_status' => $transStatus,
            'fraud_status' => $response['fraud_status'] ?? null,
            'qr_url' => $qrUrl,
            'qr_string' => $qrString,
            'transaction_time' => $transTime ? Carbon::parse($transTime)->toDateTimeString() : now(),
            'expiry_time' => $expiryTime,
        ]);
    }

    private function initiateCash(Sewa $sewa): Pembayaran
    {
        $pembayaranAktif = Pembayaran::where('id_sewa', $sewa->id)
            ->where('metode_pembayaran', 'cash')
            ->where('transaction_status', 'pending')
            ->latest()
            ->first();

        if ($pembayaranAktif) {
            return $pembayaranAktif;
        }

        return Pembayaran::create([
            'id_sewa' => $sewa->id,
            'order_id' => $this->midtrans->buildOrderId('CASH', $sewa),
            'metode_pembayaran' => 'cash',
            'payment_type' => 'cash',
            'gross_amount' => $sewa->total_biaya,
            'currency' => 'IDR',
            'transaction_status' => 'pending',
            'transaction_time' => now(),
        ]);
    }

    private function initiateTransfer(Sewa $sewa): Pembayaran
    {
        $pembayaranAktif = Pembayaran::where('id_sewa', $sewa->id)
            ->where('metode_pembayaran', 'transfer')
            ->where('transaction_status', 'pending')
            ->latest()
            ->first();

        if ($pembayaranAktif) {
            return $pembayaranAktif;
        }

        return Pembayaran::create([
            'id_sewa' => $sewa->id,
            'order_id' => $this->midtrans->buildOrderId('TRF', $sewa),
            'metode_pembayaran' => 'transfer',
            'payment_type' => 'transfer',
            'gross_amount' => $sewa->total_biaya,
            'currency' => 'IDR',
            'transaction_status' => 'pending',
            'transaction_time' => now(),
        ]);
    }

    public function simulateSettlement(int $pembayaranId): Pembayaran
    {
        if (App::isProduction()) {
            throw new \DomainException('Simulasi pembayaran hanya tersedia di lingkungan pengembangan.');
        }

        $pembayaran = Pembayaran::findOrFail($pembayaranId);

        if ($pembayaran->metode_pembayaran !== 'qris' || $pembayaran->transaction_status !== 'pending') {
            throw new \DomainException('Simulasi hanya untuk pembayaran QRIS yang masih pending.');
        }

        return $this->confirmManualPayment($pembayaran->id);
    }

    public function confirmManualPayment(int $pembayaranId): Pembayaran
    {
        $cek = Pembayaran::findOrFail($pembayaranId);

        if ($cek->id_pengembalian) {
            return $this->selesaikanDenda($cek);
        }

        return DB::transaction(function () use ($pembayaranId) {
            $pembayaran = Pembayaran::lockForUpdate()->findOrFail($pembayaranId);

            if ($pembayaran->transaction_status === 'settlement') {
                return $pembayaran;
            }

            $sewa = Sewa::lockForUpdate()->findOrFail($pembayaran->id_sewa);

            $pembayaran->update([
                'transaction_status' => 'settlement',
                'settlement_time' => now(),
            ]);

            $sewa->update([
                'status_pembayaran' => Sewa::BAYAR_CONFIRMED,
            ]);

            $sudahAdaPemasukan = Pemasukan::where('id_pembayaran', $pembayaran->id)->exists();

            if (! $sudahAdaPemasukan) {
                $kategori = KategoriTransaksi::where('kategori', 'Sewa')
                    ->where('jenis', 'Pemasukan')
                    ->first()
                    ?? KategoriTransaksi::where('jenis', 'Pemasukan')->first();

                $idRekening = RiwayatSaldoService::rekeningUntukMetode($pembayaran->metode_pembayaran);

                $tglPemasukan = now()->toDateString();
                $rekening = $idRekening ? Rekening::find($idRekening) : null;

                $pemasukan = Pemasukan::create([
                    'tgl_pemasukan' => $tglPemasukan,
                    'nominal' => $pembayaran->gross_amount,
                    'id_kategori_transaksi' => $kategori?->id,
                    'id_rekening' => $idRekening,
                    'id_sewa' => $sewa->id,
                    'id_pembayaran' => $pembayaran->id,
                    'no_kwitansi' => $this->nomor->noKwitansi($tglPemasukan),
                    'keterangan' => $this->nomor->keteranganPembayaranSewa($sewa, $rekening, (int) $pembayaran->gross_amount, $tglPemasukan),
                ]);

                if ($idRekening) {
                    $this->saldo->tambah($idRekening, (int) $pembayaran->gross_amount, RiwayatSaldoService::MASUK, ['id_pemasukan' => $pemasukan->id], $pemasukan->tgl_pemasukan);
                }
            }

            return $pembayaran;
        });
    }

    /**
     * Terapkan notifikasi Midtrans untuk pembayaran denda.
     *
     * @return array{status: string}
     */
    private function webhookDenda(Pembayaran $pembayaran, string $transactionStatus, ?string $fraudStatus, ?string $settlementTime): array
    {
        $pembayaran->update([
            'transaction_status' => $transactionStatus,
            'fraud_status' => $fraudStatus,
            'settlement_time' => $settlementTime ? Carbon::parse($settlementTime)->toDateTimeString() : null,
        ]);

        if ($transactionStatus === 'settlement') {
            $pengembalian = Pengembalian::find($pembayaran->id_pengembalian);

            if ($pengembalian && $pengembalian->status_pembayaran !== 'Lunas') {
                $this->terapkanPelunasanDenda($pembayaran, $pengembalian, Carbon::parse($settlementTime ?? now())->toDateString());
            }
        }

        return ['status' => 'success'];
    }

    public function handleWebhook(array $payload): array
    {
        $orderId = $payload['order_id'] ?? '';
        $statusCode = $payload['status_code'] ?? '';
        $grossAmount = $payload['gross_amount'] ?? '';
        $sigKey = $payload['signature_key'] ?? '';

        if (! $this->midtrans->verifyWebhookSignature($orderId, $statusCode, $grossAmount, $sigKey)) {
            Log::warning('Midtrans webhook signature tidak valid. Order ID: '.$orderId);
            throw new \DomainException('Invalid signature key.');
        }

        $pembayaran = Pembayaran::where('order_id', $orderId)->first();

        if (! $pembayaran) {
            Log::warning('Midtrans webhook: pembayaran tidak ditemukan untuk order_id: '.$orderId);

            return ['status' => 'ignored'];
        }

        if (in_array($pembayaran->transaction_status, ['settlement', 'success'], true)) {
            Log::warning('Midtrans webhook: pembayaran sudah settlement, notifikasi diabaikan. Order: '.$orderId);

            return ['status' => 'ignored'];
        }

        $grossAmountPayload = (float) str_replace([',', '.00'], ['', ''], $grossAmount);
        $grossAmountRecord = (float) $pembayaran->gross_amount;

        if (abs($grossAmountPayload - $grossAmountRecord) > 1) {
            Log::error('Midtrans webhook: gross_amount tidak cocok. Order: '.$orderId);
            throw new \DomainException('Amount mismatch.');
        }

        $transactionStatus = $payload['transaction_status'] ?? '';
        $fraudStatus = $payload['fraud_status'] ?? null;
        $settlementTime = $payload['settlement_time'] ?? null;

        return DB::transaction(function () use ($pembayaran, $transactionStatus, $fraudStatus, $settlementTime) {
            if ($pembayaran->id_pengembalian) {
                return $this->webhookDenda($pembayaran, $transactionStatus, $fraudStatus, $settlementTime);
            }

            $pembayaran->update([
                'transaction_status' => $transactionStatus,
                'fraud_status' => $fraudStatus,
                'settlement_time' => $settlementTime ? Carbon::parse($settlementTime)->toDateTimeString() : null,
            ]);

            if ($transactionStatus === 'settlement') {
                $sewa = Sewa::find($pembayaran->id_sewa);

                if ($sewa && $sewa->status_pembayaran !== Sewa::BAYAR_CONFIRMED) {
                    $sewa->update([
                        'status_pembayaran' => Sewa::BAYAR_CONFIRMED,
                    ]);

                    $sudahAdaPemasukan = Pemasukan::where('id_pembayaran', $pembayaran->id)->exists();

                    if (! $sudahAdaPemasukan) {
                        $kategori = KategoriTransaksi::where('kategori', 'Sewa')
                            ->where('jenis', 'Pemasukan')
                            ->first()
                            ?? KategoriTransaksi::where('jenis', 'Pemasukan')->first();

                        $idRekening = RiwayatSaldoService::rekeningUntukMetode($pembayaran->metode_pembayaran);

                        $tglPemasukan = Carbon::parse($settlementTime ?? now())->toDateString();
                        $rekening = $idRekening ? Rekening::find($idRekening) : null;

                        $pemasukan = Pemasukan::create([
                            'tgl_pemasukan' => $tglPemasukan,
                            'nominal' => $pembayaran->gross_amount,
                            'id_kategori_transaksi' => $kategori?->id,
                            'id_rekening' => $idRekening,
                            'id_sewa' => $sewa->id,
                            'id_pembayaran' => $pembayaran->id,
                            'no_kwitansi' => $this->nomor->noKwitansi($tglPemasukan),
                            'keterangan' => $this->nomor->keteranganPembayaranSewa($sewa, $rekening, (int) $pembayaran->gross_amount, $tglPemasukan),
                        ]);

                        if ($idRekening) {
                            $this->saldo->tambah($idRekening, (int) $pembayaran->gross_amount, RiwayatSaldoService::MASUK, ['id_pemasukan' => $pemasukan->id], $pemasukan->tgl_pemasukan);
                        }
                    }
                }
            } elseif (in_array($transactionStatus, ['expire', 'cancel', 'deny', 'failure'], true)) {
                $sewa = Sewa::find($pembayaran->id_sewa);
                if ($sewa && $sewa->asal_pesanan === Sewa::ASAL_WEB) {
                    $this->batalkanSewaWebExpired($sewa);
                }
            }

            return ['status' => 'success'];
        });
    }
}
