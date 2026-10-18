<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'username' => fake()->unique()->userName(),
            'password' => static::$password ??= Hash::make('password'),
            'nama_lengkap' => fake()->name(),
            'id_role' => 1,
            'status' => 1,
            'foto' => '',
        ];
    }

    public function blocked(): static
    {
        return $this->state(fn () => ['status' => 0]);
    }
}
