<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Alihkan relasi pengeluaran dari id_perawatan_barang ke id_perawatan,
     * karena tabel induknya sudah di-rename menjadi perawatan.
     */
    public function up(): void
    {
        Schema::table('pengeluaran', function (Blueprint $table) {
            $table->renameColumn('id_perawatan_barang', 'id_perawatan');
        });

        Schema::table('pengeluaran', function (Blueprint $table) {
            $table->index('id_perawatan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pengeluaran', function (Blueprint $table) {
            $table->dropIndex(['id_perawatan']);
        });

        Schema::table('pengeluaran', function (Blueprint $table) {
            $table->renameColumn('id_perawatan', 'id_perawatan_barang');
        });
    }
};
