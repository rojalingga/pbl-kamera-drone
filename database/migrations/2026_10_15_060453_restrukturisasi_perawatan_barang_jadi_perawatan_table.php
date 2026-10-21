<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Renama tabel perawatan_barang menjadi perawatan, buang kolom
     * id_pengembalian_detail dan keterangan (keterangan pindah ke level detail),
     * ganti biaya_perbaikan menjadi total_biaya_perawatan, dan tambahkan
     * kolom pen pembayaran.
     */
    public function up(): void
    {
        Schema::rename('perawatan_barang', 'perawatan');

        Schema::table('perawatan', function (Blueprint $table) {
            $table->dropColumn(['id_pengembalian_detail', 'keterangan']);
        });

        Schema::table('perawatan', function (Blueprint $table) {
            $table->renameColumn('biaya_perbaikan', 'total_biaya_perawatan');
        });

        Schema::table('perawatan', function (Blueprint $table) {
            $table->unsignedBigInteger('id_user')->nullable()->after('tgl_perawatan');
            $table->string('status_pembayaran', 50)->nullable()->default('Belum Lunas')->after('total_biaya_perawatan');
            $table->string('no_kwitansi', 100)->nullable()->after('status_pembayaran');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('perawatan', function (Blueprint $table) {
            $table->dropColumn(['id_user', 'status_pembayaran', 'no_kwitansi']);
        });

        Schema::table('perawatan', function (Blueprint $table) {
            $table->renameColumn('total_biaya_perawatan', 'biaya_perbaikan');
        });

        Schema::table('perawatan', function (Blueprint $table) {
            $table->unsignedBigInteger('id_pengembalian_detail')->nullable()->after('id');
            $table->text('keterangan')->nullable();
        });

        Schema::rename('perawatan', 'perawatan_barang');
    }
};
