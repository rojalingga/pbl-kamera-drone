<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pecah `sewa.status` menjadi dua status terpisah:
 *
 * - `status_pembayaran` (enum Pending|Confirmed): apakah uang sewa sudah masuk.
 * - `status_sewa`      (enum Pending|Periode Sewa|Dikembalikan|Denda): tahap siklus sewa.
 *
 * Kolom lama `status` dihapus setelah datanya dipindahkan.
 */
return new class extends Migration
{
    /** Nilai status pembayaran yang sah. */
    private const PEMBAYARAN = ['Pending', 'Confirmed'];

    /** Nilai status siklus sewa yang sah. */
    private const SEWA = ['Pending', 'Periode Sewa', 'Dikembalikan', 'Denda'];

    public function up(): void
    {
        Schema::table('sewa', function (Blueprint $table): void {
            $table->enum('status_pembayaran', self::PEMBAYARAN)->nullable()->after('id_users');
            $table->enum('status_sewa', self::SEWA)->nullable()->after('status_pembayaran');
        });

        DB::table('sewa')->whereNotNull('status')->update([
            'status_pembayaran' => DB::raw("CASE WHEN status = 'confirmed' THEN 'Confirmed' ELSE 'Pending' END"),
        ]);

        DB::table('sewa')->whereNotNull('status_pembayaran')->update([
            'status_sewa' => DB::raw("CASE WHEN status_pembayaran = 'Confirmed' THEN 'Periode Sewa' ELSE 'Pending' END"),
        ]);

        Schema::table('sewa', function (Blueprint $table): void {
            $table->dropColumn('status');
        });
    }

    public function down(): void
    {
        Schema::table('sewa', function (Blueprint $table): void {
            $table->string('status', 50)->nullable()->after('id_users');
        });

        DB::table('sewa')->update([
            'status' => DB::raw("CASE WHEN status_pembayaran = 'Confirmed' THEN 'confirmed' ELSE 'pending' END"),
        ]);

        Schema::table('sewa', function (Blueprint $table): void {
            $table->dropColumn(['status_pembayaran', 'status_sewa']);
        });
    }
};
