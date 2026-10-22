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
        Schema::create('pemasukan', function (Blueprint $table) {
            $table->id();
            $table->date('tgl_pemasukan')->nullable();
            $table->decimal('nominal', 15, 2)->nullable();
            $table->unsignedBigInteger('id_kategori_transaksi')->nullable();
            $table->string('lampiran')->nullable();
            $table->string('no_kwitansi', 100)->nullable();
            $table->unsignedBigInteger('id_sewa')->nullable();
            $table->unsignedBigInteger('id_pengembalian')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pemasukan');
    }
};
