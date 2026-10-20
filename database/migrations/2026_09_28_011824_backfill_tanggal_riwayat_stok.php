<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Pemetaan kolom sumber mutasi ke tabel dokumen sumbernya.
     */
    private const SUMBER = [
        'id_pengadaan_barang_detail' => 'pengadaan_barang_detail',
        'id_sewa_detail' => 'sewa_detail',
        'id_pengembalian_detail' => 'pengembalian_detail',
        'id_perawatan_barang' => 'perawatan_barang',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Baris tanpa dokumen sumber: tanggal diambil dari created_at-nya sendiri.
        DB::table('riwayat_stok')
            ->whereNull('tanggal')
            ->whereNull('id_pengadaan_barang_detail')
            ->whereNull('id_sewa_detail')
            ->whereNull('id_pengembalian_detail')
            ->whereNull('id_perawatan_barang')
            ->update(['tanggal' => DB::raw('DATE(created_at)')]);

        // Baris yang punya dokumen sumber: tanggal diambil dari created_at dokumen tersebut.
        $rows = DB::table('riwayat_stok')
            ->whereNull('tanggal')
            ->where(function ($query) {
                $query->whereNotNull('id_pengadaan_barang_detail')
                    ->orWhereNotNull('id_sewa_detail')
                    ->orWhereNotNull('id_pengembalian_detail')
                    ->orWhereNotNull('id_perawatan_barang');
            })
            ->get();

        foreach ($rows as $row) {
            $tanggal = null;

            foreach (self::SUMBER as $kolom => $tabel) {
                if (! $row->$kolom) {
                    continue;
                }

                $tanggal = DB::table($tabel)->where('id', $row->$kolom)->value('created_at');

                if ($tanggal) {
                    break;
                }
            }

            DB::table('riwayat_stok')->where('id', $row->id)->update([
                'tanggal' => Carbon::parse($tanggal ?? $row->created_at)->toDateString(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('riwayat_stok')->update(['tanggal' => null]);
    }
};
