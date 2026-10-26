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
        Schema::create('keranjang', function (Blueprint $table) {
            $table->id();
            $table->char('id_customer', 36)->index();
            $table->char('id_barang', 36)->index();
            $table->integer('qty')->default(1);
            $table->date('tgl_sewa')->nullable();
            $table->date('tgl_akhir_sewa')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('keranjang');
    }
};
