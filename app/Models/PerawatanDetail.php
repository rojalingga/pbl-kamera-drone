<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerawatanDetail extends Model
{
    /** Status item sedang dikerjakan teknisi. */
    public const STATUS_PERAWATAN = 'Perawatan';

    /** Status item selesai dan sudah kembali ke stok. */
    public const STATUS_SELESAI = 'Selesai';

    protected $table = 'perawatan_detail';

    protected $fillable = [
        'id_perawatan',
        'id_barang',
        'qty',
        'biaya_perawatan',
        'status',
        'keterangan',
    ];

    protected $casts = [
        'qty' => 'integer',
        'biaya_perawatan' => 'integer',
    ];

    public function perawatan()
    {
        return $this->belongsTo(Perawatan::class, 'id_perawatan');
    }

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }

    public function sudahSelesai(): bool
    {
        return $this->status === self::STATUS_SELESAI;
    }
}
