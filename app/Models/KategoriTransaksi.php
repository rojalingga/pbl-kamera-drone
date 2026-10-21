<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KategoriTransaksi extends Model
{
    protected $table = 'kategori_transaksi';

    protected $fillable = [
        'kategori',
        'jenis',
    ];

    public function pemasukans()
    {
        return $this->hasMany(Pemasukan::class, 'id_kategori_transaksi');
    }

    public function pengeluarans()
    {
        return $this->hasMany(Pengeluaran::class, 'id_kategori_transaksi');
    }
}
