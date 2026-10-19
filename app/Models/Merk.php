<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Merk extends Model
{
    protected $table = 'merk';

    protected $fillable = [
        'merk',
    ];

    public function barangs()
    {
        return $this->hasMany(Barang::class, 'id_merk');
    }
}
