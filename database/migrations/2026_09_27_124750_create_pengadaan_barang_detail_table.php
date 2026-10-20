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
        Schema::create('pengadaan_barang_detail', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_pengadaan_barang');
            $table->unsignedBigInteger('id_barang');
            $table->integer('jumlah');
            $table->timestamps();

            $table->index('id_pengadaan_barang');
            $table->index('id_barang');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pengadaan_barang_detail');
    }
};
