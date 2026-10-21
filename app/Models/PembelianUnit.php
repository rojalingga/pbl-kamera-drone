<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PembelianUnit extends Model
{
    protected $table = 'pembelian_unit';

    protected $fillable = [
        'tanggal',
        'keterangan',
    ];

    protected $casts = [
        'tanggal' => 'date:Y-m-d',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(PembelianUnitDetail::class, 'id_pembelian_unit');
    }

    public function pengeluaran(): HasOne
    {
        return $this->hasOne(Pengeluaran::class, 'id_pembelian_unit');
    }
}
