<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Customer extends Authenticatable
{
    use HasUuids;

    protected $table = 'customer';

    protected $fillable = [
        'nama_lengkap',
        'no_hp',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function getRememberTokenName()
    {
        return '';
    }

    public function sewas()
    {
        return $this->hasMany(Sewa::class, 'id_customer');
    }
}
