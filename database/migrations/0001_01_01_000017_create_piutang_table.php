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
        Schema::create('piutang', function (Blueprint $table) {
            $table->id();
            $table->date('tgl_piutang')->nullable();
            $table->decimal('nominal', 15, 2)->nullable();
            $table->unsignedBigInteger('id_pengembalian')->nullable();
            $table->decimal('terbayar', 15, 2)->nullable();
            $table->date('tgl_pelunasan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('piutang');
    }
};
