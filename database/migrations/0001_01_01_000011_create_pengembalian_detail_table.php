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
        Schema::create('pengembalian_detail', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_pengembalian')->nullable();
            $table->unsignedBigInteger('id_sewa_detail')->nullable();
            $table->integer('qty_pengembalian')->nullable();
            $table->string('status', 50)->nullable();
            $table->text('keterangan')->nullable();
            $table->string('foto_unit_pengembalian')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pengembalian_detail');
    }
};
