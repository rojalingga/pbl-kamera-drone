<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Customer extends Authenticatable
{
    use HasUuids;

    /** Format nomor HP yang diterima: 08xxxxxxxxxx (10-13 digit). */
    public const POLA_NO_HP = '/^08[1-9][0-9]{7,10}$/';

    protected $table = 'customer';

    protected $fillable = [
        'nama_lengkap',
        'no_hp',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    /**
     * Normalisasi nomor HP ke format 08xxxxxxxxxx.
     *
     * Menerima input dengan spasi, tanda hubung, prefix +62/62, maupun tanpa 0 di depan.
     */
    public static function normalisasiNoHp(mixed $noHp): string
    {
        $digit = preg_replace('/\D/', '', is_string($noHp) ? $noHp : '');

        if (str_starts_with($digit, '62')) {
            $digit = '0'.substr($digit, 2);
        } elseif (str_starts_with($digit, '8')) {
            $digit = '0'.$digit;
        }

        return $digit;
    }

    public function getRememberTokenName()
    {
        return '';
    }

    public function sewas()
    {
        return $this->hasMany(Sewa::class, 'id_customer');
    }
}
