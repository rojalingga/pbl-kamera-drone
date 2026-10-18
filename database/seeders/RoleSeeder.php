<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Urutan id menentukan urutan tampil di halaman Pengguna.
     */
    private array $roles = ['Admin', 'Owner', 'Teknisi'];

    public function run(): void
    {
        foreach ($this->roles as $role) {
            Role::firstOrCreate(['role' => $role]);
        }
    }
}
