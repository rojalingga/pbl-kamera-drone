<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengeluaran extends Model
{
    protected $table = 'pengeluaran';

    protected $fillable = [
        'tgl_pengeluaran',
        'nominal',
        'id_kategori_transaksi',
        'id_rekening',
        'lampiran',
        'keterangan',
        'id_perawatan',
        'id_pembelian_unit',
    ];

    public function kategoriTransaksi()
    {
        return $this->belongsTo(KategoriTransaksi::class, 'id_kategori_transaksi');
    }

    public function rekening()
    {
        return $this->belongsTo(Rekening::class, 'id_rekening');
    }

    public function perawatan()
    {
        return $this->belongsTo(Perawatan::class, 'id_perawatan');
    }

    public function pembelianUnit()
    {
        return $this->belongsTo(PembelianUnit::class, 'id_pembelian_unit');
    }
}
