<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            return;
        }

        $host = request()->getHost();
        $isLocal = in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true);

        // Jika diakses dari luar (misalnya via ngrok/tunnel), gunakan aset build produksi
        // agar client lain tidak mencoba koneksi ke dev server [::1]:5173
        if ((! $isLocal || request()->hasHeader('x-forwarded-host')) && file_exists(public_path('build/manifest.json'))) {
            Vite::useHotFile(storage_path('framework/vite.hot'));
        }
    }
}
