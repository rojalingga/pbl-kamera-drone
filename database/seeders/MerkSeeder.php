<?php

namespace Database\Seeders;

use App\Models\Merk;
use Illuminate\Database\Seeder;

class MerkSeeder extends Seeder
{
    public function run(): void
    {
        $merkList = [
            'Sony',
            'Canon',
            'Fujifilm',
            'Nikon',
            'DJI',
            'Autel Robotics',
        ];

        foreach ($merkList as $merk) {
            Merk::firstOrCreate(['merk' => $merk]);
        }
    }
}

