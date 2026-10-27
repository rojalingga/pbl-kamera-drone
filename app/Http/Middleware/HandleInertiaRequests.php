<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'appName' => config('app.name', 'Rental Kamera & Drone'),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->nama_lengkap ?? $request->user()->name ?? $request->user()->username,
                    'username' => $request->user()->username,
                    'email' => $request->user()->email ?? $request->user()->username.'@rental.test',
                    'role' => $request->user()->role->role ?? 'Administrator',
                    'avatar' => $request->user()->foto ?? null,
                ] : null,
                'customer' => $request->user('customer') ? [
                    'id' => $request->user('customer')->id,
                    'nama_lengkap' => $request->user('customer')->nama_lengkap,
                    'no_hp' => $request->user('customer')->no_hp,
                    'cart_count' => \App\Models\Keranjang::where('id_customer', $request->user('customer')->id)->count(),
                ] : null,
                'menus' => session('getmenus', []),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'message' => fn () => $request->session()->get('message'),
            ],
        ];
    }
}
