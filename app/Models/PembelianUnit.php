<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PembelianUnit extends Model
{
    public const STATUS_PENDING = 1;

    public const STATUS_DISETUJUI = 2;

    public const STATUS_DITOLAK = 3;

    protected $table = 'pembelian_unit';

    protected $fillable = [
        'tanggal',
        'keterangan',
        'is_owner_acc',
        'alasan_penolakan',
    ];

    protected $casts = [
        'tanggal' => 'date:Y-m-d',
        'is_owner_acc' => 'integer',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(PembelianUnitDetail::class, 'id_pembelian_unit');
    }

    public function pengeluaran(): HasOne
    {
        return $this->hasOne(Pengeluaran::class, 'id_pembelian_unit');
    }
}
