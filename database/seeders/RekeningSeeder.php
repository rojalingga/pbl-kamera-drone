<?php

namespace Database\Seeders;

use App\Models\Rekening;
use Illuminate\Database\Seeder;

class RekeningSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['id' => 1, 'nama_rek' => 'Kas Kantor', 'no_rek' => null, 'pemilik_rek' => null, 'saldo' => 0],
            ['id' => 2, 'nama_rek' => 'QRIS Gopay', 'no_rek' => null, 'pemilik_rek' => null, 'saldo' => 0],
            ['id' => 3, 'nama_rek' => 'BCA', 'no_rek' => null, 'pemilik_rek' => null, 'saldo' => 0],
        ];

        Rekening::upsert($rows, ['id'], ['nama_rek', 'no_rek', 'pemilik_rek']);
    }
}
