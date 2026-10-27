<?php

namespace Tests\Feature;

use App\Http\Middleware\SetMenuSession;
use App\Models\HakAkses;
use App\Models\Menu;
use App\Models\User;
use Database\Seeders\MenuSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MenuPermissionTest extends TestCase
{
    use RefreshDatabase;

    private function setHakAkses(int $userId, int $menuId, int $lihat): void
    {
        HakAkses::updateOrCreate(
            ['id_user' => $userId, 'id_menu' => $menuId],
            ['lihat' => $lihat, 'tambah' => 1, 'edit' => 1, 'hapus' => 1],
        );
    }

    /**
     * User dengan catatan hak akses untuk route yang diminta, mengikuti pola
     * RoleUserSeeder: menu induk selalu boleh dilihat, halaman anak diuji terpisah.
     */
    private function userWithLihat(string $routeName, int $lihat): User
    {
        $this->seed(MenuSeeder::class);

        $user = User::factory()->create();

        foreach (Menu::where('route_name', '#')->pluck('id') as $menuId) {
            $this->setHakAkses($user->id, $menuId, 1);
        }

        $this->setHakAkses($user->id, Menu::where('route_name', $routeName)->value('id'), $lihat);

        return $user;
    }

    public function test_halaman_dengan_izin_lihat_sampai_dibuka(): void
    {
        $user = $this->userWithLihat('kategori.index', 1);

        $this->actingAs($user)
            ->get('/admin/master-data/kategori')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/MasterData/Kategori/Index'));
    }

    public function test_halaman_tanpa_izin_lihat_ditolak_dengan_403(): void
    {
        $user = $this->userWithLihat('kategori.index', 0);

        $this->actingAs($user)
            ->get('/admin/master-data/kategori')
            ->assertStatus(403)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Errors/403')
                ->where('status', 403));
    }

    public function test_tamu_diarahkan_ke_halaman_login(): void
    {
        $this->seed(MenuSeeder::class);

        $this->get('/admin/master-data/kategori')->assertRedirect('/admin/login');
    }

    public function test_endpoint_tanpa_menu_tidak_ditolak(): void
    {
        $this->seed(MenuSeeder::class);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/admin/form-elements')
            ->assertOk();
    }

    public function test_middleware_menyimpan_menu_sesuai_hak_akses_ke_session(): void
    {
        $user = $this->userWithLihat('kategori.index', 1);

        $this->actingAs($user)
            ->get('/admin/master-data/kategori')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('auth.user.id', $user->id));

        $induk = collect(session('getmenus'))->firstWhere('title', 'Master Data');
        $anak = collect($induk['children'] ?? [])->firstWhere('route_name', 'kategori.index');

        $this->assertNotNull($induk);
        $this->assertSame('Kategori', $anak['title']);
        $this->assertNull($induk['url'], 'Header grup tidak punya route, jadi url harus null.');
        $this->assertSame('/admin/master-data/kategori', $anak['url']);
    }

    public function test_menu_session_disimpan_sebagai_array_aman_json(): void
    {
        $user = $this->userWithLihat('kategori.index', 1);

        $this->actingAs($user)->get('/admin/master-data/kategori')->assertOk();

        $menus = session('getmenus');

        $this->assertIsArray($menus);
        $this->assertSame($menus, json_decode(json_encode($menus), true), 'Menu harus tetap sama setelah bolak-balik lewat JSON.');
    }

    public function test_url_menu_hanya_path_tanpa_host(): void
    {
        $user = $this->userWithLihat('pengguna.index', 1);

        $this->actingAs($user)->get('/admin/pengaturan/pengguna')->assertOk();

        $anak = collect(session('getmenus'))
            ->firstWhere('title', 'Pengaturan')['children'];

        $pengaturan = collect($anak)->firstWhere('route_name', 'pengguna.index');

        $this->assertSame('/admin/pengaturan/pengguna', $pengaturan['url']);
        $this->assertStringStartsWith('/', $pengaturan['url']);
        $this->assertStringNotContainsString('://', $pengaturan['url']);
    }

    public function test_induk_tanpa_izin_lihat_menghilangkan_kelompoknya_dari_session(): void
    {
        $this->seed(MenuSeeder::class);

        $user = User::factory()->create();

        foreach (Menu::all() as $menu) {
            $this->setHakAkses(
                $user->id,
                $menu->id,
                $menu->title === 'Master Data' ? 0 : 1,
            );
        }

        $this->actingAs($user)->get('/admin/dashboard')->assertOk();

        $titles = collect(session('getmenus'))->pluck('title');

        $this->assertFalse($titles->contains('Master Data'));
        $this->assertFalse($titles->contains('Kategori'));
        $this->assertTrue($titles->contains('Dashboard'));
    }

    public function test_induk_tanpa_anak_yang_boleh_dilihat_tidak_muncul(): void
    {
        $this->seed(MenuSeeder::class);

        $user = User::factory()->create();

        foreach (Menu::all() as $menu) {
            $this->setHakAkses(
                $user->id,
                $menu->id,
                $menu->title === 'Master Data' || $menu->title === 'Kategori' ? 0 : 1,
            );
        }

        $this->actingAs($user)->get('/admin/dashboard')->assertOk();

        $titles = collect(session('getmenus'))->pluck('title');

        $this->assertFalse($titles->contains('Master Data'));
        $this->assertTrue($titles->contains('Dashboard'));
    }

    public function test_simpan_hak_akses_melaporkan_perubahan_menu(): void
    {
        $this->seed(MenuSeeder::class);

        $user = User::factory()->create();

        $kategori = Menu::where('route_name', 'kategori.index')->first();
        $masterData = Menu::where('title', 'Master Data')->first();

        $this->setHakAkses($user->id, $masterData->id, 1);
        $this->setHakAkses($user->id, $kategori->id, 1);

        $payload = fn (int $lihat) => [
            'id_user' => $user->id,
            'hak_akses_data' => [
                'lihat' => [$kategori->id => $lihat],
                'tambah' => [$kategori->id => 1],
                'edit' => [$kategori->id => 1],
                'hapus' => [$kategori->id => 1],
            ],
        ];

        $this->actingAs($user)
            ->putJson('/admin/pengaturan/update-hak-akses', $payload(1))
            ->assertOk()
            ->assertJsonPath('menus_changed', false);

        $this->actingAs($user)
            ->putJson('/admin/pengaturan/update-hak-akses', $payload(0))
            ->assertOk()
            ->assertJsonPath('menus_changed', true);

        $this->assertNotContains('kategori.index', SetMenuSession::fingerprint(session('getmenus')));
    }

    public function test_simpan_hak_akses_user_lain_tidak_menyentuh_menu_session(): void
    {
        $this->seed(MenuSeeder::class);

        $user = User::factory()->create();
        $lain = User::factory()->create();

        $kategori = Menu::where('route_name', 'kategori.index')->first();
        $this->setHakAkses($user->id, $kategori->id, 1);

        $this->actingAs($user)->get('/admin/dashboard')->assertOk();

        $sebelum = SetMenuSession::fingerprint(session('getmenus'));

        $this->actingAs($user)
            ->putJson('/admin/pengaturan/update-hak-akses', [
                'id_user' => $lain->id,
                'hak_akses_data' => [
                    'lihat' => [$kategori->id => 0],
                    'tambah' => [$kategori->id => 0],
                    'edit' => [$kategori->id => 0],
                    'hapus' => [$kategori->id => 0],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('menus_changed', false);

        $this->assertSame($sebelum, SetMenuSession::fingerprint(session('getmenus')));
    }

    public function test_halaman_tidak_ada_menampilkan_halaman_404(): void
    {
        $this->get('/halaman-yang-tidak-ada')
            ->assertStatus(404)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Errors/404')
                ->where('status', 404));
    }

    public function test_404_di_area_admin_ikut_membawa_prop_auth(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/admin/master-data/tidak-ada')
            ->assertStatus(404)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Errors/404')
                ->where('auth.user.id', $user->id));
    }

    public function test_403_dalam_permintaan_json_dikembalikan_sebagai_json(): void
    {
        $user = $this->userWithLihat('kategori.index', 0);

        $this->actingAs($user)
            ->getJson('/admin/master-data/kategori')
            ->assertStatus(403);
    }
}
