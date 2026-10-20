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
        Schema::create('sewa', function (Blueprint $table) {
            $table->id();
            $table->date('tgl_sewa')->nullable();
            $table->date('tgl_akhir_sewa')->nullable();
            $table->unsignedBigInteger('id_customer')->nullable();
            $table->decimal('total_biaya', 15, 2)->nullable();
            $table->string('foto_jaminan')->nullable();
            $table->unsignedBigInteger('id_users')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sewa');
    }
};
