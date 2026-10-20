<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PengadaanBarang extends Model
{
    protected $table = 'pengadaan_barang';

    protected $fillable = [
        'tgl_pengadaan',
        'keterangan',
    ];

    protected $casts = [
        'tgl_pengadaan' => 'date:Y-m-d',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(PengadaanBarangDetail::class, 'id_pengadaan_barang');
    }
}
