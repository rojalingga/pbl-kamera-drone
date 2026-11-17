<?php

namespace Database\Seeders;

use App\Models\Kategori;
use Illuminate\Database\Seeder;

class KategoriSeeder extends Seeder
{
    public function run(): void
    {
        $kategoriList = [
            'Kamera',
            'Drone',
            'Lensa',
            'Aksesoris',
        ];

        foreach ($kategoriList as $kategori) {
            Kategori::firstOrCreate(['kategori' => $kategori]);
        }
    }
}

