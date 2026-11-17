<?php

namespace App\Http\Controllers;

use App\Exceptions\StokTidakCukupException;
use App\Models\Barang;
use App\Models\Keranjang;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Services\NomorDokumenService;
use App\Services\PembayaranService;
use App\Services\RiwayatStokService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CustomerKeranjangController extends Controller
{
    public function __construct(
        private RiwayatStokService $stok,
        private PembayaranService $pembayaranService,
        private NomorDokumenService $nomor
    ) {}

    public function index(Request $request): Response|JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => 'Silakan masuk terlebih dahulu.'], 401);
            }

            return redirect()->route('katalog.index');
        }

        $items = Keranjang::with([
            'barang.fotos',
            'barang.merk',
            'barang.kategori',
        ])
            ->where('id_customer', $customer->id)
            ->orderByDesc('id')
            ->get();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'status' => 'success',
                'data' => $items,
            ]);
        }

        return Inertia::render('Customer/Keranjang', [
            'items' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Silakan masuk terlebih dahulu untuk menambahkan barang ke keranjang.',
            ], 401);
        }

        $validated = $request->validate([
            'id_barang' => 'required|string|exists:barang,id',
            'qty' => 'nullable|integer|min:1',
            'tgl_sewa' => 'nullable|date',
            'tgl_akhir_sewa' => 'nullable|date',
        ], [
            'id_barang.required' => 'Barang wajib dipilih.',
            'id_barang.exists' => 'Barang tidak ditemukan dalam sistem.',
            'qty.min' => 'Jumlah sewa minimal 1 unit.',
        ]);

        $barang = Barang::findOrFail($validated['id_barang']);
        $qtyInput = (int) ($validated['qty'] ?? 1);

        if ((int) $barang->stok <= 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Stok unit {$barang->nama_barang} sedang habis.",
            ], 422);
        }

        $existing = Keranjang::where('id_customer', $customer->id)
            ->where('id_barang', $barang->id)
            ->first();

        $tglSewa = $validated['tgl_sewa'] ?? now()->toDateString();
        $tglAkhirSewa = $validated['tgl_akhir_sewa'] ?? now()->addDay()->toDateString();

        if ($existing) {
            $totalQty = $existing->qty + $qtyInput;
            if ($totalQty > (int) $barang->stok) {
                $totalQty = (int) $barang->stok;
            }
            $existing->update([
                'qty' => $totalQty,
                'tgl_sewa' => $tglSewa,
                'tgl_akhir_sewa' => $tglAkhirSewa,
            ]);
        } else {
            if ($qtyInput > (int) $barang->stok) {
                $qtyInput = (int) $barang->stok;
            }
            Keranjang::create([
                'id_customer' => $customer->id,
                'id_barang' => $barang->id,
                'qty' => $qtyInput,
                'tgl_sewa' => $tglSewa,
                'tgl_akhir_sewa' => $tglAkhirSewa,
            ]);
        }

        $count = Keranjang::where('id_customer', $customer->id)->count();

        return response()->json([
            'status' => 'success',
            'message' => "{$barang->nama_barang} berhasil ditambahkan ke keranjang.",
            'cart_count' => $count,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json(['status' => 'error', 'message' => 'Silakan masuk terlebih dahulu.'], 401);
        }

        $item = Keranjang::where('id', $id)
            ->where('id_customer', $customer->id)
            ->firstOrFail();

        $barang = Barang::findOrFail($item->id_barang);

        $validated = $request->validate([
            'qty' => 'required|integer|min:1',
            'tgl_sewa' => 'nullable|date',
            'tgl_akhir_sewa' => 'nullable|date',
        ]);

        $qty = (int) $validated['qty'];
        if ($qty > (int) $barang->stok) {
            return response()->json([
                'status' => 'error',
                'message' => "Stok unit {$barang->nama_barang} hanya tersedia {$barang->stok} unit.",
            ], 422);
        }

        $data = ['qty' => $qty];
        if (! empty($validated['tgl_sewa'])) {
            $data['tgl_sewa'] = $validated['tgl_sewa'];
        }
        if (! empty($validated['tgl_akhir_sewa'])) {
            $data['tgl_akhir_sewa'] = $validated['tgl_akhir_sewa'];
        }

        $item->update($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Keranjang berhasil diperbarui.',
            'item' => $item->fresh(['barang.fotos', 'barang.merk']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json(['status' => 'error', 'message' => 'Silakan masuk terlebih dahulu.'], 401);
        }

        Keranjang::where('id', $id)
            ->where('id_customer', $customer->id)
            ->delete();

        $count = Keranjang::where('id_customer', $customer->id)->count();

        return response()->json([
            'status' => 'success',
            'message' => 'Item berhasil dihapus dari keranjang.',
            'cart_count' => $count,
        ]);
    }

    public function count(): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json(['count' => 0]);
        }

        $count = Keranjang::where('id_customer', $customer->id)->count();

        return response()->json(['count' => $count]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer) {
            return response()->json(['status' => 'error', 'message' => 'Silakan masuk terlebih dahulu.'], 401);
        }

        if ($request->filled('tgl_sewa') && $request->filled('tgl_akhir_sewa') && is_array($request->items)) {
            $mergedItems = [];
            foreach ($request->items as $it) {
                if (is_array($it)) {
                    if (empty($it['tgl_sewa'])) {
                        $it['tgl_sewa'] = $request->tgl_sewa;
                    }
                    if (empty($it['tgl_akhir_sewa'])) {
                        $it['tgl_akhir_sewa'] = $request->tgl_akhir_sewa;
                    }
                }
                $mergedItems[] = $it;
            }
            $request->merge(['items' => $mergedItems]);
        }

        $validated = $request->validate([
            'tgl_sewa' => 'nullable|date|after_or_equal:today',
            'tgl_akhir_sewa' => 'nullable|date|after:tgl_sewa',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:keranjang,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.tgl_sewa' => 'required|date|after_or_equal:today',
            'items.*.tgl_akhir_sewa' => 'required|date|after:items.*.tgl_sewa',
        ], [
            'items.required' => 'Pilih minimal satu produk untuk di-checkout.',
            'items.min' => 'Pilih minimal satu produk untuk di-checkout.',
            'items.*.qty.required' => 'Jumlah unit sewa wajib diisi.',
            'items.*.qty.min' => 'Jumlah unit sewa minimal 1.',
            'items.*.tgl_sewa.required' => 'Tanggal mulai sewa wajib diisi.',
            'items.*.tgl_akhir_sewa.required' => 'Tanggal akhir sewa wajib diisi.',
            'items.*.tgl_akhir_sewa.after' => 'Tanggal akhir sewa harus setelah tanggal mulai sewa.',
        ]);

        $keranjangIds = collect($validated['items'])->pluck('id')->all();
        $keranjangItems = Keranjang::with('barang')
            ->where('id_customer', $customer->id)
            ->whereIn('id', $keranjangIds)
            ->get();

        if ($keranjangItems->isEmpty()) {
            return response()->json(['status' => 'error', 'message' => 'Item keranjang tidak ditemukan.'], 404);
        }

        // Tentukan rentang tanggal terluas untuk dokumen sewa
        $tglSewaMin = null;
        $tglAkhirMax = null;
        $totalBiayaSemua = 0;
        $itemsData = [];

        foreach ($validated['items'] as $inputItem) {
            $cartItem = $keranjangItems->firstWhere('id', $inputItem['id']);
            if (! $cartItem || ! $cartItem->barang) {
                continue;
            }

            $barang = $cartItem->barang;
            $qty = (int) $inputItem['qty'];

            if ($qty > (int) $barang->stok) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Stok unit {$barang->nama_barang} tidak mencukupi (tersedia {$barang->stok} unit).",
                ], 422);
            }

            $tglMulai = Carbon::parse($inputItem['tgl_sewa'])->startOfDay();
            $tglSelesai = Carbon::parse($inputItem['tgl_akhir_sewa'])->startOfDay();
            $durasiHari = max(1, (int) $tglMulai->diffInDays($tglSelesai));

            $subtotal = (int) ($barang->harga_sewa * $qty * $durasiHari);
            $totalBiayaSemua += $subtotal;

            if ($tglSewaMin === null || $tglMulai->lessThan(Carbon::parse($tglSewaMin))) {
                $tglSewaMin = $tglMulai->toDateString();
            }
            if ($tglAkhirMax === null || $tglSelesai->greaterThan(Carbon::parse($tglAkhirMax))) {
                $tglAkhirMax = $tglSelesai->toDateString();
            }

            $itemsData[] = [
                'barang' => $barang,
                'qty' => $qty,
                'harga_sewa' => (int) $barang->harga_sewa,
                'cart_id' => $cartItem->id,
            ];
        }

        if (empty($itemsData)) {
            return response()->json(['status' => 'error', 'message' => 'Tidak ada item valid untuk diproses.'], 422);
        }

        DB::beginTransaction();
        try {
            $sewa = Sewa::create([
                'tgl_sewa' => $tglSewaMin,
                'tgl_akhir_sewa' => $tglAkhirMax,
                'id_customer' => $customer->id,
                'total_biaya' => $totalBiayaSemua,
                'no_sewa' => $this->nomor->noSewa($tglSewaMin),
                'foto_jaminan' => '',
                'id_users' => null,
                'status_pembayaran' => Sewa::BAYAR_PENDING,
                'asal_pesanan' => Sewa::ASAL_WEB,
            ]);

            foreach ($itemsData as $data) {
                $detail = SewaDetail::create([
                    'id_sewa' => $sewa->id,
                    'id_barang' => $data['barang']->id,
                    'harga_sewa_satuan' => $data['harga_sewa'],
                    'qty' => $data['qty'],
                ]);

                $this->stok->kurang($data['barang']->id, $data['qty'], RiwayatStokService::KELUAR, ['id_sewa_detail' => $detail->id]);
            }

            // Inisiasi pembayaran QRIS
            $pembayaran = $this->pembayaranService->initiatePayment($sewa->id, 'qris');

            // Hapus item yang berhasil dicheckout dari keranjang
            Keranjang::where('id_customer', $customer->id)
                ->whereIn('id', collect($itemsData)->pluck('cart_id'))
                ->delete();

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Pemesanan sewa dari keranjang berhasil dibuat. Silakan lakukan pembayaran QRIS.',
                'sewa' => [
                    'id' => $sewa->id,
                    'no_sewa' => $sewa->no_sewa,
                    'total_biaya' => $sewa->total_biaya,
                    'total_biaya_formatted' => 'Rp'.number_format($totalBiayaSemua, 0, ',', '.'),
                    'tgl_sewa' => Carbon::parse($sewa->tgl_sewa)->locale('id')->translatedFormat('j F Y'),
                    'tgl_akhir_sewa' => Carbon::parse($sewa->tgl_akhir_sewa)->locale('id')->translatedFormat('j F Y'),
                ],
                'pembayaran' => $pembayaran,
                'cart_count' => Keranjang::where('id_customer', $customer->id)->count(),
            ]);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Checkout keranjang error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan sistem saat checkout keranjang: '.$e->getMessage(),
            ], 500);
        }
    }
}
