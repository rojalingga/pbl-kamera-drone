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
        Schema::create('pembelian_unit_detail', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_pembelian_unit')->nullable();
            $table->unsignedBigInteger('id_barang')->nullable();
            $table->decimal('harga_beli', 15, 2)->nullable();
            $table->integer('jumlah')->nullable();
            $table->timestamps();

            $table->index('id_pembelian_unit');
            $table->index('id_barang');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pembelian_unit_detail');
    }
};
