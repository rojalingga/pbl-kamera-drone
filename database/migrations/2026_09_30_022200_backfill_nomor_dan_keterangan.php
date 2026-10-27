<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->isiNoSewa();
        $this->isiNoKwitansi();
        $this->isiKeteranganSewa();
    }

    public function down(): void {}

    private function isiNoSewa(): void
    {
        $rows = DB::table('sewa')->whereNull('no_sewa')->orderBy('tgl_sewa')->orderBy('id')->get();

        foreach ($rows as $row) {
            $hari = $row->tgl_sewa ? Carbon::parse($row->tgl_sewa)->format('Ymd') : now()->format('Ymd');

            DB::table('sewa')->where('id', $row->id)->update([
                'no_sewa' => $this->nomorBerikut('SW-', 'sewa', 'no_sewa', $hari),
            ]);
        }
    }

    private function isiNoKwitansi(): void
    {
        $rows = DB::table('pemasukan')->whereNull('no_kwitansi')->orderBy('tgl_pemasukan')->orderBy('id')->get();

        foreach ($rows as $row) {
            $hari = $row->tgl_pemasukan ? Carbon::parse($row->tgl_pemasukan)->format('Ymd') : now()->format('Ymd');

            DB::table('pemasukan')->where('id', $row->id)->update([
                'no_kwitansi' => $this->nomorBerikut('KWT-', 'pemasukan', 'no_kwitansi', $hari),
            ]);
        }
    }

    private function isiKeteranganSewa(): void
    {
        $rows = DB::table('pemasukan')
            ->leftJoin('sewa', 'sewa.id', '=', 'pemasukan.id_sewa')
            ->leftJoin('customer', 'customer.id', '=', 'sewa.id_customer')
            ->leftJoin('rekening', 'rekening.id', '=', 'pemasukan.id_rekening')
            ->whereNotNull('pemasukan.id_sewa')
            ->whereNull('pemasukan.keterangan')
            ->orderBy('pemasukan.id')
            ->get([
                'pemasukan.id',
                'pemasukan.tgl_pemasukan',
                'pemasukan.nominal',
                'sewa.no_sewa',
                'customer.nama_lengkap',
                'rekening.nama_rek',
            ]);

        foreach ($rows as $row) {
            $tgl = $row->tgl_pemasukan
                ? Carbon::parse($row->tgl_pemasukan)->locale('id')->translatedFormat('j F Y')
                : Carbon::now()->locale('id')->translatedFormat('j F Y');

            DB::table('pemasukan')->where('id', $row->id)->update([
                'keterangan' => 'Pembayaran Transaksi Sewa #'.($row->no_sewa ?? '-')
                    .' tanggal '.$tgl
                    .' oleh '.($row->nama_lengkap ?? '-')
                    .' dengan nominal Rp.'.number_format((float) ($row->nominal ?? 0), 0, ',', '.')
                    .' di rekening '.($row->nama_rek ?? '-'),
            ]);
        }
    }

    private function nomorBerikut(string $prefix, string $tabel, string $kolom, string $hari): string
    {
        $terakhir = DB::table($tabel)->where($kolom, 'like', $prefix.$hari.'-%')->orderByDesc($kolom)->value($kolom);

        $urut = 1;

        if (is_string($terakhir) && preg_match('/(\d+)$/', $terakhir, $cocok)) {
            $urut = (int) $cocok[1] + 1;
        }

        return $prefix.$hari.'-'.str_pad((string) $urut, 3, '0', STR_PAD_LEFT);
    }
};
