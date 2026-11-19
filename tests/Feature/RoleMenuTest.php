<?php

namespace Tests\Feature;

use App\Models\HakAkses;
use App\Models\Menu;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleMenuTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Nilai flag "lihat" sebuah menu untuk suatu role. Menu dicari dari
     * route_name, atau dari title bila merupakan grup (route_name "#").
     */
    private function lihat(string $role, string $key): int
    {
        $menu = Menu::where('route_name', $key)->orWhere('title', $key)->firstOrFail();

        $roleId = Role::where('role', $role)->value('id');

        return (int) (RoleUser::where('id_role', $roleId)
            ->where('id_menu', $menu->id)
            ->value('lihat') ?? -1);
    }

    private function menuKey(Menu $menu): string
    {
        return $menu->route_name === '#' ? $menu->title : $menu->route_name;
    }

    public function test_admin_memiliki_semua_menu_kecuali_laporan(): void
    {
        $this->seed(DatabaseSeeder::class);

        foreach (['laporan-sewa.index', 'laporan-keuangan.index', 'laporan-piutang-hutang.index', 'Laporan'] as $key) {
            $this->assertSame(0, $this->lihat('Admin', $key), "{$key} seharusnya tidak diakses Admin");
        }

        foreach (['dashboard.index', 'kategori.index', 'sewa.index', 'pengguna.index', 'Master Data'] as $key) {
            $this->assertSame(1, $this->lihat('Admin', $key), "{$key} seharusnya boleh diakses Admin");
        }
    }

    public function test_owner_memiliki_semua_menu(): void
    {
        $this->seed(DatabaseSeeder::class);

        foreach (Menu::all() as $menu) {
            $this->assertSame(1, $this->lihat('Owner', $this->menuKey($menu)), "{$menu->title} seharusnya boleh diakses Owner");
        }
    }

    public function test_teknisi_hanya_melihat_perawatan(): void
    {
        $this->seed(DatabaseSeeder::class);

        $diizinkan = collect([
            Menu::where('route_name', 'perawatan.index')->value('id'),
            Menu::where('title', 'Transaksi')->value('id'),
        ]);

        foreach (Menu::all() as $menu) {
            $harapan = $diizinkan->contains($menu->id) ? 1 : 0;

            $this->assertSame($harapan, $this->lihat('Teknisi', $this->menuKey($menu)), "{$menu->title} tidak sesuaiÑÑ‚ÑŒÑŽ Teknisi");
        }
    }

    public function test_database_seeder_membuat_satu_owner_dan_dua_teknisi(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(4, User::count());
        $this->assertSame(1, User::whereHas('role', fn ($query) => $query->where('role', 'Owner'))->count());
        $this->assertSame(2, User::whereHas('role', fn ($query) => $query->where('role', 'Teknisi'))->count());
    }

    public function test_hak_akses_akun_menyalin_dari_role(): void
    {
        $this->seed(DatabaseSeeder::class);

        $teknisi = User::where('username', 'teknisi1')->first();

        $this->assertSame(2, HakAkses::where('id_user', $teknisi->id)->where('lihat', 1)->count());
        $this->assertSame(27, HakAkses::where('id_user', $teknisi->id)->count());

        $admin = User::where('username', 'admin')->first();
        $laporan = Menu::whereIn('route_name', [
            'laporan-sewa.index',
            'laporan-keuangan.index',
            'laporan-piutang-hutang.index',
        ])->pluck('id');

        $this->assertSame(0, HakAkses::where('id_user', $admin->id)->whereIn('id_menu', $laporan)->where('lihat', 1)->count());
    }
}
