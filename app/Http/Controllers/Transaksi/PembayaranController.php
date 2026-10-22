<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Services\PembayaranService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PembayaranController extends Controller
{
    public function __construct(private PembayaranService $pembayaranService) {}

    public function show(Request $request, string $sewaId): JsonResponse
    {
        try {
            $data = $this->pembayaranService->getPaymentInfo($sewaId, $request->boolean('refresh'));

            return response()->json([
                'status' => 'success',
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    public function store(Request $request, string $sewaId): JsonResponse
    {
        $validated = $request->validate([
            'metode_pembayaran' => 'required|in:qris,cash,transfer',
        ], [
            'metode_pembayaran.required' => 'Metode pembayaran wajib dipilih.',
            'metode_pembayaran.in' => 'Metode pembayaran yang dipilih tidak valid.',
        ]);

        try {
            $pembayaran = $this->pembayaranService->initiatePayment($sewaId, $validated['metode_pembayaran']);

            return response()->json([
                'status' => 'success',
                'data' => $pembayaran,
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error initiating payment: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function showDenda(Request $request, int $id): JsonResponse
    {
        try {
            $data = $this->pembayaranService->getDendaPaymentInfo($id, $request->boolean('refresh'));

            return response()->json([
                'status' => 'success',
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    public function storeDenda(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'metode_pembayaran' => 'required|in:qris,cash,transfer',
        ], [
            'metode_pembayaran.required' => 'Metode pembayaran wajib dipilih.',
            'metode_pembayaran.in' => 'Metode pembayaran yang dipilih tidak valid.',
        ]);

        try {
            $pembayaran = $this->pembayaranService->initiateDendaPayment($id, $validated['metode_pembayaran']);

            return response()->json([
                'status' => 'success',
                'data' => $pembayaran,
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error initiating denda payment: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function confirm(int $pembayaranId): JsonResponse
    {
        try {
            $pembayaran = $this->pembayaranService->confirmManualPayment($pembayaranId);

            return response()->json([
                'status' => 'success',
                'data' => $pembayaran,
            ]);
        } catch (\Exception $e) {
            Log::error('Error confirming payment: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function simulate(int $pembayaranId): JsonResponse
    {
        try {
            $pembayaran = $this->pembayaranService->simulateSettlement($pembayaranId);

            return response()->json([
                'status' => 'success',
                'data' => $pembayaran,
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error simulating payment: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function webhook(Request $request): JsonResponse
    {
        try {
            $result = $this->pembayaranService->handleWebhook($request->all());

            return response()->json($result);
        } catch (\DomainException $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error handling Midtrans webhook: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
