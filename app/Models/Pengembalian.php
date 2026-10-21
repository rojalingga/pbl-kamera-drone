<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengembalian extends Model
{
    protected $table = 'pengembalian';

    protected $fillable = [
        'id_sewa',
        'tgl_pengembalian',
        'id_user',
        'total_denda',
        'status_pembayaran',
    ];

    public function sewa()
    {
        return $this->belongsTo(Sewa::class, 'id_sewa');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function details()
    {
        return $this->hasMany(PengembalianDetail::class, 'id_pengembalian');
    }

    public function dendas()
    {
        return $this->hasMany(DendaPengembalian::class, 'id_pengembalian');
    }

    public function piutangs()
    {
        return $this->hasMany(Piutang::class, 'id_pengembalian');
    }

    public function pemasukans()
    {
        return $this->hasMany(Pemasukan::class, 'id_pengembalian');
    }
}
