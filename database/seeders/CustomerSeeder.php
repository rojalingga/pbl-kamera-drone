<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'nama_lengkap' => 'Budi Santoso',
                'no_hp' => '081234567890',
                'password' => Hash::make('password'),
            ],
            [
                'nama_lengkap' => 'Siti Aminah',
                'no_hp' => '085712345678',
                'password' => Hash::make('password'),
            ],
            [
                'nama_lengkap' => 'Rizky Pratama',
                'no_hp' => '087812345678',
                'password' => Hash::make('password'),
            ],
            [
                'nama_lengkap' => 'Dewi Lestari',
                'no_hp' => '089612345678',
                'password' => Hash::make('password'),
            ],
            [
                'nama_lengkap' => 'Ahmad Fauzi',
                'no_hp' => '082112345678',
                'password' => Hash::make('password'),
            ],
        ];

        foreach ($customers as $cust) {
            Customer::firstOrCreate(
                ['no_hp' => $cust['no_hp']],
                [
                    'nama_lengkap' => $cust['nama_lengkap'],
                    'password' => $cust['password'],
                ]
            );
        }
    }
}

