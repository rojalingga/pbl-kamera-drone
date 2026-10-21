<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DendaPengembalian extends Model
{
    protected $table = 'denda_pengembalian';

    protected $fillable = [
        'id_pengembalian',
        'id_sewa_detail',
        'jenis_denda',
        'nominal_denda',
    ];

    public function pengembalian()
    {
        return $this->belongsTo(Pengembalian::class, 'id_pengembalian');
    }

    public function sewaDetail()
    {
        return $this->belongsTo(SewaDetail::class, 'id_sewa_detail');
    }
}
