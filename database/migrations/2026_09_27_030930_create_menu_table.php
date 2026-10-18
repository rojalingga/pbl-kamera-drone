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
        Schema::create('menu', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_parent')->default(0)->index();
            $table->string('title');
            $table->string('route_name');
            $table->string('icon', 25);
            $table->integer('urutan')->default(0);
            $table->boolean('lihat')->default(1);
            $table->boolean('tambah')->default(0);
            $table->boolean('edit')->default(0);
            $table->boolean('hapus')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu');
    }
};
