<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengadaanBarangDetail extends Model
{
    protected $table = 'pengadaan_barang_detail';

    protected $fillable = [
        'id_pengadaan_barang',
        'id_barang',
        'jumlah',
    ];

    public function pengadaan(): BelongsTo
    {
        return $this->belongsTo(PengadaanBarang::class, 'id_pengadaan_barang');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }
}
