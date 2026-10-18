<?php

namespace App\Http\Middleware;

use App\Models\HakAkses;
use App\Models\Menu;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

class SetMenuSession
{
    /**
     * Kunci session yang dipakai sidebar admin.
     */
    public const SESSION_KEY = 'getmenus';

    /**
     * Bangun menu sidebar dari hak akses "lihat" milik user yang sedang login
     * lalu simpan ke session. Query hanya dijalankan sekali per session;
     * pemanggil yang mengubah hak akses cukup memanggil {@see self::flush()}.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $userId = Auth::guard('web')->id();

        if (! $userId) {
            $request->session()->forget(self::SESSION_KEY);

            return $next($request);
        }

        if ($request->session()->has(self::SESSION_KEY)) {
            return $next($request);
        }

        $request->session()->put(self::SESSION_KEY, self::build($userId));

        return $next($request);
    }

    /**
     * Menu induk beserta anak yang boleh dilihat user, disimpan sebagai array
     * biasa karena session di-serialize dengan JSON (`session.serialization`),
     * sehingga objek Eloquent akan kembali sebagai array.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function build(int $userId): array
    {
        $allowedMenuIds = HakAkses::where('id_user', $userId)
            ->where('lihat', 1)
            ->pluck('id_menu')
            ->toArray();

        if ($allowedMenuIds === []) {
            return [];
        }

        return Menu::where('id_parent', 0)
            ->whereIn('id', $allowedMenuIds)
            ->orderBy('urutan')
            ->with(['children' => fn ($query) => $query->whereIn('id', $allowedMenuIds)])
            ->get()
            ->map(fn (Menu $menu) => [
                ...self::row($menu),
                'children' => $menu->children
                    ->map(fn (Menu $child) => self::row($child))
                    ->values()
                    ->all(),
            ])
            ->filter(fn (array $menu) => $menu['url'] !== null || $menu['children'] !== [])
            ->values()
            ->all();
    }

    /**
     * Path menu (tanpa host), null untuk baris yang bukan route (mis. header grup
     * "#") atau nama route yang tidak lagi terdaftar.
     *
     * Hanya path-nya yang dipakai: `route()` mengembalikan URL absolut yang
     * mengikuti `app.url`, sedangkan `usePage().url` di frontend berupa path
     * relatif, sehingga perbandingan active state akan selalu gagal bila host
     * ikut disertakan.
     */
    private static function urlFor(string $routeName): ?string
    {
        if ($routeName === '#' || ! Route::has($routeName)) {
            return null;
        }

        return parse_url(route($routeName), PHP_URL_PATH);
    }

    /**
     * @return array<string, mixed>
     */
    private static function row(Menu $menu): array
    {
        return [
            'title' => $menu->title,
            'route_name' => $menu->route_name,
            'icon' => $menu->icon,
            'urutan' => (int) $menu->urutan,
            'url' => self::urlFor($menu->route_name),
        ];
    }

    /**
     * Buang cache menu supaya middleware menyusun ulang pada request berikutnya.
     */
    public static function flush(): void
    {
        session()->forget(self::SESSION_KEY);
    }

    /**
     * Susun ulang menu milik user dan simpan ke session.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function refresh(int $userId): array
    {
        $menus = self::build($userId);

        session()->put(self::SESSION_KEY, $menus);

        return $menus;
    }

    /**
     * Sidik jari menu berupa daftar route_name, dipakai untuk mendeteksi
     * apakah sidebar benar-benar berubah setelah hak akses diperbarui.
     *
     * Menerima array (bentuk session), Collection, atau model agar aman
     * dipanggil kapan pun nilai session belum tentu berupa array.
     *
     * @return array<int, string>
     */
    public static function fingerprint(mixed $menus): array
    {
        return collect($menus ?? [])
            ->flatMap(fn ($menu) => [
                self::routeNameOf($menu),
                ...collect(self::childrenOf($menu))
                    ->map(fn ($child) => self::routeNameOf($child))
                    ->all(),
            ])
            ->filter()
            ->sort()
            ->values()
            ->all();
    }

    private static function routeNameOf(mixed $menu): ?string
    {
        return match (true) {
            $menu instanceof Menu => $menu->route_name,
            is_array($menu) => $menu['route_name'] ?? null,
            default => null,
        };
    }

    /**
     * @return array<int, mixed>
     */
    private static function childrenOf(mixed $menu): array
    {
        return match (true) {
            $menu instanceof Menu => $menu->children->all(),
            is_array($menu) => (array) ($menu['children'] ?? []),
            default => [],
        };
    }
}
