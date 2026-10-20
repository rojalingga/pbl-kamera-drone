<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sewa', function (Blueprint $table) {
            $table->string('status', 50)->nullable()->after('id_users');
        });
    }

    public function down(): void
    {
        Schema::table('sewa', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
