<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sumber mutasi stok untuk perawatan kini menunjuk ke level detail,
     * sama seperti pengadaan, sewa, dan pengembalian.
     */
    public function up(): void
    {
        Schema::table('riwayat_stok', function (Blueprint $table) {
            $table->renameColumn('id_perawatan_barang', 'id_perawatan_detail');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('riwayat_stok', function (Blueprint $table) {
            $table->renameColumn('id_perawatan_detail', 'id_perawatan_barang');
        });
    }
};
