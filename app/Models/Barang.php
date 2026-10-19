<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Barang extends Model
{
    use HasUuids;

    protected $table = 'barang';

    protected $fillable = [
        'nama_barang',
        'id_merk',
        'id_kategori',
        'stok',
        'keterangan',
        'harga_sewa',
        'denda_per_hari',
    ];

    public function merk()
    {
        return $this->belongsTo(Merk::class, 'id_merk');
    }

    public function kategori()
    {
        return $this->belongsTo(Kategori::class, 'id_kategori');
    }

    public function fotos()
    {
        return $this->hasMany(FotoBarang::class, 'id_barang');
    }

    public function riwayatStok()
    {
        return $this->hasMany(RiwayatStok::class, 'id_barang');
    }

    public function sewaDetails()
    {
        return $this->hasMany(SewaDetail::class, 'id_barang');
    }

    public function keranjangs()
    {
        return $this->hasMany(Keranjang::class, 'id_barang');
    }
}
