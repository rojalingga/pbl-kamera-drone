<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sewa', function (Blueprint $table) {
            $table->bigInteger('total_biaya_baru')->nullable();
        });
        DB::table('sewa')->update(['total_biaya_baru' => DB::raw('total_biaya')]);
        Schema::table('sewa', function (Blueprint $table) {
            $table->dropColumn('total_biaya');
        });
        Schema::table('sewa', function (Blueprint $table) {
            $table->renameColumn('total_biaya_baru', 'total_biaya');
        });
        Schema::table('sewa_detail', function (Blueprint $table) {
            $table->bigInteger('harga_sewa_satuan_baru')->nullable();
        });
        DB::table('sewa_detail')->update(['harga_sewa_satuan_baru' => DB::raw('harga_sewa_satuan')]);
        Schema::table('sewa_detail', function (Blueprint $table) {
            $table->dropColumn('harga_sewa_satuan');
        });
        Schema::table('sewa_detail', function (Blueprint $table) {
            $table->renameColumn('harga_sewa_satuan_baru', 'harga_sewa_satuan');
        });
    }

    public function down(): void
    {
        Schema::table('sewa', function (Blueprint $table) {
            $table->decimal('total_biaya_baru', 15, 2)->nullable();
        });
        DB::table('sewa')->update(['total_biaya_baru' => DB::raw('total_biaya')]);
        Schema::table('sewa', function (Blueprint $table) {
            $table->dropColumn('total_biaya');
        });
        Schema::table('sewa', function (Blueprint $table) {
            $table->renameColumn('total_biaya_baru', 'total_biaya');
        });
        Schema::table('sewa_detail', function (Blueprint $table) {
            $table->decimal('harga_sewa_satuan_baru', 15, 2)->nullable();
        });
        DB::table('sewa_detail')->update(['harga_sewa_satuan_baru' => DB::raw('harga_sewa_satuan')]);
        Schema::table('sewa_detail', function (Blueprint $table) {
            $table->dropColumn('harga_sewa_satuan');
        });
        Schema::table('sewa_detail', function (Blueprint $table) {
            $table->renameColumn('harga_sewa_satuan_baru', 'harga_sewa_satuan');
        });
    }
};
