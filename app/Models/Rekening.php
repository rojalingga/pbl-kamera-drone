<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rekening extends Model
{
    protected $table = 'rekening';

    protected $fillable = [
        'nama_rek',
        'no_rek',
        'pemilik_rek',
        'saldo',
    ];

    public function pemasukans()
    {
        return $this->hasMany(Pemasukan::class, 'id_rekening');
    }

    public function pengeluarans()
    {
        return $this->hasMany(Pengeluaran::class, 'id_rekening');
    }

    public function riwayatSaldos()
    {
        return $this->hasMany(RiwayatSaldo::class, 'id_rekening');
    }
}
