<?php

use App\Http\Controllers\AiCsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\CustomerBookingController;
use App\Http\Controllers\CustomerKeranjangController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Inventori\PengadaanBarangController;
use App\Http\Controllers\Inventori\RiwayatStokController;
use App\Http\Controllers\Keuangan\PemasukanController;
use App\Http\Controllers\Keuangan\PengeluaranController;
use App\Http\Controllers\Keuangan\PiutangController;
use App\Http\Controllers\Laporan\LaporanKeuanganController;
use App\Http\Controllers\Laporan\LaporanPiutangHutangController;
use App\Http\Controllers\Laporan\LaporanSewaController;
use App\Http\Controllers\MasterData\BarangController;
use App\Http\Controllers\MasterData\CustomerController;
use App\Http\Controllers\MasterData\KategoriController;
use App\Http\Controllers\MasterData\KategoriTransaksiController;
use App\Http\Controllers\MasterData\MerkController;
use App\Http\Controllers\MasterData\RekeningController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Http\Controllers\Pengaturan\PenggunaController;
use App\Http\Controllers\Pengaturan\RoleUserController;
use App\Http\Controllers\PublicCatalogController;
use App\Http\Controllers\Transaksi\PembayaranController;
use App\Http\Controllers\Transaksi\PembelianUnitController;
use App\Http\Controllers\Transaksi\PengembalianController;
use App\Http\Controllers\Transaksi\PerawatanController;
use App\Http\Controllers\Transaksi\SewaController;
use App\Http\Middleware\CheckMenuPermission;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [PublicCatalogController::class, 'landing'])->name('home');
Route::get('katalog', [PublicCatalogController::class, 'index'])->name('katalog.index');
Route::get('katalog/{id}', [PublicCatalogController::class, 'show'])->name('katalog.show');

// Redirect legacy catalog URLs
Route::get('catalog', fn () => redirect('/katalog', 301))->name('catalog.index');
Route::get('catalog/{id}', fn (string $id) => redirect("/katalog/{$id}", 301));

Route::get('tentang-kami', function () {
    return Inertia::render('AboutUs');
})->name('tentang-kami');

// Redirect legacy about-us URL
Route::get('about-us', fn () => redirect('/tentang-kami', 301));

Route::get('alur-sewa', function () {
    return redirect('/#alur-sewa', 301);
})->name('alur-sewa');

// Customer Authentication
Route::post('customer/login', [CustomerAuthController::class, 'postLogin'])->name('customer.login');
Route::post('customer/register', [CustomerAuthController::class, 'postRegister'])->name('customer.register');
Route::post('customer/logout', [CustomerAuthController::class, 'postLogout'])->name('customer.logout');
Route::get('customer/me', [CustomerAuthController::class, 'me'])->name('customer.me');

// Customer Booking & Payments
Route::post('booking', [CustomerBookingController::class, 'store'])->name('customer.booking.store');

Route::middleware('auth:customer')->group(function () {
    Route::get('riwayat-sewa', [CustomerBookingController::class, 'history'])->name('customer.history');
    Route::get('customer/payment/{sewaId}', [CustomerBookingController::class, 'paymentInfo'])->name('customer.payment.info');
    Route::post('customer/payment/{pembayaranId}/simulate', [CustomerBookingController::class, 'simulatePayment'])->name('customer.payment.simulate');
    Route::post('customer/sewa/{sewaId}/cancel', [CustomerBookingController::class, 'cancelSewa'])->name('customer.sewa.cancel');

    // Keranjang Belanja
    Route::get('keranjang', [CustomerKeranjangController::class, 'index'])->name('customer.keranjang.index');
    Route::post('keranjang', [CustomerKeranjangController::class, 'store'])->name('customer.keranjang.store');
    Route::put('keranjang/{id}', [CustomerKeranjangController::class, 'update'])->name('customer.keranjang.update');
    Route::delete('keranjang/{id}', [CustomerKeranjangController::class, 'destroy'])->name('customer.keranjang.destroy');
    Route::get('keranjang/count', [CustomerKeranjangController::class, 'count'])->name('customer.keranjang.count');
    Route::post('keranjang/checkout', [CustomerKeranjangController::class, 'checkout'])->name('customer.keranjang.checkout');
});

// Admin Auth
Route::group(['middleware' => 'guest'], function () {
    Route::get('admin/login', [AuthController::class, 'getLogin'])->name('login');
    Route::post('admin/login', [AuthController::class, 'postLogin'])->name('admin.loginPost');
    Route::get('signup', fn () => Inertia::render('Auth/SignUp'))->name('signup');
});

Route::post('ai-cs/chat', [AiCsController::class, 'chatPublic'])->name('ai-cs.public-chat');

Route::middleware(['auth', CheckMenuPermission::class])->prefix('admin')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard.index');
    Route::get('dashboard/data', [DashboardController::class, 'data'])->name('dashboard.data');
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('form-elements', fn () => Inertia::render('Admin/FormElements'))->name('form-elements.index');

    Route::prefix('master-data')->group(function () {
        Route::resource('kategori', KategoriController::class)->except(['create', 'show']);
        Route::resource('merk', MerkController::class)->except(['create', 'show']);
        Route::resource('barang', BarangController::class)->except(['create', 'show']);
        Route::resource('customer', CustomerController::class)->except(['create', 'show']);
        Route::resource('kategori-transaksi', KategoriTransaksiController::class)->except(['create', 'show']);
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

    Route::prefix('keuangan')->group(function () {
        Route::resource('pemasukan', PemasukanController::class)->except(['create', 'show']);
        Route::resource('pengeluaran', PengeluaranController::class)->except(['create', 'show']);
        Route::resource('piutang', PiutangController::class)->except(['create', 'show']);
    });

    Route::prefix('inventori')->group(function () {
        Route::get('riwayat-stok/data', [RiwayatStokController::class, 'data'])->name('riwayat-stok.data');
        Route::resource('riwayat-stok', RiwayatStokController::class)->only(['index']);
        Route::resource('pengadaan-barang', PengadaanBarangController::class)->except(['create', 'show']);
    });

    Route::prefix('laporan')->group(function () {
        Route::get('sewa', [LaporanSewaController::class, 'index'])->name('laporan-sewa.index');
        Route::get('sewa/data', [LaporanSewaController::class, 'data'])->name('laporan-sewa.data');
        Route::get('sewa/export-excel', [LaporanSewaController::class, 'cetakExcel'])->name('laporan-sewa.exportExcel');
        Route::get('sewa/export-pdf', [LaporanSewaController::class, 'cetakPdf'])->name('laporan-sewa.exportPdf');

        Route::get('keuangan', [LaporanKeuanganController::class, 'index'])->name('laporan-keuangan.index');
        Route::get('keuangan/data', [LaporanKeuanganController::class, 'data'])->name('laporan-keuangan.data');
        Route::get('keuangan/export-excel', [LaporanKeuanganController::class, 'cetakExcel'])->name('laporan-keuangan.exportExcel');
        Route::get('keuangan/export-pdf', [LaporanKeuanganController::class, 'cetakPdf'])->name('laporan-keuangan.exportPdf');

        Route::get('piutang-hutang', [LaporanPiutangHutangController::class, 'index'])->name('laporan-piutang-hutang.index');
        Route::get('piutang-hutang/data-piutang', [LaporanPiutangHutangController::class, 'dataPiutang'])->name('laporan-piutang-hutang.dataPiutang');
        Route::get('piutang-hutang/export-excel', [LaporanPiutangHutangController::class, 'cetakExcel'])->name('laporan-piutang-hutang.exportExcel');
        Route::get('piutang-hutang/export-pdf', [LaporanPiutangHutangController::class, 'cetakPdf'])->name('laporan-piutang-hutang.exportPdf');
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

    // AI Customer Service (Admin CMS)
    Route::post('ai-cs/chat', [AiCsController::class, 'chatAdmin'])->name('ai-cs.chat');
});

Route::post('midtrans/webhook', [PembayaranController::class, 'webhook'])->name('pembayaran.webhook');

Route::fallback(fn () => abort(404));
