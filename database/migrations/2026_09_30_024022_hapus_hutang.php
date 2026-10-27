<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('hak_akses')->where('id_menu', 19)->delete();
        DB::table('role_user')->where('id_menu', 19)->delete();
        DB::table('menu')->where('id', 19)->delete();
        Schema::dropIfExists('hutang');
    }

    public function down(): void {}
};
