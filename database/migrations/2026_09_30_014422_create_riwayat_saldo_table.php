<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riwayat_saldo', function (Blueprint $table) {
            $table->id();
            $table->date('tanggal')->nullable();
            $table->unsignedBigInteger('id_rekening')->nullable();
            $table->unsignedBigInteger('id_pemasukan')->nullable();
            $table->unsignedBigInteger('id_pengeluaran')->nullable();
            $table->string('jenis', 50)->nullable();
            $table->bigInteger('nominal')->nullable();
            $table->bigInteger('saldo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riwayat_saldo');
    }
};
