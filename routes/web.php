<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MasterData\KategoriController;
use App\Http\Controllers\MasterData\MerkController;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Http\Controllers\Pengaturan\PenggunaController;
use App\Http\Controllers\Pengaturan\RoleUserController;
use App\Http\Middleware\CheckMenuPermission;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => view('welcome'))->name('home');

// Autentikasi admin: login username, hanya untuk tamu.
Route::group(['middleware' => 'guest'], function () {
    Route::get('admin/login', [AuthController::class, 'getLogin'])->name('login');
    Route::post('admin/login', [AuthController::class, 'postLogin'])->name('admin.loginPost');
});

Route::middleware(['auth', CheckMenuPermission::class])->prefix('admin')->group(function () {
    // Metrik dashboard masih nol sampai modul transaksi & keuangan tersedia;
    // halaman tetap dibuka supaya sidebar dan hak akses bisa diverifikasi.
    Route::get('dashboard', fn () => Inertia::render('Admin/Dashboard', [
        'stats' => [
            'total_pendapatan' => 0,
            'total_pengeluaran' => 0,
            'laba_bersih' => 0,
            'sewa_aktif' => 0,
            'sewa_bulan_ini' => 0,
            'sewa_web_count' => 0,
            'sewa_admin_count' => 0,
            'total_barang' => 0,
            'stok_kritis' => 0,
            'unit_dalam_perawatan' => 0,
            'piutang_belum' => 0,
        ],
        'chartKeuangan' => ['categories' => [], 'pemasukan' => [], 'pengeluaran' => [], 'laba' => []],
        'chartKategori' => ['labels' => [], 'series' => []],
        'chartAsalPesanan' => ['labels' => [], 'series' => []],
        'sewaTerbaru' => [],
        'topBarang' => [],
        'jatuhTempo' => [],
    ]))->name('dashboard.index');

    Route::get('form-elements', fn () => Inertia::render('Admin/FormElements'))->name('form-elements.index');

    Route::prefix('master-data')->group(function () {
        Route::resource('kategori', KategoriController::class)->except(['create', 'show']);
        Route::resource('merk', MerkController::class)->except(['create', 'show']);
    });

    Route::prefix('pengaturan')->group(function () {
        Route::resource('pengguna', PenggunaController::class)->except(['create', 'show']);

        Route::get('hak-akses', [HakAksesController::class, 'index'])->name('hak-akses.index');
        Route::get('get-hak-akses', [HakAksesController::class, 'getHakAkses'])->name('admin.getHakAkses');
        Route::put('update-hak-akses', [HakAksesController::class, 'updateHakAkses'])->name('admin.updateHakAkses');

        Route::get('role-user', [RoleUserController::class, 'index'])->name('role-user.index');
        Route::get('get-role-user', [RoleUserController::class, 'getRoleUser'])->name('admin.getRoleUser');
        Route::put('update-role-user', [RoleUserController::class, 'updateRoleUser'])->name('admin.updateRoleUser');
    });

    Route::post('logout', [AuthController::class, 'logout'])->name('admin.logout');
});

Route::fallback(fn () => abort(404));
