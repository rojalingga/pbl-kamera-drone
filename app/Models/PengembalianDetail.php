<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PengembalianDetail extends Model
{
    protected $table = 'pengembalian_detail';

    protected $fillable = [
        'id_pengembalian',
        'id_sewa_detail',
        'qty_pengembalian',
        'keterangan',
        'foto_unit_pengembalian',
    ];

    public function pengembalian()
    {
        return $this->belongsTo(Pengembalian::class, 'id_pengembalian');
    }

    public function sewaDetail()
    {
        return $this->belongsTo(SewaDetail::class, 'id_sewa_detail');
    }

    public function perawatans()
    {
        return $this->hasMany(PerawatanBarang::class, 'id_pengembalian_detail');
    }
}
