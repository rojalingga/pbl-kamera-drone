<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HakAkses extends Model
{
    protected $table = 'hak_akses';

    public $timestamps = false;

    protected $fillable = [
        'id_user',
        'id_menu',
        'lihat',
        'tambah',
        'edit',
        'hapus',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lihat' => 'integer',
            'tambah' => 'integer',
            'edit' => 'integer',
            'hapus' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function menu()
    {
        return $this->belongsTo(Menu::class, 'id_menu');
    }
}
