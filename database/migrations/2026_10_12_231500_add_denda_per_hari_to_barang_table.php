<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tarif denda keterlambatan per hari untuk tiap barang.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barang', function (Blueprint $table): void {
            $table->bigInteger('denda_per_hari')->nullable()->after('harga_sewa');
        });
    }

    public function down(): void
    {
        Schema::table('barang', function (Blueprint $table): void {
            $table->dropColumn('denda_per_hari');
        });
    }
};
