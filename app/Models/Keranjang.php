<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Keranjang extends Model
{
    protected $table = 'keranjang';

    protected $fillable = [
        'id_customer',
        'id_barang',
        'qty',
        'tgl_sewa',
        'tgl_akhir_sewa',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'id_customer');
    }

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }
}
