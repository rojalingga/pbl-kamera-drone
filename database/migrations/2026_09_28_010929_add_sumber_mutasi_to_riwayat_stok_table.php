<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('riwayat_stok', function (Blueprint $table) {
            $table->date('tanggal')->nullable()->after('id_barang');
            $table->unsignedBigInteger('id_pengadaan_barang_detail')->nullable()->after('tanggal');
            $table->unsignedBigInteger('id_sewa_detail')->nullable()->after('id_pengadaan_barang_detail');
            $table->unsignedBigInteger('id_pengembalian_detail')->nullable()->after('id_sewa_detail');
            $table->unsignedBigInteger('id_perawatan_barang')->nullable()->after('id_pengembalian_detail');

            $table->index('id_pengadaan_barang_detail');
            $table->index('id_sewa_detail');
            $table->index('id_pengembalian_detail');
            $table->index('id_perawatan_barang');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('riwayat_stok', function (Blueprint $table) {
            $table->dropIndex([
                'id_pengadaan_barang_detail',
                'id_sewa_detail',
                'id_pengembalian_detail',
                'id_perawatan_barang',
            ]);

            $table->dropColumn([
                'tanggal',
                'id_pengadaan_barang_detail',
                'id_sewa_detail',
                'id_pengembalian_detail',
                'id_perawatan_barang',
            ]);
        });
    }
};
