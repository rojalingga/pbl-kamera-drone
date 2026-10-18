<?php

namespace App\Http\Middleware;

use App\Models\HakAkses;
use App\Models\Menu;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMenuPermission
{
    /**
     * Tolak permintaan ke halaman yang tidak diizinkan untuk user yang sedang login.
     *
     * Route yang nama routenya tidak terdaftar di tabel `menu` (misalnya endpoint
     * `*.edit`, `*.data`, atau `admin.logout`) dibiarkan lewat supaya middleware
     * tidak memblokir endpoint pendukung halaman yang memang tidak punya izin.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $userId = $request->user()?->id;
        $routeName = $request->route()?->getName();

        if (! $userId || ! $routeName) {
            return $next($request);
        }

        $menu = Menu::where('route_name', $routeName)->first();

        if (! $menu) {
            return $next($request);
        }

        $hakAkses = HakAkses::where('id_user', $userId)
            ->where('id_menu', $menu->id)
            ->first();

        abort_if($hakAkses && (int) $hakAkses->lihat !== 1, 403, 'Anda tidak memiliki hak akses untuk membuka halaman ini.');

        return $next($request);
    }
}
