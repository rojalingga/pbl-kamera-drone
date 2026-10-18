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
        Schema::table('hak_akses', function (Blueprint $table) {
            $table->dropColumn('beranda');
        });

        Schema::table('role_user', function (Blueprint $table) {
            $table->dropColumn('beranda');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hak_akses', function (Blueprint $table) {
            $table->boolean('beranda')->default(0)->after('lihat');
        });

        Schema::table('role_user', function (Blueprint $table) {
            $table->boolean('beranda')->default(0)->after('lihat');
        });
    }
};
