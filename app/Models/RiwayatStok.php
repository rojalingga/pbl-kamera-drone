<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RiwayatStok extends Model
{
    protected $table = 'riwayat_stok';

    protected $fillable = [
        'id_barang',
        'tanggal',
        'id_pengadaan_barang_detail',
        'id_sewa_detail',
        'id_pengembalian_detail',
        'id_perawatan_detail',
        'id_pembelian_unit_detail',
        'jenis',
        'jumlah',
        'stok',
    ];

    protected $casts = [
        'tanggal' => 'date',
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }
}
