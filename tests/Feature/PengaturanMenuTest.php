<?php

namespace Tests\Feature;

use App\Models\HakAkses;
use App\Models\Menu;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PengaturanMenuTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    public function test_pengaturan_pages_render_inertia_components(): void
    {
        $this->actingAs($this->user)
            ->get('/admin/pengaturan/pengguna')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Pengaturan/Pengguna/Index')
                ->has('permissions')
                ->has('permissions.tambah')
                ->has('roles'));

        $this->actingAs($this->user)
            ->get('/admin/pengaturan/hak-akses')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Pengaturan/HakAkses/Index')
                ->has('permissions')
                ->has('users'));
    }

    public function test_pengguna_datatables_mengembalikan_json(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/pengaturan/pengguna');

        $response->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);

        $this->assertIsInt($response->json('data.0.status'));
        $this->assertIsString($response->json('data.0.role'));
    }

    public function test_store_pengguna_menyalin_hak_akses_role(): void
    {
        $role = Role::create(['role' => 'Kasir']);

        $this->actingAs($this->user)
            ->postJson(route('pengguna.store'), [
                'nama_lengkap' => 'Budi Santoso',
                'username' => 'budi',
                'password' => 'rahasia123',
                'id_role' => $role->id,
                'status' => 1,
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $pengguna = User::where('username', 'budi')->firstOrFail();
        $this->assertSame('Budi Santoso', $pengguna->nama_lengkap);
        $this->assertSame(0, HakAkses::where('id_user', $pengguna->id)->count());

        $menu = Menu::create([
            'id_parent' => 0,
            'title' => 'Pengaturan',
            'route_name' => '#',
            'icon' => 'fas fa-cog',
            'urutan' => 1,
            'lihat' => 1,
            'tambah' => 0,
            'edit' => 0,
            'hapus' => 0,
        ]);

        RoleUser::create([
            'id_role' => $role->id,
            'id_menu' => $menu->id,
            'lihat' => 1,
            'tambah' => 1,
            'edit' => 1,
            'hapus' => 1,
        ]);

        $this->actingAs($this->user)
            ->postJson(route('pengguna.store'), [
                'nama_lengkap' => 'Siti Aminah',
                'username' => 'siti',
                'password' => 'rahasia123',
                'id_role' => $role->id,
                'status' => 1,
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $siti = User::where('username', 'siti')->firstOrFail();
        $hakAkses = HakAkses::where('id_user', $siti->id)->firstOrFail();
        $this->assertSame($menu->id, (int) $hakAkses->id_menu);
        $this->assertSame(1, (int) $hakAkses->tambah);
        $this->assertSame(1, (int) $hakAkses->edit);
    }

    public function test_destroy_pengguna_ditolak_untuk_diri_sendiri(): void
    {
        $this->actingAs($this->user)
            ->deleteJson(route('pengguna.destroy', $this->user->id))
            ->assertStatus(422);

        $this->assertNotNull(User::find($this->user->id));
    }

    public function test_get_hak_akses_mengembalikan_matriks_menu(): void
    {
        $target = User::factory()->create();

        $induk = Menu::create([
            'id_parent' => 0,
            'title' => 'Pengaturan',
            'route_name' => '#',
            'icon' => 'fas fa-cog',
            'urutan' => 1,
            'lihat' => 1,
            'tambah' => 0,
            'edit' => 0,
            'hapus' => 0,
        ]);

        Menu::create([
            'id_parent' => $induk->id,
            'title' => 'Pengguna',
            'route_name' => 'pengguna.index',
            'icon' => 'fas fa-users',
            'urutan' => 1,
            'lihat' => 1,
            'tambah' => 1,
            'edit' => 1,
            'hapus' => 1,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/admin/pengaturan/get-hak-akses?id_user='.$target->id);

        $response->assertOk();

        $rows = $response->json('data');
        $this->assertCount(2, $rows);
        $this->assertSame('Pengaturan', $rows[0]['title']);
        $this->assertSame('Pengguna', $rows[1]['title']);
        $this->assertSame('Induk', $rows[0]['induk_menu']);
        $this->assertSame('Pengaturan', $rows[1]['induk_menu']);
        $this->assertIsInt($rows[1]['lihat']);
        $this->assertSame(1, $rows[1]['menu_flag']['tambah']);
        $this->assertSame(0, $rows[0]['menu_flag']['tambah']);
        $this->assertTrue(HakAkses::where('id_user', $target->id)->exists());
    }

    public function test_update_hak_akses_menyimpan_izin(): void
    {
        $target = User::factory()->create();

        $menu = Menu::create([
            'id_parent' => 0,
            'title' => 'Pengaturan',
            'route_name' => '#',
            'icon' => 'fas fa-cog',
            'urutan' => 1,
            'lihat' => 1,
            'tambah' => 0,
            'edit' => 0,
            'hapus' => 0,
        ]);

        $this->actingAs($this->user)
            ->putJson('/admin/pengaturan/update-hak-akses', [
                'id_user' => $target->id,
                'hak_akses_data' => [
                    'lihat' => [$menu->id => 1],
                    'tambah' => [$menu->id => 1],
                    'edit' => [$menu->id => 0],
                    'hapus' => [$menu->id => 0],
                ],
            ])
            ->assertOk()
            ->assertJson(['success' => true]);

        $hakAkses = HakAkses::where('id_user', $target->id)
            ->where('id_menu', $menu->id)
            ->firstOrFail();

        $this->assertSame(1, (int) $hakAkses->lihat);
        $this->assertSame(1, (int) $hakAkses->tambah);
        $this->assertSame(0, (int) $hakAkses->edit);
        $this->assertSame(0, (int) $hakAkses->hapus);
    }

    public function test_update_hak_akses_menolak_data_kosong(): void
    {
        $this->actingAs($this->user)
            ->putJson('/admin/pengaturan/update-hak-akses', [
                'id_user' => null,
                'hak_akses_data' => [],
            ])
            ->assertStatus(422)
            ->assertJson(['success' => false]);
    }
}
