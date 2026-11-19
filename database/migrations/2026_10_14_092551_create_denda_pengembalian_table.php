<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rincian denda pengembalian per barang.
 *
 * - Tabel baru `denda_pengembalian`: id, id_pengembalian, id_sewa_detail,
 *   jenis_denda (enum), nominal_denda (bigint). Semua kolom nullable.
 * - `pengembalian.status` diganti `status_pembayaran` (enum Lunas|Belum Lunas),
 *   diisi awal dari total_denda yang sudah ada.
 * - `pengembalian_detail.status` dihapus karena tidak dipakai.
 */
return new class extends Migration
{
    /** Jenis denda yang sah. */
    private const JENIS = ['Denda Keterlambatan', 'Denda Kerusakan', 'Denda Kehilangan'];

    /** Status pembayaran denda yang sah. */
    private const BAYAR = ['Lunas', 'Belum Lunas'];

    public function up(): void
    {
        Schema::create('denda_pengembalian', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('id_pengembalian')->nullable();
            $table->unsignedBigInteger('id_sewa_detail')->nullable();
            $table->enum('jenis_denda', self::JENIS)->nullable();
            $table->bigInteger('nominal_denda')->nullable();
            $table->timestamps();
        });

        Schema::table('pengembalian', function (Blueprint $table): void {
            $table->enum('status_pembayaran', self::BAYAR)->nullable()->after('total_denda');
        });

        DB::table('pengembalian')->update([
            'status_pembayaran' => DB::raw("CASE WHEN COALESCE(total_denda, 0) > 0 THEN 'Belum Lunas' ELSE 'Lunas' END"),
        ]);

        Schema::table('pengembalian', function (Blueprint $table): void {
            $table->dropColumn('status');
        });

        Schema::table('pengembalian_detail', function (Blueprint $table): void {
            $table->dropColumn('status');
        });
    }

    public function down(): void
    {
        Schema::table('pengembalian_detail', function (Blueprint $table): void {
            $table->string('status', 50)->nullable()->after('qty_pengembalian');
        });

        Schema::table('pengembalian', function (Blueprint $table): void {
            $table->string('status', 50)->nullable()->after('total_denda');
        });

        DB::table('pengembalian')->update(['status' => 'Kembali']);

        Schema::table('pengembalian', function (Blueprint $table): void {
            $table->dropColumn('status_pembayaran');
        });

        Schema::dropIfExists('denda_pengembalian');
    }
};
