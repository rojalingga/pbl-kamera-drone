<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Inventori\PengadaanBarangController;
use App\Http\Controllers\Inventori\RiwayatStokController;
use App\Http\Controllers\MasterData\BarangController;
use App\Http\Controllers\MasterData\CustomerController;
use App\Http\Controllers\MasterData\KategoriController;
use App\Http\Controllers\MasterData\MerkController;
use App\Http\Controllers\MasterData\RekeningController;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Http\Controllers\Pengaturan\PenggunaController;
use App\Http\Controllers\Pengaturan\RoleUserController;
use App\Http\Controllers\Transaksi\PembayaranController;
use App\Http\Controllers\Transaksi\PembelianUnitController;
use App\Http\Controllers\Transaksi\PengembalianController;
use App\Http\Controllers\Transaksi\PerawatanController;
use App\Http\Controllers\Transaksi\SewaController;
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
        Route::resource('barang', BarangController::class)->except(['create', 'show']);
        Route::resource('customer', CustomerController::class)->except(['create', 'show']);
        Route::resource('rekening', RekeningController::class)->except(['create', 'show']);
    });

    Route::prefix('transaksi')->group(function () {
        Route::resource('sewa', SewaController::class)->except(['create', 'show']);
        Route::get('sewa/{sewa}/struk', [SewaController::class, 'struk'])->name('sewa.struk');
        Route::get('sewa/{sewa}/pembayaran', [PembayaranController::class, 'show'])->name('pembayaran.show');
        Route::post('sewa/{sewa}/pembayaran', [PembayaranController::class, 'store'])->name('pembayaran.store');
        Route::post('pembayaran/{pembayaran}/confirm', [PembayaranController::class, 'confirm'])->name('pembayaran.confirm');
        Route::post('pembayaran/{pembayaran}/simulate', [PembayaranController::class, 'simulate'])->name('pembayaran.simulate');
        Route::get('pengembalian/{pengembalian}/pembayaran', [PembayaranController::class, 'showDenda'])->name('pembayaran.showDenda');
        Route::post('pengembalian/{pengembalian}/pembayaran', [PembayaranController::class, 'storeDenda'])->name('pembayaran.storeDenda');
        Route::resource('pengembalian', PengembalianController::class)->except(['create', 'show']);
        Route::resource('perawatan', PerawatanController::class)->except(['create', 'show']);
        Route::patch('perawatan-detail/{id}/status', [PerawatanController::class, 'updateStatusDetail'])->name('perawatan-detail.status');
        Route::resource('pembelian-unit', PembelianUnitController::class)->except(['create', 'show']);
    });

    Route::prefix('inventori')->group(function () {
        Route::get('riwayat-stok/data', [RiwayatStokController::class, 'data'])->name('riwayat-stok.data');
        Route::resource('riwayat-stok', RiwayatStokController::class)->only(['index']);
        Route::resource('pengadaan-barang', PengadaanBarangController::class)->except(['create', 'show']);
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

Route::post('midtrans/webhook', [PembayaranController::class, 'webhook'])->name('pembayaran.webhook');

Route::fallback(fn () => abort(404));
