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
        Schema::table('kategori_transaksi', function (Blueprint $table) {
            $table->boolean('stt_fix')->default(false)->after('jenis');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kategori_transaksi', function (Blueprint $table) {
            $table->dropColumn('stt_fix');
        });
    }
};
