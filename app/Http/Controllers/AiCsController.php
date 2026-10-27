<?php

namespace App\Http\Controllers;

use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class AiCsController extends Controller
{
    public function __construct(private GeminiService $gemini) {}

    /**
     * Endpoint chat untuk Admin CMS (bisa tanya seluruh sistem: transaksi, keuangan, laporan, inventori, stok).
     */
    public function chatAdmin(Request $request): JsonResponse
    {
        return $this->processChat($request, 'admin');
    }

    /**
     * Endpoint chat untuk publik (landing page, katalog, dll — hanya seputar kamera, drone, ketersediaan sewa).
     */
    public function chatPublic(Request $request): JsonResponse
    {
        return $this->processChat($request, 'public');
    }

    /**
     * Alias backward compatibility untuk route lama.
     */
    public function chat(Request $request): JsonResponse
    {
        return $this->chatAdmin($request);
    }

    /**
     * Proses pesan chat dengan rate limiter dan validasi sesuai scope.
     *
     * @param  'admin'|'public'  $scope
     */
    private function processChat(Request $request, string $scope): JsonResponse
    {
        $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'history' => ['nullable', 'array', 'max:30'],
            'history.*.role' => ['required', 'string', 'in:user,model'],
            'history.*.parts' => ['required', 'array'],
            'history.*.parts.*.text' => ['required', 'string', 'max:50000'],
        ], [
            'message.required' => 'Pesan tidak boleh kosong.',
            'message.max' => 'Pesan terlalu panjang (maksimal 1000 karakter).',
            'history.max' => 'Riwayat percakapan terlalu panjang.',
            'history.*.parts.*.text.max' => 'Riwayat pesan melebihi batas karakter.',
        ]);

        if ($scope === 'admin') {
            if (! auth()->check()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Sesi login telah berakhir. Silakan login kembali.',
                ], 401);
            }

            $userId = auth()->id() ?? 'admin';
            $rateLimitKey = "ai-chat-admin:{$userId}";
            $maxAttempts = 30;
        } else {
            $ip = $request->ip() ?? 'guest';
            $rateLimitKey = "ai-chat-public:{$ip}";
            $maxAttempts = 20;
        }

        if (RateLimiter::tooManyAttempts($rateLimitKey, maxAttempts: $maxAttempts)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);

            return response()->json([
                'status' => 'error',
                'message' => "Terlalu banyak permintaan. Silakan tunggu {$seconds} detik.",
            ], 429);
        }

        RateLimiter::hit($rateLimitKey, decaySeconds: 60);

        try {
            /** @var array<int, array{role: string, parts: array<int, array{text: string}>}> $history */
            $history = $request->input('history', []);

            // Sanitasi history — hanya ambil role & text yang valid
            $sanitizedHistory = collect($history)
                ->map(fn ($item) => [
                    'role' => $item['role'],
                    'parts' => collect($item['parts'])
                        ->map(fn ($part) => ['text' => $part['text']])
                        ->toArray(),
                ])
                ->toArray();

            $userMessage = trim($request->string('message'));

            $reply = $this->gemini->chat($sanitizedHistory, $userMessage, $scope);

            return response()->json([
                'status' => 'success',
                'message' => $reply,
            ]);
        } catch (\RuntimeException $e) {
            Log::warning("AI CS chat error ({$scope}) runtime: ".$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 503);
        } catch (\Throwable $e) {
            Log::error("AI CS chat error ({$scope}) unexpected: ".$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan pada layanan AI. Silakan coba beberapa saat lagi.',
            ], 500);
        }
    }
}
