<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomerAdminTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    public function test_store_customer_menyimpan_password_ter_hash(): void
    {
        $this->actingAs($this->user)
            ->postJson(route('customer.store'), [
                'nama_lengkap' => 'Budi Santoso',
                'no_hp' => '081234567890',
                'password' => 'rahasia123',
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $customer = Customer::firstOrFail();

        $this->assertSame('Budi Santoso', $customer->nama_lengkap);
        $this->assertTrue(Hash::check('rahasia123', $customer->password));
    }

    public function test_store_customer_wajib_password(): void
    {
        $this->actingAs($this->user)
            ->postJson(route('customer.store'), [
                'nama_lengkap' => 'Budi Santoso',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->assertSame(0, Customer::count());
    }

    public function test_update_customer_tanpa_password_tidak_mengubah_password(): void
    {
        $customer = Customer::create([
            'nama_lengkap' => 'Budi Santoso',
            'no_hp' => '081234567890',
            'password' => 'rahasia123',
        ]);

        $hashAwal = $customer->fresh()->password;

        $this->actingAs($this->user)
            ->putJson(route('customer.update', $customer->id), [
                'nama_lengkap' => 'Budi Pratama',
                'no_hp' => '081234567890',
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $customer->refresh();

        $this->assertSame('Budi Pratama', $customer->nama_lengkap);
        $this->assertSame($hashAwal, $customer->password);
    }

    public function test_update_customer_dengan_password_baru_menyimpan_hash_baru(): void
    {
        $customer = Customer::create([
            'nama_lengkap' => 'Budi Santoso',
            'password' => 'rahasia123',
        ]);

        $this->actingAs($this->user)
            ->putJson(route('customer.update', $customer->id), [
                'nama_lengkap' => 'Budi Santoso',
                'password' => 'passwordBaru456',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('passwordBaru456', $customer->fresh()->password));
    }
}
