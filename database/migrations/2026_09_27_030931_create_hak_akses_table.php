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
        Schema::create('hak_akses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_user');
            $table->unsignedBigInteger('id_menu');
            $table->boolean('lihat')->default(0);
            $table->boolean('beranda')->default(0);
            $table->boolean('tambah')->default(0);
            $table->boolean('edit')->default(0);
            $table->boolean('hapus')->default(0);

            $table->unique(['id_user', 'id_menu']);
            $table->index('id_menu');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hak_akses');
    }
};
