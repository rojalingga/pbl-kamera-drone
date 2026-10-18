<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'roles';

    protected $fillable = [
        'role',
    ];

    public function users()
    {
        return $this->hasMany(User::class, 'id_role');
    }

    public function menus()
    {
        return $this->belongsToMany(Menu::class, 'role_user', 'id_role', 'id_menu')
            ->withPivot(['lihat', 'tambah', 'edit', 'hapus']);
    }
}
