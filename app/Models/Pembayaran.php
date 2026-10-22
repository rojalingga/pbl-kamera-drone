<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pembayaran extends Model
{
    protected $table = 'pembayaran';

    protected $fillable = [
        'id_sewa',
        'id_pengembalian',
        'order_id',
        'transaction_id',
        'payment_type',
        'metode_pembayaran',
        'gross_amount',
        'currency',
        'transaction_status',
        'fraud_status',
        'qr_url',
        'qr_string',
        'transaction_time',
        'settlement_time',
        'expiry_time',
    ];

    public function pengembalian()
    {
        return $this->belongsTo(Pengembalian::class, 'id_pengembalian');
    }

    public function sewa()
    {
        return $this->belongsTo(Sewa::class, 'id_sewa');
    }
}
