<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hapus kolom `sewa.status_sewa`.
 *
 * Tahap siklus sewa tidak lagi disimpan: `Pending`, `Proses Sewa`,
 * `Terlambat N hari`, dan `Pengembalian` dihitung realtime dari
 * `status_pembayaran`, `tgl_akhir_sewa`, dan ada/tidaknya pengembalian.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sewa', function (Blueprint $table): void {
            $table->dropColumn('status_sewa');
        });
    }

    public function down(): void
    {
        Schema::table('sewa', function (Blueprint $table): void {
            $table->enum('status_sewa', ['Pending', 'Proses Sewa', 'Terlambat', 'Dikembalikan'])
                ->nullable()
                ->after('status_pembayaran');
        });
    }
};
