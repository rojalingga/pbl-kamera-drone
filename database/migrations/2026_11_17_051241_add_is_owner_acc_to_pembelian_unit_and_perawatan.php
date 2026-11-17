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
        Schema::table('pembelian_unit', function (Blueprint $table) {
            $table->tinyInteger('is_owner_acc')->default(1)->after('keterangan');
            $table->text('alasan_penolakan')->nullable()->after('is_owner_acc');
        });

        Schema::table('perawatan', function (Blueprint $table) {
            $table->tinyInteger('is_owner_acc')->default(1)->after('no_kwitansi');
            $table->text('alasan_penolakan')->nullable()->after('is_owner_acc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pembelian_unit', function (Blueprint $table) {
            $table->dropColumn(['is_owner_acc', 'alasan_penolakan']);
        });

        Schema::table('perawatan', function (Blueprint $table) {
            $table->dropColumn(['is_owner_acc', 'alasan_penolakan']);
        });
    }
};
