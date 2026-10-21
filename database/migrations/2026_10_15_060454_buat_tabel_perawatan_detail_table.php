<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rincian item yang sedang perawatan. Satu baris = satu barang yang diservice.
     */
    public function up(): void
    {
        Schema::create('perawatan_detail', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perawatan');
            $table->char('id_barang', 36);
            $table->integer('qty');
            $table->decimal('biaya_perawatan', 15, 2)->nullable();
            $table->string('status', 50)->nullable()->default('Perawatan');
            $table->text('keterangan')->nullable();
            $table->timestamps();

            $table->index('id_perawatan');
            $table->index('id_barang');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('perawatan_detail');
    }
};
