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
        Schema::create('sewa_detail', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_sewa')->nullable();
            $table->unsignedBigInteger('id_barang')->nullable();
            $table->decimal('harga_sewa_satuan', 15, 2)->nullable();
            $table->integer('qty')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sewa_detail');
    }
};
