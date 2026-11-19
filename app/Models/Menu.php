<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    protected $table = 'menu';

    public $timestamps = false;

    protected $fillable = [
        'id_parent',
        'title',
        'route_name',
        'icon',
        'urutan',
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

    public function parent()
    {
        return $this->belongsTo(Menu::class, 'id_parent');
    }

    public function children()
    {
        return $this->hasMany(Menu::class, 'id_parent')->orderBy('urutan');
    }
}
