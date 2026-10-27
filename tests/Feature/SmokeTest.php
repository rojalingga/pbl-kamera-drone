<?php

namespace Tests\Feature;

use App\Models\Menu;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\User;
use Database\Seeders\MenuSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\RoleUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeders_fill_auth_tables(): void
    {
        $this->seed(RoleSeeder::class);
        $this->seed(MenuSeeder::class);
        $this->seed(RoleUserSeeder::class);

        $this->assertSame(27, Menu::count());
        $this->assertSame(3, Role::count());
        $this->assertSame(81, RoleUser::count());
    }

    public function test_login_returns_redirect_json(): void
    {
        User::factory()->create([
            'username' => 'admin',
            'password' => 'password',
        ]);

        $response = $this->postJson('/admin/login', [
            'username' => 'admin',
            'password' => 'password',
        ]);

        $response->assertOk()->assertJsonStructure(['redirect']);
        $this->assertAuthenticated();
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::factory()->create([
            'username' => 'admin',
            'password' => 'password',
        ]);

        $response = $this->postJson('/admin/login', [
            'username' => 'admin',
            'password' => 'salah',
        ]);

        $response->assertStatus(422);
    }

    public function test_blocked_user_cannot_login(): void
    {
        User::factory()->blocked()->create([
            'username' => 'admin',
            'password' => 'password',
        ]);

        $response = $this->postJson('/admin/login', [
            'username' => 'admin',
            'password' => 'password',
        ]);

        $response->assertStatus(422);
    }

    public function test_master_data_datatables_endpoint_returns_json(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get('/admin/master-data/kategori');

        $response->assertOk()->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);
    }

    public function test_hak_akses_menu_lookup_matches_route_name(): void
    {
        $this->seed(MenuSeeder::class);

        $menu = Menu::where('route_name', 'kategori.index')->first();

        $this->assertNotNull($menu);
        $this->assertSame(3, $menu->id);
    }
}
