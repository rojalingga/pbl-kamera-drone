<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Perawatan extends Model
{
    public const BAYAR_BELUM_LUNAS = 'Belum Lunas';

    public const BAYAR_LUNAS = 'Lunas';

    public const STATUS_PENDING = 1;

    public const STATUS_DISETUJUI = 2;

    public const STATUS_DITOLAK = 3;

    protected $table = 'perawatan';

    protected $fillable = [
        'tgl_perawatan',
        'id_user',
        'total_biaya_perawatan',
        'status_pembayaran',
        'no_kwitansi',
        'is_owner_acc',
        'alasan_penolakan',
    ];

    protected $casts = [
        'tgl_perawatan' => 'date:Y-m-d',
        'total_biaya_perawatan' => 'integer',
        'is_owner_acc' => 'integer',
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
