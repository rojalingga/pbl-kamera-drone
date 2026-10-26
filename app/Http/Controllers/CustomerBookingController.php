<?php

namespace App\Http\Controllers;

use App\Exceptions\StokTidakCukupException;
use App\Models\Barang;
use App\Models\Pembayaran;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Services\NomorDokumenService;
use App\Services\PembayaranService;
use App\Services\RiwayatStokService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CustomerBookingController extends Controller
{
    public function __construct(
        private RiwayatStokService $stok,
        private PembayaranService $pembayaranService,
        private NomorDokumenService $nomor
    ) {}

    public function store(Request $request): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Silakan masuk terlebih dahulu untuk menyewa.',
            ], 401);
        }

        $request->validate([
            'id_barang' => 'required|string|exists:barang,id',
            'qty' => 'required|integer|min:1',
            'tgl_sewa' => 'required|date|after_or_equal:today',
            'tgl_akhir_sewa' => 'required|date|after:tgl_sewa',
            'foto_jaminan' => 'nullable|file|mimes:jpeg,png,jpg,webp|max:5120',
        ], [
            'id_barang.required' => 'Barang yang ingin disewa wajib dipilih.',
            'id_barang.exists' => 'Barang tidak ditemukan dalam sistem.',
            'qty.required' => 'Jumlah unit sewa wajib diisi.',
            'qty.min' => 'Jumlah unit sewa minimal 1.',
            'tgl_sewa.required' => 'Tanggal mulai sewa wajib diisi.',
            'tgl_sewa.after_or_equal' => 'Tanggal mulai sewa minimal hari ini.',
            'tgl_akhir_sewa.required' => 'Tanggal selesai sewa wajib diisi.',
            'tgl_akhir_sewa.after' => 'Tanggal selesai sewa harus setelah tanggal mulai sewa.',
            'foto_jaminan.file' => 'Foto jaminan harus berupa file dokumen/gambar.',
            'foto_jaminan.mimes' => 'Format foto jaminan harus jpeg, png, jpg, atau webp.',
            'foto_jaminan.max' => 'Ukuran file jaminan maksimal 5MB.',
        ]);

        $barang = Barang::findOrFail($request->id_barang);
        $qty = (int) $request->qty;

        if ($qty > (int) $barang->stok) {
            return response()->json([
                'status' => 'error',
                'message' => "Stok unit {$barang->nama_barang} tidak mencukupi. Tersedia {$barang->stok} unit saat ini.",
                'errors' => [
                    'qty' => ["Stok hanya tersedia {$barang->stok} unit."],
                ],
            ], 422);
        }

        $jumlahHari = max(1, (int) Carbon::parse($request->tgl_sewa)->diffInDays(Carbon::parse($request->tgl_akhir_sewa)));
        $totalBiaya = (int) ($barang->harga_sewa * $qty * $jumlahHari);

        // Upload foto jaminan jika ada
        $filenameJaminan = '';
        if ($request->hasFile('foto_jaminan')) {
            $file = $request->file('foto_jaminan');
            $filenameJaminan = Str::random(25).'.'.$file->getClientOriginalExtension();
            $file->move(public_path('assets/jaminan'), $filenameJaminan);
        }

        DB::beginTransaction();
        try {
            $sewa = Sewa::create([
                'tgl_sewa' => $request->tgl_sewa,
                'tgl_akhir_sewa' => $request->tgl_akhir_sewa,
                'id_customer' => $customer->id,
                'total_biaya' => $totalBiaya,
                'no_sewa' => $this->nomor->noSewa($request->tgl_sewa),
                'foto_jaminan' => $filenameJaminan,
                'id_users' => null,
                'status_pembayaran' => Sewa::BAYAR_PENDING,
                'asal_pesanan' => Sewa::ASAL_WEB,
            ]);

            $detail = SewaDetail::create([
                'id_sewa' => $sewa->id,
                'id_barang' => $barang->id,
                'harga_sewa_satuan' => (int) $barang->harga_sewa,
                'qty' => $qty,
            ]);

            $this->stok->kurang($barang->id, $qty, RiwayatStokService::KELUAR, ['id_sewa_detail' => $detail->id]);

            $pembayaran = $this->pembayaranService->initiatePayment($sewa->id, 'qris');

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Pemesanan sewa berhasil dibuat. Silakan lakukan pembayaran QRIS.',
                'sewa' => [
                    'id' => $sewa->id,
                    'no_sewa' => $sewa->no_sewa,
                    'total_biaya' => $sewa->total_biaya,
                    'total_biaya_formatted' => 'Rp'.number_format($totalBiaya, 0, ',', '.'),
                    'tgl_sewa' => Carbon::parse($sewa->tgl_sewa)->locale('id')->translatedFormat('j F Y'),
                    'tgl_akhir_sewa' => Carbon::parse($sewa->tgl_akhir_sewa)->locale('id')->translatedFormat('j F Y'),
                    'jumlah_hari' => $jumlahHari,
                ],
                'pembayaran' => $pembayaran,
            ]);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => ['qty' => [$e->getMessage()]],
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Customer booking error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan sistem saat memproses pemesanan: '.$e->getMessage(),
            ], 500);
        }
    }

    public function paymentInfo(string $sewaId): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json(['status' => 'error', 'message' => 'Akses ditolak.'], 401);
        }

        $sewa = Sewa::where('id', $sewaId)
            ->where('id_customer', $customer->id)
            ->first();

        if (! $sewa) {
            return response()->json(['status' => 'error', 'message' => 'Transaksi tidak ditemukan atau bukan milik Anda.'], 404);
        }

        try {
            $data = $this->pembayaranService->getPaymentInfo($sewa->id, true);

            if (! empty($data['is_expired_cancelled'])) {
                return response()->json([
                    'status' => 'expired',
                    'message' => $data['message'] ?? 'Pemesanan sewa telah kedaluwarsa dan otomatis dibatalkan.',
                    'data' => $data,
                ], 200);
            }

            return response()->json([
                'status' => 'success',
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function simulatePayment(int $pembayaranId): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json(['status' => 'error', 'message' => 'Akses ditolak.'], 401);
        }

        $pembayaran = Pembayaran::findOrFail($pembayaranId);

        $sewa = Sewa::where('id', $pembayaran->id_sewa)
            ->where('id_customer', $customer->id)
            ->first();

        if (! $sewa) {
            return response()->json(['status' => 'error', 'message' => 'Transaksi tidak valid.'], 403);
        }

        try {
            $res = $this->pembayaranService->simulateSettlement($pembayaran->id);

            return response()->json([
                'status' => 'success',
                'message' => 'Pembayaran QRIS berhasil disimulasikan.',
                'data' => $res,
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function history(Request $request): Response
    {
        $customer = Auth::guard('customer')->user();

        $sewas = Sewa::with([
            'details.barang.fotos',
            'details.barang.merk',
            'details.barang.kategori',
            'pembayarans' => fn ($q) => $q->orderByDesc('id'),
        ])
            ->where('id_customer', $customer->id)
            ->orderByDesc('created_at')
            ->get();

        $isLocal = ! App::isProduction();

        return Inertia::render('Customer/RiwayatSewa', [
            'sewas' => $sewas,
            'isLocal' => $isLocal,
        ]);
    }

    public function cancelSewa(string $sewaId): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json(['status' => 'error', 'message' => 'Silakan masuk terlebih dahulu.'], 401);
        }

        $sewa = Sewa::where('id', $sewaId)
            ->where('id_customer', $customer->id)
            ->first();

        if (! $sewa) {
            return response()->json(['status' => 'error', 'message' => 'Data sewa tidak ditemukan atau bukan milik Anda.'], 404);
        }

        if ($sewa->status_pembayaran === Sewa::BAYAR_CONFIRMED) {
            return response()->json(['status' => 'error', 'message' => 'Pemesanan yang sudah dibayar lunas tidak dapat dibatalkan.'], 422);
        }

        try {
            $cancelled = $this->pembayaranService->batalkanSewaWebExpired($sewa);

            if ($cancelled) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Pemesanan sewa berhasil dibatalkan dan stok unit telah dikembalikan.',
                ]);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membatalkan pemesanan sewa.',
            ], 500);
        } catch (\Exception $e) {
            Log::error('Cancel sewa error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan sistem saat membatalkan sewa: '.$e->getMessage(),
            ], 500);
        }
    }
}
