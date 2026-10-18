<?php

namespace Database\Seeders;

use App\Models\HakAkses;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Akun bawaan beserta role-nya. `role` dicocokkan dengan tabel `roles`,
     * dan hak akses tiap akun disalin dari template `role_user` role tersebut.
     *
     * @var array<int, array{username: string, nama_lengkap: string, role: string}>
     */
    private array $akun = [
        ['username' => 'admin', 'nama_lengkap' => 'Administrator', 'role' => 'Admin'],
        ['username' => 'owner', 'nama_lengkap' => 'Owner Kantor', 'role' => 'Owner'],
        ['username' => 'teknisi1', 'nama_lengkap' => 'Teknisi Satu', 'role' => 'Teknisi'],
        ['username' => 'teknisi2', 'nama_lengkap' => 'Teknisi Dua', 'role' => 'Teknisi'],
    ];

    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            MenuSeeder::class,
            RoleUserSeeder::class,
        ]);

        foreach ($this->akun as $akun) {
            $this->sinkronkanAkun($akun);
        }
    }

    /**
     * @param  array{username: string, nama_lengkap: string, role: string}  $akun
     */
    private function sinkronkanAkun(array $akun): void
    {
        $role = Role::firstOrCreate(['role' => $akun['role']]);

        $user = User::firstOrCreate(
            ['username' => $akun['username']],
            [
                'password' => Hash::make('password'),
                'nama_lengkap' => $akun['nama_lengkap'],
                'id_role' => $role->id,
                'status' => 1,
                'foto' => '',
            ],
        );

        $roleUser = RoleUser::where('id_role', $user->id_role)->get();

        HakAkses::where('id_user', $user->id)
            ->whereNotIn('id_menu', $roleUser->pluck('id_menu'))
            ->delete();

        if ($roleUser->isEmpty()) {
            return;
        }

        HakAkses::upsert(
            $roleUser->map(fn ($row) => [
                'id_user' => $user->id,
                'id_menu' => $row->id_menu,
                'lihat' => $row->lihat,
                'tambah' => $row->tambah,
                'edit' => $row->edit,
                'hapus' => $row->hapus,
            ])->all(),
            ['id_user', 'id_menu'],
            ['lihat', 'tambah', 'edit', 'hapus'],
        );
    }
}
