<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $rows = DB::table('pemasukan')
            ->whereNotNull('no_kwitansi')
            ->orderBy('tgl_pemasukan')
            ->orderBy('id')
            ->get();

        foreach ($rows as $row) {
            if (! $this->nomorOtomatisLama($row->no_kwitansi)) {
                continue;
            }

            $hari = $row->tgl_pemasukan ? Carbon::parse($row->tgl_pemasukan)->format('Ymd') : now()->format('Ymd');

            DB::table('pemasukan')->where('id', $row->id)->update([
                'no_kwitansi' => $this->nomorBerikut($hari),
            ]);
        }
    }

    public function down(): void {}

    private function nomorOtomatisLama(?string $nomor): bool
    {
        if (! is_string($nomor) || preg_match('/^KWT-\d{8}-\d{3}$/', $nomor)) {
            return false;
        }

        return (bool) preg_match('/^(SEWA-|CASH-|TRF-)/', $nomor)
            || (bool) preg_match('/^KW-\d+-\d{14}$/', $nomor);
    }

    private function nomorBerikut(string $hari): string
    {
        $terakhir = DB::table('pemasukan')->where('no_kwitansi', 'like', 'KWT-'.$hari.'-%')->orderByDesc('no_kwitansi')->value('no_kwitansi');

        $urut = 1;

        if (is_string($terakhir) && preg_match('/(\d+)$/', $terakhir, $cocok)) {
            $urut = (int) $cocok[1] + 1;
        }

        return 'KWT-'.$hari.'-'.str_pad((string) $urut, 3, '0', STR_PAD_LEFT);
    }
};
