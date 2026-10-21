<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Sewa extends Model
{
    use HasUuids;

    /** Status pembayaran: uang sewa sudah masuk atau belum. */
    public const BAYAR_PENDING = 'Pending';

    public const BAYAR_CONFIRMED = 'Confirmed';

    /** Asal pesanan: dari admin cms atau web katalog publik */
    public const ASAL_ADMIN = 'admin';

    public const ASAL_WEB = 'web';

    /** Tahap siklus sewa (dihitung realtime, tidak disimpan). */
    public const SEWA_PENDING = 'Pending';

    public const SEWA_PROSES = 'Proses Sewa';

    public const SEWA_PENGEMBALIAN = 'Pengembalian';

    protected $table = 'sewa';

    protected $fillable = [
        'no_sewa',
        'tgl_sewa',
        'tgl_akhir_sewa',
        'id_customer',
        'total_biaya',
        'foto_jaminan',
        'id_users',
        'status_pembayaran',
        'asal_pesanan',
    ];

    /**
     * Status siklus sewa dihitung realtime, tidak disimpan di database.
     *
     * Urutan prioritas: ada pengembalian -> sudah lewat tanggal -> sudah bayar -> pending.
     */
    public function getStatusSewaAttribute(): string
    {
        $sudahDikembalikan = $this->pengembalian_exists ?? $this->pengembalians()->exists();

        if ($sudahDikembalikan) {
            return self::SEWA_PENGEMBALIAN;
        }

        if ($this->status_pembayaran !== self::BAYAR_CONFIRMED) {
            return self::SEWA_PENDING;
        }

        if (! empty($this->tgl_akhir_sewa)) {
            $tglSelesai = Carbon::parse($this->tgl_akhir_sewa)->startOfDay();
            $hariIni = Carbon::now()->startOfDay();

            if ($tglSelesai->lessThan($hariIni)) {
                return 'Terlambat '.(int) $tglSelesai->diffInDays($hariIni).' hari';
            }
        }

        return self::SEWA_PROSES;
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'id_customer');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_users');
    }

    public function details()
    {
        return $this->hasMany(SewaDetail::class, 'id_sewa');
    }

    public function pengembalians()
    {
        return $this->hasMany(Pengembalian::class, 'id_sewa');
    }

    public function pemasukans()
    {
        return $this->hasMany(Pemasukan::class, 'id_sewa');
    }

    public function pembayarans()
    {
        return $this->hasMany(Pembayaran::class, 'id_sewa');
    }
}
