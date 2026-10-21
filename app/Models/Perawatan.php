<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Perawatan extends Model
{
    public const BAYAR_BELUM_LUNAS = 'Belum Lunas';

    public const BAYAR_LUNAS = 'Lunas';

    protected $table = 'perawatan';

    protected $fillable = [
        'tgl_perawatan',
        'id_user',
        'total_biaya_perawatan',
        'status_pembayaran',
        'no_kwitansi',
    ];

    protected $casts = [
        'tgl_perawatan' => 'date',
        'total_biaya_perawatan' => 'integer',
    ];

    public function details()
    {
        return $this->hasMany(PerawatanDetail::class, 'id_perawatan');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function pengeluarans()
    {
        return $this->hasMany(Pengeluaran::class, 'id_perawatan');
    }

    /**
     * Total biaya perawatan = jumlah biaya seluruh baris detail.
     */
    public function hitungTotalBiaya(): int
    {
        return (int) $this->details->sum('biaya_perawatan');
    }

    public function sudahLunas(): bool
    {
        return $this->status_pembayaran === self::BAYAR_LUNAS;
    }
}
