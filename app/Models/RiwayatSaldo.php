<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RiwayatSaldo extends Model
{
    protected $table = 'riwayat_saldo';

    protected $fillable = [
        'tanggal',
        'id_rekening',
        'id_pemasukan',
        'id_pengeluaran',
        'jenis',
        'nominal',
        'saldo',
    ];

    protected $casts = [
        'tanggal' => 'date',
    ];

    public function rekening()
    {
        return $this->belongsTo(Rekening::class, 'id_rekening');
    }

    public function pemasukan()
    {
        return $this->belongsTo(Pemasukan::class, 'id_pemasukan');
    }

    public function pengeluaran()
    {
        return $this->belongsTo(Pengeluaran::class, 'id_pengeluaran');
    }
}
