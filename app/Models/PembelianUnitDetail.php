<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PembelianUnitDetail extends Model
{
    protected $table = 'pembelian_unit_detail';

    protected $fillable = [
        'id_pembelian_unit',
        'id_barang',
        'harga_beli',
        'jumlah',
    ];

    public function pembelianUnit(): BelongsTo
    {
        return $this->belongsTo(PembelianUnit::class, 'id_pembelian_unit');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }
}
