<?php

namespace App\Console\Commands;

use App\Models\Pembayaran;
use App\Models\Sewa;
use App\Services\PembayaranService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class BersihkanSewaWebExpired extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sewa:bersihkan-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Batalkan dan hapus sewa web yang pembayarannya expired dan kembalikan stok unit';

    /**
     * Execute the console command.
     */
    public function handle(PembayaranService $pembayaranService): int
    {
        $this->info('Memeriksa sewa web yang kedaluwarsa...');

        $now = now('Asia/Jakarta');

        // Cari sewa web yang status pembayaran masih pending
        $sewas = Sewa::with(['pembayarans', 'details'])
            ->where('asal_pesanan', Sewa::ASAL_WEB)
            ->where('status_pembayaran', Sewa::BAYAR_PENDING)
            ->get();

        $dibatalkan = 0;

        foreach ($sewas as $sewa) {
            $pembayaran = $sewa->pembayarans()->orderByDesc('id')->first();

            $isExpired = false;

            if ($pembayaran) {
                if (in_array($pembayaran->transaction_status, ['expire', 'cancel', 'deny', 'failure'], true)) {
                    $isExpired = true;
                } elseif ($pembayaran->expiry_time && Carbon::parse($pembayaran->expiry_time, 'Asia/Jakarta')->isPast()) {
                    $isExpired = true;
                }
            } else {
                // Jika tidak ada pembayaran dan sudah lebih dari 2 jam dibuat
                if ($sewa->created_at && Carbon::parse($sewa->created_at)->addHours(2)->isPast()) {
                    $isExpired = true;
                }
            }

            if ($isExpired) {
                $pembayaranService->batalkanSewaWebExpired($sewa);
                $this->line("Sewa {$sewa->no_sewa} berhasil dibatalkan dan stok dikembalikan.");
                $dibatalkan++;
            }
        }

        $this->info("Selesai. Total sewa web yang dibatalkan: {$dibatalkan}");

        return self::SUCCESS;
    }
}
