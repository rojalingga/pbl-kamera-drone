<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SewaDetail extends Model
{
    protected $table = 'sewa_detail';

    protected $fillable = [
        'id_sewa',
        'id_barang',
        'harga_sewa_satuan',
        'qty',
    ];

    public function sewa()
    {
        return $this->belongsTo(Sewa::class, 'id_sewa');
    }

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }

    public function pengembalianDetails()
    {
        return $this->hasMany(PengembalianDetail::class, 'id_sewa_detail');
    }
}
