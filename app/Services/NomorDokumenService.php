<?php

namespace App\Services;

use App\Models\Pemasukan;
use App\Models\Pengembalian;
use App\Models\Perawatan;
use App\Models\Rekening;
use App\Models\Sewa;
use Illuminate\Support\Carbon;

class NomorDokumenService
{
    public function noSewa(?string $tanggal = null): string
    {
        return $this->berikutnya('SW-', Sewa::class, 'no_sewa', $tanggal);
    }

    public function noKwitansi(?string $tanggal = null): string
    {
        return $this->berikutnya('KWT-', Pemasukan::class, 'no_kwitansi', $tanggal);
    }

    public function noNotaPerawatan(?string $tanggal = null): string
    {
        return $this->berikutnya('PRT-', Perawatan::class, 'no_kwitansi', $tanggal);
    }

    public function keteranganPembayaranSewa(Sewa $sewa, ?Rekening $rekening, int $nominal, ?string $tanggal = null): string
    {
        $sewa->loadMissing('customer');

        $tgl = $tanggal
            ? Carbon::parse($tanggal)->locale('id')->translatedFormat('j F Y')
            : Carbon::now()->locale('id')->translatedFormat('j F Y');

        return 'Pembayaran Transaksi Sewa #'.($sewa->no_sewa ?? '-')
            .' tanggal '.$tgl
            .' oleh '.($sewa->customer?->nama_lengkap ?? '-')
            .' dengan nominal Rp.'.number_format($nominal, 0, ',', '.')
            .' di rekening '.($rekening?->nama_rek ?? '-');
    }

    public function keteranganPembayaranDenda(Pengembalian $pengembalian, ?Rekening $rekening, int $nominal, ?string $tanggal = null): string
    {
        $pengembalian->loadMissing('sewa.customer');

        $tgl = $tanggal
            ? Carbon::parse($tanggal)->locale('id')->translatedFormat('j F Y')
            : Carbon::now()->locale('id')->translatedFormat('j F Y');

        return 'Pembayaran Denda Pengembalian #'.($pengembalian->sewa?->no_sewa ?? '-')
            .' tanggal '.$tgl
            .' oleh '.($pengembalian->sewa?->customer?->nama_lengkap ?? '-')
            .' dengan nominal Rp.'.number_format($nominal, 0, ',', '.')
            .' di rekening '.($rekening?->nama_rek ?? '-');
    }

    public function keteranganPembayaranPerawatan(Perawatan $perawatan, ?Rekening $rekening, int $nominal, ?string $tanggal = null): string
    {
        $perawatan->loadMissing('user');

        $tgl = $tanggal
            ? Carbon::parse($tanggal)->locale('id')->translatedFormat('j F Y')
            : Carbon::now()->locale('id')->translatedFormat('j F Y');

        return 'Pembayaran Perawatan #'.($perawatan->no_kwitansi ?? '-')
            .' tanggal '.$perawatan->tgl_perawatan?->locale('id')->translatedFormat('j F Y')
            .' dibayarkan pada '.$tgl
            .' oleh '.($perawatan->user?->name ?? '-')
            .' dengan nominal Rp.'.number_format($nominal, 0, ',', '.')
            .' di rekening '.($rekening?->nama_rek ?? '-');
    }

    private function berikutnya(string $prefix, string $model, string $kolom, ?string $tanggal): string
    {
        $hari = $tanggal ? Carbon::parse($tanggal)->format('Ymd') : now()->format('Ymd');

        $terakhir = $model::where($kolom, 'like', $prefix.$hari.'-%')->orderByDesc($kolom)->value($kolom);

        $urut = 1;

        if (is_string($terakhir) && preg_match('/(\d+)$/', $terakhir, $cocok)) {
            $urut = (int) $cocok[1] + 1;
        }

        return $prefix.$hari.'-'.str_pad((string) $urut, 3, '0', STR_PAD_LEFT);
    }
}
