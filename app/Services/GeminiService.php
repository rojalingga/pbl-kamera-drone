<?php

namespace App\Services;

use App\Models\Barang;
use App\Models\Kategori;
use App\Models\Pembayaran;
use App\Models\PembelianUnit;
use App\Models\PengadaanBarang;
use App\Models\Pengembalian;
use App\Models\PerawatanBarang;
use App\Models\Piutang;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use App\Models\RiwayatStok;
use App\Models\Sewa;
use App\Models\SewaDetail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service untuk berkomunikasi dengan Google Gemini API.
 *
 * Menerapkan pola "grounded generation" dengan tool calling:
 * - Scope 'public': Hanya menjawab seputar kamera, drone, ketersediaan, dan rekomendasi publik.
 * - Scope 'admin': Memiliki akses penuh ke sistem (transaksi sewa, laporan keuangan/piutang, inventori stok/pengadaan).
 */
class GeminiService
{
    private string $apiKey;

    private string $model;

    private string $baseUrl;

    private int $timeout;

    /**
     * Chain model fallback: jika model utama habis quota, coba model berikutnya.
     *
     * @var array<int, string>
     */
    private array $modelFallbackChain;

    /** @var array<int, array{category: string, threshold: string}> */
    private array $safetySettings;

    public function __construct()
    {
        $this->apiKey = (string) config('gemini.api_key');
        $this->model = (string) config('gemini.model');
        $this->baseUrl = (string) config('gemini.api_base_url');
        $this->timeout = (int) config('gemini.timeout', 30);
        $this->safetySettings = (array) config('gemini.safety_settings', []);

        $this->modelFallbackChain = array_values(array_unique(array_filter([
            $this->model,
            'gemini-3.5-flash-lite',
            'gemini-3.5-flash',
            'gemini-3.6-flash',
            'gemini-3.7-flash',
        ])));
    }

    /**
     * Kirim percakapan ke Gemini dan kembalikan teks respons.
     *
     * @param  array<int, array{role: string, parts: array<int, array{text: string}>}>  $history
     * @param  'admin'|'public'  $scope
     *
     * @throws \RuntimeException jika API gagal
     */
    public function chat(array $history, string $userMessage, string $scope = 'public'): string
    {
        $systemInstruction = $this->buildSystemInstruction($scope);
        $tools = $this->buildToolDeclarations($scope);

        $contents = $history;
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $userMessage]],
        ];

        $payload = [
            'system_instruction' => [
                'parts' => [['text' => $systemInstruction]],
            ],
            'contents' => $contents,
            'tools' => $tools,
            'safety_settings' => $this->safetySettings,
            'generation_config' => [
                'temperature' => 0.3,
                'max_output_tokens' => 1500,
                'top_p' => 0.8,
            ],
        ];

        $response = $this->callApi($payload);

        return $this->processResponse($response, $contents, 0, $scope);
    }

    /**
     * Proses respons Gemini — tangani function call berulang (hingga 5 turn).
     *
     * @param  array<string, mixed>  $data
     * @param  array<int, mixed>  $contents
     */
    private function processResponse(array $data, array $contents, int $depth = 0, string $scope = 'public'): string
    {
        $candidate = $data['candidates'][0] ?? null;

        if (! $candidate) {
            $blockReason = $data['promptFeedback']['blockReason'] ?? null;
            if ($blockReason) {
                return 'Maaf, pesan ini tidak dapat diproses karena alasan keamanan.';
            }
            throw new \RuntimeException('Respons tidak valid dari API AI.');
        }

        $modelContent = $candidate['content'] ?? ['role' => 'model', 'parts' => []];
        $parts = $modelContent['parts'] ?? [];

        $functionCallPart = null;
        foreach ($parts as $part) {
            if (isset($part['functionCall'])) {
                $functionCallPart = $part;
                break;
            }
        }

        if ($functionCallPart !== null && $depth < 5) {
            $functionName = $functionCallPart['functionCall']['name'];
            $args = $functionCallPart['functionCall']['args'] ?? [];

            $functionResult = $this->executeTool($functionName, $args, $scope);

            $sanitizedParts = [];
            foreach ($parts as $part) {
                if (isset($part['functionCall'])) {
                    $fc = $part['functionCall'];
                    $fcArgs = $fc['args'] ?? [];
                    $fc['args'] = empty($fcArgs) ? (object) [] : (object) $fcArgs;
                    $part['functionCall'] = $fc;
                }
                $sanitizedParts[] = $part;
            }

            $modelContent['parts'] = $sanitizedParts;
            $contents[] = $modelContent;

            $functionResponsePart = [
                'name' => $functionName,
                'response' => [
                    'result' => empty($functionResult) ? (object) [] : $functionResult,
                ],
            ];

            if (isset($functionCallPart['functionCall']['id'])) {
                $functionResponsePart['id'] = $functionCallPart['functionCall']['id'];
            }

            $contents[] = [
                'role' => 'user',
                'parts' => [[
                    'functionResponse' => $functionResponsePart,
                ]],
            ];

            return $this->sendWithFunctionResult($contents, $depth + 1, $scope);
        }

        return $this->extractTextFromParts($parts)
            ?: 'Maaf, saya tidak dapat memberikan respons saat ini.';
    }

    private function sendWithFunctionResult(array $contents, int $depth = 1, string $scope = 'public'): string
    {
        $systemInstruction = $this->buildSystemInstruction($scope);
        $tools = $this->buildToolDeclarations($scope);

        $payload = [
            'system_instruction' => [
                'parts' => [['text' => $systemInstruction]],
            ],
            'contents' => $contents,
            'tools' => $tools,
            'safety_settings' => $this->safetySettings,
            'generation_config' => [
                'temperature' => 0.3,
                'max_output_tokens' => 1500,
                'top_p' => 0.8,
            ],
        ];

        $data = $this->callApi($payload, errorContext: 'function_result');

        return $this->processResponse($data, $contents, $depth, $scope);
    }

    /**
     * Kirim HTTP request ke Gemini API dengan retry (503) dan model fallback (429).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws \RuntimeException
     */
    private function callApi(array $payload, string $errorContext = 'chat'): array
    {
        $maxRetries503 = 3;
        $lastException = null;

        foreach ($this->modelFallbackChain as $model) {
            $url = "{$this->baseUrl}/{$model}:generateContent?key={$this->apiKey}";
            $delayMs = 1000;

            for ($attempt = 1; $attempt <= $maxRetries503; $attempt++) {
                $response = Http::timeout($this->timeout)->post($url, $payload);

                if ($response->successful()) {
                    if ($model !== $this->model) {
                        Log::info("Gemini fallback model berhasil: {$model}");
                    }

                    return $response->json();
                }

                $status = $response->status();

                if ($status === 429) {
                    Log::warning("Gemini quota habis [{$errorContext}]", [
                        'model' => $model,
                        'status' => $status,
                    ]);
                    $lastException = new \RuntimeException(
                        'Kapasitas layanan AI sedang penuh. Silakan coba lagi dalam beberapa saat.'
                    );
                    break;
                }

                if ($status === 503 && $attempt < $maxRetries503) {
                    Log::warning("Gemini 503 [{$errorContext}] — retry {$attempt}/{$maxRetries503}", [
                        'model' => $model,
                        'delay_ms' => $delayMs,
                    ]);
                    usleep($delayMs * 1000);
                    $delayMs *= 2;

                    continue;
                }

                Log::error("Gemini API error [{$errorContext}]", [
                    'model' => $model,
                    'status' => $status,
                    'attempt' => $attempt,
                    'body' => $response->body(),
                ]);

                $lastException = match ($status) {
                    503 => new \RuntimeException('Layanan AI sedang sibuk. Silakan coba beberapa saat lagi.'),
                    401 => new \RuntimeException('Konfigurasi layanan AI tidak valid. Hubungi administrator.'),
                    default => new \RuntimeException('Layanan AI tidak tersedia. Silakan coba lagi.'),
                };

                break 2;
            }
        }

        throw $lastException ?? new \RuntimeException('Layanan AI tidak dapat dihubungi saat ini.');
    }

    /**
     * Ekstrak teks dari parts — skip thought parts.
     *
     * @param  array<int, mixed>  $parts
     */
    private function extractTextFromParts(array $parts): string
    {
        $text = '';
        foreach ($parts as $part) {
            if (isset($part['thought']) && $part['thought'] === true) {
                continue;
            }
            if (isset($part['text'])) {
                $text .= $part['text'];
            }
        }

        return trim($text);
    }

    /**
     * Eksekusi tool yang diminta oleh Gemini berdasarkan nama dan verifikasi hak akses scope.
     *
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    private function executeTool(string $name, array $args, string $scope = 'public'): array
    {
        // 1. Tool publik (dapat dipanggil oleh mode public maupun admin)
        $publicTools = [
            'cek_stok_barang' => fn () => $this->toolCekStokBarang($args['nama_barang'] ?? ''),
            'daftar_semua_barang' => fn () => $this->toolDaftarSemuaBarang($args['kategori'] ?? null),
            'rekomendasi_barang' => fn () => $this->toolRekomendasiBarang(
                $args['kebutuhan'] ?? '',
                isset($args['anggaran_per_hari']) ? (int) $args['anggaran_per_hari'] : null
            ),
            'info_harga_sewa' => fn () => $this->toolInfoHargaSewa($args['nama_barang'] ?? ''),
        ];

        if (isset($publicTools[$name])) {
            return $publicTools[$name]();
        }

        // 2. Keamanan: Jika bukan scope admin, blokir akses ke tool internal CMS
        if ($scope !== 'admin') {
            return [
                'error' => 'Akses ditolak: Data ini merupakan informasi rahasia internal perusahaan yang hanya dapat diakses melalui panel Admin CMS.',
            ];
        }

        // 3. Tool internal Admin CMS
        return match ($name) {
            'admin_cek_transaksi_sewa' => $this->toolAdminCekTransaksiSewa(
                $args['search'] ?? null,
                $args['status'] ?? null,
                (int) ($args['limit'] ?? 10)
            ),
            'admin_detail_transaksi_sewa' => $this->toolAdminDetailTransaksiSewa(
                $args['kata_kunci'] ?? ''
            ),
            'admin_cek_sewa_jatuh_tempo' => $this->toolAdminCekSewaJatuhTempo(
                (int) ($args['limit'] ?? 10)
            ),
            'admin_cek_pengembalian' => $this->toolAdminCekPengembalian(
                $args['search'] ?? null,
                (int) ($args['limit'] ?? 10)
            ),
            'admin_ringkasan_laporan_sewa' => $this->toolAdminRingkasanLaporanSewa(
                $args['tanggal_awal'] ?? null,
                $args['tanggal_akhir'] ?? null
            ),
            'admin_ringkasan_laporan_keuangan' => $this->toolAdminRingkasanLaporanKeuangan(
                $args['tanggal_awal'] ?? null,
                $args['tanggal_akhir'] ?? null
            ),
            'admin_cek_laporan_piutang' => $this->toolAdminCekLaporanPiutang(
                $args['status'] ?? null
            ),
            'admin_cek_inventori_mutasi_stok' => $this->toolAdminCekInventoriMutasiStok(
                $args['nama_barang'] ?? null,
                $args['jenis'] ?? null,
                (int) ($args['limit'] ?? 10)
            ),
            'admin_cek_pengadaan_barang' => $this->toolAdminCekPengadaanBarang(
                (int) ($args['limit'] ?? 10)
            ),
            'admin_cek_perawatan_barang' => $this->toolAdminCekPerawatanBarang(
                (int) ($args['limit'] ?? 10)
            ),
            'admin_cek_pembelian_unit' => $this->toolAdminCekPembelianUnit(
                (int) ($args['limit'] ?? 10)
            ),
            default => ['error' => "Tool '{$name}' tidak dikenali."],
        };
    }

    // =========================================================================
    // PUBLIC TOOLS
    // =========================================================================

    /**
     * Cek stok barang berdasarkan nama (pencarian fuzzy).
     *
     * @return array<string, mixed>
     */
    private function toolCekStokBarang(string $namaBarang): array
    {
        if (empty($namaBarang)) {
            return ['error' => 'Nama barang harus diisi.'];
        }

        $barangs = Barang::with(['kategori', 'merk'])
            ->where('nama_barang', 'like', "%{$namaBarang}%")
            ->get(['id', 'nama_barang', 'stok', 'harga_sewa', 'keterangan', 'id_kategori', 'id_merk']);

        if ($barangs->isEmpty()) {
            return [
                'ditemukan' => false,
                'pesan' => "Tidak ada barang dengan nama mengandung '{$namaBarang}'.",
            ];
        }

        return [
            'ditemukan' => true,
            'total_item' => $barangs->count(),
            'barang' => $barangs->map(fn ($b) => [
                'nama' => $b->nama_barang,
                'stok' => $b->stok,
                'tersedia' => $b->stok > 0,
                'harga_sewa_per_hari' => 'Rp '.number_format((float) ($b->harga_sewa ?? 0), 0, ',', '.'),
                'kategori' => $b->kategori?->kategori ?? '-',
                'merk' => $b->merk?->merk ?? '-',
                'keterangan' => $b->keterangan ?? '-',
            ])->toArray(),
        ];
    }

    /**
     * Ambil daftar semua barang, opsional filter per kategori.
     *
     * @return array<string, mixed>
     */
    private function toolDaftarSemuaBarang(?string $kategori): array
    {
        $query = Barang::with(['kategori', 'merk']);

        if ($kategori) {
            $query->whereHas('kategori', function ($q) use ($kategori) {
                $q->where('kategori', 'like', "%{$kategori}%");
            });
        }

        $barangs = $query->orderBy('nama_barang')->get();

        if ($barangs->isEmpty()) {
            return [
                'total' => 0,
                'pesan' => $kategori
                    ? "Tidak ada barang dalam kategori '{$kategori}'."
                    : 'Belum ada barang tersedia.',
                'barang' => [],
            ];
        }

        return [
            'total' => $barangs->count(),
            'barang' => $barangs->map(fn ($b) => [
                'nama' => $b->nama_barang,
                'stok' => $b->stok,
                'tersedia' => $b->stok > 0,
                'harga_sewa_per_hari' => 'Rp '.number_format((float) ($b->harga_sewa ?? 0), 0, ',', '.'),
                'kategori' => $b->kategori?->kategori ?? '-',
                'merk' => $b->merk?->merk ?? '-',
            ])->toArray(),
        ];
    }

    /**
     * Berikan rekomendasi barang sesuai kebutuhan dan anggaran.
     *
     * @return array<string, mixed>
     */
    private function toolRekomendasiBarang(string $kebutuhan, ?int $anggaranPerHari): array
    {
        $query = Barang::with(['kategori', 'merk'])->where('stok', '>', 0);

        if ($anggaranPerHari) {
            $query->where('harga_sewa', '<=', $anggaranPerHari);
        }

        $keywords = array_filter(explode(' ', strtolower($kebutuhan)));
        if (! empty($keywords)) {
            $query->where(function ($q) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $q->orWhere('nama_barang', 'like', "%{$keyword}%")
                        ->orWhereHas('kategori', fn ($kq) => $kq->where('kategori', 'like', "%{$keyword}%"))
                        ->orWhereHas('merk', fn ($mq) => $mq->where('merk', 'like', "%{$keyword}%"))
                        ->orWhere('keterangan', 'like', "%{$keyword}%");
                }
            });
        }

        $barangs = $query->orderBy('harga_sewa')->limit(10)->get();

        if ($barangs->isEmpty()) {
            $barangs = Barang::with(['kategori', 'merk'])
                ->where('stok', '>', 0)
                ->when($anggaranPerHari, fn ($q) => $q->where('harga_sewa', '<=', $anggaranPerHari))
                ->orderBy('harga_sewa')
                ->limit(10)
                ->get();
        }

        return [
            'total_rekomendasi' => $barangs->count(),
            'kebutuhan_dicari' => $kebutuhan,
            'anggaran_per_hari' => $anggaranPerHari ? 'Rp '.number_format($anggaranPerHari, 0, ',', '.') : 'Bebas',
            'rekomendasi' => $barangs->map(fn ($b) => [
                'nama' => $b->nama_barang,
                'stok' => $b->stok,
                'harga_sewa_per_hari' => 'Rp '.number_format((float) ($b->harga_sewa ?? 0), 0, ',', '.'),
                'kategori' => $b->kategori?->kategori ?? '-',
                'merk' => $b->merk?->merk ?? '-',
                'keterangan' => $b->keterangan ?? '-',
            ])->toArray(),
        ];
    }

    /**
     * Info harga sewa barang tertentu.
     *
     * @return array<string, mixed>
     */
    private function toolInfoHargaSewa(string $namaBarang): array
    {
        return $this->toolCekStokBarang($namaBarang);
    }

    // =========================================================================
    // ADMIN CMS TOOLS — TRANSAKSI, LAPORAN, INVENTORI
    // =========================================================================

    /**
     * Admin: Cek daftar transaksi sewa di sistem.
     *
     * @return array<string, mixed>
     */
    private function toolAdminCekTransaksiSewa(?string $search, ?string $status, int $limit = 10): array
    {
        $query = Sewa::with(['customer', 'details.barang', 'pengembalians'])
            ->orderByDesc('tgl_sewa')
            ->orderByDesc('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('no_sewa', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($cq) => $cq->where('nama_lengkap', 'like', "%{$search}%"));
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        $sewas = $query->limit(min(20, max(1, $limit)))->get();

        return [
            'total_ditemukan' => $sewas->count(),
            'transaksi' => $sewas->map(fn ($s) => [
                'id' => (string) $s->id,
                'no_sewa' => $s->no_sewa ?? '-',
                'customer' => $s->customer?->nama_lengkap ?? '-',
                'no_hp' => $s->customer?->no_hp ?? '-',
                'tgl_sewa' => $s->tgl_sewa ? Carbon::parse($s->tgl_sewa)->locale('id')->isoFormat('D MMM Y') : '-',
                'tgl_akhir_sewa' => $s->tgl_akhir_sewa ? Carbon::parse($s->tgl_akhir_sewa)->locale('id')->isoFormat('D MMM Y') : '-',
                'total_biaya' => 'Rp '.number_format((float) ($s->total_biaya ?? 0), 0, ',', '.'),
                'status_pembayaran' => $s->status_pembayaran ?? '-',
                'status_sewa' => $s->status_sewa ?? '-',
                'status_pengembalian' => $s->pengembalians->isNotEmpty() ? 'Sudah Dikembalikan' : 'Belum Dikembalikan',
                'item_disewa' => $s->details->map(fn ($d) => ($d->barang?->nama_barang ?? 'Barang')." ({$d->qty}x)")->implode(', '),
            ])->toArray(),
        ];
    }

    /**
     * Admin: Cek rincian detail 1 transaksi sewa.
     *
     * @return array<string, mixed>
     */
    private function toolAdminDetailTransaksiSewa(string $kataKunci): array
    {
        if (empty($kataKunci)) {
            return ['ditemukan' => false, 'pesan' => 'Nomor sewa atau nama pelanggan harus diisi.'];
        }

        $sewa = Sewa::with([
            'customer',
            'user',
            'details.barang.kategori',
            'details.barang.merk',
            'pengembalians.details.sewaDetail.barang',
        ])
            ->where(function ($q) use ($kataKunci) {
                $q->where('id', $kataKunci)
                    ->orWhere('no_sewa', $kataKunci)
                    ->orWhere('no_sewa', 'like', "%{$kataKunci}%")
                    ->orWhereHas('customer', fn ($cq) => $cq->where('nama_lengkap', 'like', "%{$kataKunci}%"));
            })
            ->orderByDesc('id')
            ->first();

        if (! $sewa) {
            return [
                'ditemukan' => false,
                'pesan' => "Transaksi sewa dengan kata kunci '{$kataKunci}' tidak ditemukan.",
            ];
        }

        $pembayaran = Pembayaran::where('id_sewa', $sewa->id)->orderByDesc('id')->first();

        return [
            'ditemukan' => true,
            'id' => (string) $sewa->id,
            'no_sewa' => $sewa->no_sewa ?? '-',
            'customer' => [
                'nama' => $sewa->customer?->nama_lengkap ?? '-',
                'no_hp' => $sewa->customer?->no_hp ?? '-',
            ],
            'petugas_admin' => $sewa->user?->nama_lengkap ?? '-',
            'periode' => [
                'tgl_sewa' => $sewa->tgl_sewa ? Carbon::parse($sewa->tgl_sewa)->locale('id')->isoFormat('dddd, D MMMM Y') : '-',
                'tgl_akhir_sewa' => $sewa->tgl_akhir_sewa ? Carbon::parse($sewa->tgl_akhir_sewa)->locale('id')->isoFormat('dddd, D MMMM Y') : '-',
            ],
            'total_biaya' => 'Rp '.number_format((float) ($sewa->total_biaya ?? 0), 0, ',', '.'),
            'status_pembayaran' => $sewa->status_pembayaran ?? '-',
            'status_sewa' => $sewa->status_sewa ?? '-',
            'foto_jaminan' => ! empty($sewa->foto_jaminan) ? 'Terlampir' : 'Tidak ada foto',
            'rincian_barang' => $sewa->details->map(fn ($d) => [
                'nama_barang' => $d->barang?->nama_barang ?? '-',
                'kategori' => $d->barang?->kategori?->kategori ?? '-',
                'merk' => $d->barang?->merk?->merk ?? '-',
                'qty' => $d->qty,
                'harga_satuan' => 'Rp '.number_format((float) ($d->harga_sewa_satuan ?? 0), 0, ',', '.'),
                'subtotal' => 'Rp '.number_format((float) (($d->harga_sewa_satuan ?? 0) * $d->qty), 0, ',', '.'),
            ])->toArray(),
            'pembayaran' => [
                'metode' => $pembayaran?->metode_pembayaran ?? $pembayaran?->payment_type ?? ($sewa->status_pembayaran === Sewa::BAYAR_PENDING ? 'Belum bayar' : 'Tunai/Manual'),
                'status' => $pembayaran?->transaction_status ?? ($sewa->status_pembayaran === Sewa::BAYAR_PENDING ? 'Pending' : 'Lunas'),
                'nominal' => $pembayaran ? 'Rp '.number_format((float) $pembayaran->gross_amount, 0, ',', '.') : '-',
            ],
            'pengembalian' => $sewa->pengembalians->map(fn ($p) => [
                'tgl_pengembalian' => $p->tgl_pengembalian ? Carbon::parse($p->tgl_pengembalian)->locale('id')->isoFormat('D MMM Y') : '-',
                'total_denda' => 'Rp '.number_format((float) ($p->total_denda ?? 0), 0, ',', '.'),
                'status' => $p->status ?? '-',
                'kondisi_barang' => $p->details->map(fn ($pd) => [
                    'barang' => $pd->sewaDetail?->barang?->nama_barang ?? '-',
                    'qty' => $pd->qty_pengembalian,
                    'status' => $pd->status ?? 'baik',
                    'keterangan' => $pd->keterangan ?? '-',
                ])->toArray(),
            ])->toArray(),
        ];
    }

    /**
     * Admin: Cek sewa yang sudah jatuh tempo / terlambat dan belum dikembalikan.
     *
     * @return array<string, mixed>
     */
    private function toolAdminCekSewaJatuhTempo(int $limit = 10): array
    {
        $today = now()->startOfDay();
        $terlambats = Sewa::with(['customer', 'details.barang'])
            ->whereDoesntHave('pengembalians')
            ->whereDate('tgl_akhir_sewa', '<', $today)
            ->orderBy('tgl_akhir_sewa')
            ->limit(min(30, max(1, $limit)))
            ->get();

        return [
            'total_terlambat' => $terlambats->count(),
            'daftar_sewa_terlambat' => $terlambats->map(function ($s) use ($today) {
                $akhir = Carbon::parse($s->tgl_akhir_sewa)->startOfDay();
                $hariTelat = (int) $akhir->diffInDays($today);

                return [
                    'no_sewa' => $s->no_sewa ?? '-',
                    'customer' => $s->customer?->nama_lengkap ?? '-',
                    'no_hp' => $s->customer?->no_hp ?? '-',
                    'tgl_sewa' => Carbon::parse($s->tgl_sewa)->locale('id')->isoFormat('D MMM Y'),
                    'seharusnya_kembali' => $akhir->locale('id')->isoFormat('D MMM Y'),
                    'keterlambatan' => "{$hariTelat} hari terlambat",
                    'item' => $s->details->map(fn ($d) => ($d->barang?->nama_barang ?? 'Barang')." ({$d->qty}x)")->implode(', '),
                    'total_biaya' => 'Rp '.number_format((float) ($s->total_biaya ?? 0), 0, ',', '.'),
                ];
            })->toArray(),
        ];
    }

    /**
     * Admin: Cek riwayat pengembalian barang sewa.
     *
     * @return array<string, mixed>
     */
    private function toolAdminCekPengembalian(?string $search, int $limit = 10): array
    {
        $query = Pengembalian::with(['sewa.customer', 'user', 'details.sewaDetail.barang'])
            ->orderByDesc('tgl_pengembalian')
            ->orderByDesc('id');

        if ($search) {
            $query->whereHas('sewa', function ($sq) use ($search) {
                $sq->where('no_sewa', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($cq) => $cq->where('nama_lengkap', 'like', "%{$search}%"));
            });
        }

        $pengembalians = $query->limit(min(20, max(1, $limit)))->get();

        return [
            'total_ditemukan' => $pengembalians->count(),
            'data' => $pengembalians->map(fn ($p) => [
                'id' => $p->id,
                'no_sewa' => $p->sewa?->no_sewa ?? '-',
                'customer' => $p->sewa?->customer?->nama_lengkap ?? '-',
                'tgl_pengembalian' => $p->tgl_pengembalian ? Carbon::parse($p->tgl_pengembalian)->locale('id')->isoFormat('D MMM Y') : '-',
                'total_denda' => 'Rp '.number_format((float) ($p->total_denda ?? 0), 0, ',', '.'),
                'petugas' => $p->user?->nama_lengkap ?? '-',
                'kondisi_barang' => $p->details->map(fn ($d) => [
                    'barang' => $d->sewaDetail?->barang?->nama_barang ?? '-',
                    'qty' => $d->qty_pengembalian,
                    'status' => $d->status ?? 'baik',
                    'keterangan' => $d->keterangan ?? '-',
                ])->toArray(),
            ])->toArray(),
        ];
    }

    /**
     * Admin: Ringkasan laporan penyewaan berdasarkan rentang tanggal.
     *
     * @return array<string, mixed>
     */
    private function toolAdminRingkasanLaporanSewa(?string $tanggalAwal, ?string $tanggalAkhir): array
    {
        $query = Sewa::query();

        if ($tanggalAwal) {
            $query->whereDate('tgl_sewa', '>=', $tanggalAwal);
        }
        if ($tanggalAkhir) {
            $query->whereDate('tgl_sewa', '<=', $tanggalAkhir);
        }

        $totalTransaksi = (clone $query)->count();
        $totalNilai = (float) ((clone $query)->sum('total_biaya'));

        $totalItemDisewa = (int) SewaDetail::whereIn('id_sewa', (clone $query)->select('id'))->sum('qty');
        $totalKembali = (clone $query)->whereHas('pengembalians')->count();
        $totalBelumKembali = $totalTransaksi - $totalKembali;

        return [
            'periode' => [
                'awal' => $tanggalAwal ?: 'Semua waktu',
                'akhir' => $tanggalAkhir ?: 'Semua waktu',
            ],
            'total_transaksi_sewa' => $totalTransaksi,
            'total_nilai_sewa' => 'Rp '.number_format($totalNilai, 0, ',', '.'),
            'total_unit_disewa' => $totalItemDisewa,
            'sudah_dikembalikan' => $totalKembali,
            'belum_dikembalikan' => $totalBelumKembali,
        ];
    }

    /**
     * Admin: Ringkasan laporan keuangan (pemasukan, pengeluaran, saldo rekening).
     *
     * @return array<string, mixed>
     */
    private function toolAdminRingkasanLaporanKeuangan(?string $tanggalAwal, ?string $tanggalAkhir): array
    {
        $query = RiwayatSaldo::query();

        if ($tanggalAwal) {
            $query->whereDate('tanggal', '>=', $tanggalAwal);
        }
        if ($tanggalAkhir) {
            $query->whereDate('tanggal', '<=', $tanggalAkhir);
        }

        $totalMasuk = (float) (clone $query)->where('jenis', 'masuk')->sum('nominal');
        $totalKeluar = (float) (clone $query)->where('jenis', 'keluar')->sum('nominal');
        $labaOperasional = $totalMasuk - $totalKeluar;

        $rekenings = Rekening::all(['nama_rek', 'no_rek', 'pemilik_rek', 'saldo']);
        $totalSaldoKas = (float) $rekenings->sum('saldo');

        return [
            'periode' => [
                'awal' => $tanggalAwal ?: 'Semua waktu',
                'akhir' => $tanggalAkhir ?: 'Semua waktu',
            ],
            'total_pemasukan' => 'Rp '.number_format($totalMasuk, 0, ',', '.'),
            'total_pengeluaran' => 'Rp '.number_format($totalKeluar, 0, ',', '.'),
            'laba_bersih_operasional' => 'Rp '.number_format($labaOperasional, 0, ',', '.'),
            'total_saldo_semua_rekening' => 'Rp '.number_format($totalSaldoKas, 0, ',', '.'),
            'daftar_rekening' => $rekenings->map(fn ($r) => [
                'bank_rekening' => $r->nama_rek,
                'no_rekening' => $r->no_rek ?? '-',
                'atas_nama' => $r->pemilik_rek ?? '-',
                'saldo' => 'Rp '.number_format((float) ($r->saldo ?? 0), 0, ',', '.'),
            ])->toArray(),
        ];
    }

    /**
     * Admin: Cek laporan piutang pelanggan (denda/sewa).
     *
     * @return array<string, mixed>
     */
    private function toolAdminCekLaporanPiutang(?string $status): array
    {
        $query = Piutang::with('pengembalian.sewa.customer')->orderByDesc('tgl_piutang');

        if ($status === 'belum_lunas') {
            $query->whereRaw('terbayar < nominal');
        } elseif ($status === 'lunas') {
            $query->whereRaw('terbayar >= nominal');
        }

        $piutangs = $query->limit(20)->get();

        $totalPiutang = (float) Piutang::sum('nominal');
        $totalTerbayar = (float) Piutang::sum('terbayar');
        $sisaPiutang = max(0, $totalPiutang - $totalTerbayar);

        return [
            'ringkasan_keseluruhan' => [
                'total_piutang_tercatat' => 'Rp '.number_format($totalPiutang, 0, ',', '.'),
                'total_sudah_dibayar' => 'Rp '.number_format($totalTerbayar, 0, ',', '.'),
                'total_sisa_piutang_belum_lunas' => 'Rp '.number_format($sisaPiutang, 0, ',', '.'),
            ],
            'daftar_piutang' => $piutangs->map(fn ($p) => [
                'id' => $p->id,
                'customer' => $p->pengembalian?->sewa?->customer?->nama_lengkap ?? '-',
                'no_hp' => $p->pengembalian?->sewa?->customer?->no_hp ?? '-',
                'no_sewa' => $p->pengembalian?->sewa?->no_sewa ?? '-',
                'tgl_piutang' => $p->tgl_piutang ? Carbon::parse($p->tgl_piutang)->locale('id')->isoFormat('D MMM Y') : '-',
                'nominal' => 'Rp '.number_format((float) ($p->nominal ?? 0), 0, ',', '.'),
                'terbayar' => 'Rp '.number_format((float) ($p->terbayar ?? 0), 0, ',', '.'),
                'sisa' => 'Rp '.number_format(max(0, (float) ($p->nominal ?? 0) - (float) ($p->terbayar ?? 0)), 0, ',', '.'),
                'status' => (float) ($p->terbayar ?? 0) >= (float) ($p->nominal ?? 0) ? 'Lunas' : 'Belum Lunas',
                'tgl_pelunasan' => $p->tgl_pelunasan ? Carbon::parse($p->tgl_pelunasan)->locale('id')->isoFormat('D MMM Y') : '-',
            ])->toArray(),
        ];
    }

    /**
     * Admin: Cek inventori catatan riwayat mutasi stok.
     *
     * @return array<string, mixed>
     */
    private function toolAdminCekInventoriMutasiStok(?string $namaBarang, ?string $jenis, int $limit = 10): array
    {
        $query = RiwayatStok::with('barang')->orderByDesc('tanggal')->orderByDesc('id');

        if ($namaBarang) {
            $query->whereHas('barang', fn ($bq) => $bq->where('nama_barang', 'like', "%{$namaBarang}%"));
        }

        if ($jenis && in_array(strtolower($jenis), ['masuk', 'keluar'])) {
            $query->where('jenis', strtolower($jenis));
        }

        $riwayats = $query->limit(min(30, max(1, $limit)))->get();

        return [
            'total_catatan' => $riwayats->count(),
            'riwayat_mutasi' => $riwayats->map(fn ($r) => [
                'barang' => $r->barang?->nama_barang ?? '-',
                'tanggal' => $r->tanggal ? Carbon::parse($r->tanggal)->locale('id')->isoFormat('D MMM Y') : '-',
                'jenis' => ucfirst($r->jenis ?? '-'),
                'jumlah' => $r->jumlah,
                'sisa_stok_saat_itu' => $r->stok,
                'sumber_mutasi' => $r->id_sewa_detail ? 'Penyewaan'
                    : ($r->id_pengembalian_detail ? 'Pengembalian'
                    : ($r->id_pengadaan_barang_detail ? 'Pengadaan Barang'
                    : ($r->id_perawatan_detail ? 'Perawatan/Servis'
                    : ($r->id_pembelian_unit_detail ? 'Pembelian Unit' : 'Penyesuaian')))),
            ])->toArray(),
        ];
    }

    /**
     * Admin: Cek riwayat pengadaan unit barang baru.
     *
     * @return array<string, mixed>
     */
    private function toolAdminCekPengadaanBarang(int $limit = 10): array
    {
        $pengadaans = PengadaanBarang::with('details.barang')
            ->orderByDesc('tgl_pengadaan')
            ->orderByDesc('id')
            ->limit(min(20, max(1, $limit)))
            ->get();

        return [
            'total_pengadaan' => $pengadaans->count(),
            'data' => $pengadaans->map(fn ($p) => [
                'id' => $p->id,
                'tgl_pengadaan' => $p->tgl_pengadaan ? Carbon::parse($p->tgl_pengadaan)->locale('id')->isoFormat('D MMM Y') : '-',
                'keterangan' => $p->keterangan ?? '-',
                'barang_diadakan' => $p->details->map(fn ($d) => [
                    'barang' => $d->barang?->nama_barang ?? '-',
                    'jumlah' => $d->jumlah,
                ])->toArray(),
            ])->toArray(),
        ];
    }

    /**
     * Admin: Cek riwayat perawatan/servis perbaikan alat.
     *
     * @return array<string, mixed>
     */
    private function toolAdminCekPerawatanBarang(int $limit = 10): array
    {
        $perawatans = PerawatanBarang::with('pengembalianDetail.sewaDetail.barang')
            ->orderByDesc('tgl_perawatan')
            ->orderByDesc('id')
            ->limit(min(20, max(1, $limit)))
            ->get();

        return [
            'total_perawatan' => $perawatans->count(),
            'data' => $perawatans->map(fn ($p) => [
                'id' => $p->id,
                'barang' => $p->pengembalianDetail?->sewaDetail?->barang?->nama_barang ?? '-',
                'tgl_perawatan' => $p->tgl_perawatan ? Carbon::parse($p->tgl_perawatan)->locale('id')->isoFormat('D MMM Y') : '-',
                'biaya_perbaikan' => 'Rp '.number_format((float) ($p->biaya_perbaikan ?? 0), 0, ',', '.'),
                'keterangan' => $p->keterangan ?? '-',
            ])->toArray(),
        ];
    }

    /**
     * Admin: Cek riwayat transaksi pembelian unit baru.
     *
     * @return array<string, mixed>
     */
    private function toolAdminCekPembelianUnit(int $limit = 10): array
    {
        $pembelians = PembelianUnit::with('details.barang')
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->limit(min(20, max(1, $limit)))
            ->get();

        return [
            'total_transaksi' => $pembelians->count(),
            'data' => $pembelians->map(fn ($p) => [
                'id' => $p->id,
                'tanggal' => $p->tanggal ? Carbon::parse($p->tanggal)->locale('id')->isoFormat('D MMM Y') : '-',
                'keterangan' => $p->keterangan ?? '-',
                'unit_dibeli' => $p->details->map(fn ($d) => [
                    'barang' => $d->barang?->nama_barang ?? '-',
                    'jumlah' => $d->jumlah,
                    'harga_beli' => 'Rp '.number_format((float) ($d->harga_beli ?? 0), 0, ',', '.'),
                ])->toArray(),
            ])->toArray(),
        ];
    }

    // =========================================================================
    // SYSTEM INSTRUCTIONS & TOOL DECLARATIONS
    // =========================================================================

    /**
     * Bangun system instruction sesuai scope (admin vs public).
     *
     * @param  'admin'|'public'  $scope
     */
    private function buildSystemInstruction(string $scope = 'public'): string
    {
        $today = now()->locale('id')->isoFormat('dddd, D MMMM Y');

        if ($scope === 'admin') {
            return <<<'PROMPT'
Kamu adalah asisten internal untuk Admin CMS "Rental Kamera & Drone".

GAYA KOMUNIKASI (WAJIB DIPATUHI):
- Sopan, profesional, luwes, dan natural (humanize, jangan kaku atau robotik).
- Singkat, padat, dan langsung ke inti (to the point).
- JANGAN bertele-tele dan JANGAN kebanyakan basa-basi (hindari pembuka berulang atau penutup klise yang panjang).
- Sajikan hanya poin-poin penting menggunakan bullet point rapi.
- Format mata uang selalu Rupiah (contoh: Rp 150.000).

KEMAMPUAN (FULL ACCESS CMS):
Gunakan tools yang tersedia untuk mengambil data faktual:
1. Transaksi: Sewa aktif, sewa jatuh tempo/terlambat, pengembalian, kondisi barang, denda, status pembayaran.
2. Laporan: Ringkasan sewa, laporan keuangan (omset/pengeluaran/laba), saldo kas/rekening, piutang pelanggan.
3. Inventori: Mutasi stok barang, pengadaan unit baru, perawatan unit rusak, pembelian unit.
4. Katalog: Stok alat dan harga sewa harian.

ATURAN MENJAWAB:
- Selalu gunakan tools untuk data database — DILARANG MENGARANG data atau angka.
- Jangan mengulang pertanyaan pengguna.
- Sajikan ringkasan data bersih yang langsung bisa dipahami dalam hitungan detik.
PROMPT;
        }

        return <<<'PROMPT'
Kamu adalah asisten customer service untuk "Rental Kamera & Drone".

GAYA KOMUNIKASI (WAJIB DIPATUHI):
- Sopan, ramah, hangat, dan profesional (humanize, luwes, bersahabat, tidak kaku).
- Singkat, jelas, dan langsung ke poin penting (tidak bertele-tele, hindari paragraf panjang yang berbelit-belit).
- Tampilkan informasi utama (nama alat, harga sewa per hari, ketersediaan stok) secara ringkas dengan bullet point.
- Format harga selalu Rupiah (contoh: Rp 250.000/hari).

RUANG LINGKUP:
- Hanya melayani informasi publik: ketersediaan stok, harga sewa harian, rekomendasi perlengkapan kamera/drone, tips dasar, dan tata cara sewa.
- DILARANG KERAS membocorkan data rahasia internal: transaksi sewa orang lain, laporan keuangan perusahaan, pengeluaran, pemasukan, kas rekening bank, piutang/hutang, mutasi inventori internal, atau identitas pribadi pelanggan lain.
- Jika ditanya rahasia internal atau hal di luar lingkup, tolak dengan singkat dan santun:
  "Maaf, data transaksi internal dan keuangan merupakan rahasia perusahaan. Ada yang bisa saya bantu terkait kebutuhan sewa kamera & drone Anda? 😊"

ATURAN MENJAWAB:
- Selalu gunakan tools untuk data ketersediaan stok dan harga — jangan mengarang.
- Langsung berikan poin penting tanpa basa-basi berlebihan.
PROMPT;
    }

    /**
     * Deklarasi tool/function yang bisa dipanggil Gemini sesuai scope.
     *
     * @param  'admin'|'public'  $scope
     * @return array<int, array<string, mixed>>
     */
    private function buildToolDeclarations(string $scope = 'public'): array
    {
        $publicDeclarations = [
            [
                'name' => 'cek_stok_barang',
                'description' => 'Cek ketersediaan stok dan harga sewa barang berdasarkan nama. Gunakan tool ini ketika user bertanya tentang ketersediaan atau stok barang tertentu.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'nama_barang' => [
                            'type' => 'STRING',
                            'description' => 'Nama atau kata kunci barang yang dicari, contoh: "Sony a7III", "drone DJI", "tripod"',
                        ],
                    ],
                    'required' => ['nama_barang'],
                ],
            ],
            [
                'name' => 'daftar_semua_barang',
                'description' => 'Ambil daftar semua barang yang tersedia untuk disewa, bisa difilter berdasarkan kategori.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'kategori' => [
                            'type' => 'STRING',
                            'description' => 'Filter kategori barang, contoh: "kamera", "drone", "aksesoris". Kosongkan untuk semua kategori.',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'rekomendasi_barang',
                'description' => 'Dapatkan rekomendasi barang yang sesuai dengan kebutuhan dan anggaran user.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'kebutuhan' => [
                            'type' => 'STRING',
                            'description' => 'Deskripsi kebutuhan user, contoh: "wedding photography", "vlog outdoor", "aerial photography"',
                        ],
                        'anggaran_per_hari' => [
                            'type' => 'INTEGER',
                            'description' => 'Anggaran maksimum per hari dalam Rupiah (opsional).',
                        ],
                    ],
                    'required' => ['kebutuhan'],
                ],
            ],
            [
                'name' => 'info_harga_sewa',
                'description' => 'Dapatkan informasi harga sewa barang tertentu.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'nama_barang' => [
                            'type' => 'STRING',
                            'description' => 'Nama barang yang ingin diketahui harganya',
                        ],
                    ],
                    'required' => ['nama_barang'],
                ],
            ],
        ];

        if ($scope !== 'admin') {
            return [['function_declarations' => $publicDeclarations]];
        }

        // Deklarasi tambahan khusus Admin CMS
        $adminDeclarations = [
            [
                'name' => 'admin_cek_transaksi_sewa',
                'description' => 'Cek daftar transaksi penyewaan barang terbaru di CMS, bisa dicari berdasarkan no sewa atau nama pelanggan.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'search' => [
                            'type' => 'STRING',
                            'description' => 'Kata kunci nomor sewa atau nama pelanggan.',
                        ],
                        'status' => [
                            'type' => 'STRING',
                            'description' => 'Filter status pembayaran sewa: "Pending", "Confirmed". Kosongkan untuk semua.',
                        ],
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'Batas jumlah transaksi (default 10).',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_detail_transaksi_sewa',
                'description' => 'Lihat rincian lengkap 1 transaksi sewa berdasarkan nomor sewa, ID UUID, atau nama pelanggan.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'kata_kunci' => [
                            'type' => 'STRING',
                            'description' => 'Nomor sewa (misal: SEWA-202610-0001), ID UUID sewa, atau nama pelanggan.',
                        ],
                    ],
                    'required' => ['kata_kunci'],
                ],
            ],
            [
                'name' => 'admin_cek_sewa_jatuh_tempo',
                'description' => 'Cek daftar penyewaan yang sudah melewati tanggal akhir sewa (jatuh tempo/terlambat) dan belum dikembalikan.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'Batas jumlah data sewa terlambat yang ditampilkan (default 10).',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_cek_pengembalian',
                'description' => 'Cek riwayat pengembalian barang sewa, denda keterlambatan/kerusakan, dan kondisi fisik barang saat kembali.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'search' => [
                            'type' => 'STRING',
                            'description' => 'Nomor sewa atau nama pelanggan.',
                        ],
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'Batas jumlah data (default 10).',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_ringkasan_laporan_sewa',
                'description' => 'Ambil ringkasan laporan sewa (total transaksi, total nilai rupiah sewa, unit tersewa) dalam rentang tanggal.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'tanggal_awal' => [
                            'type' => 'STRING',
                            'description' => 'Tanggal awal filter format YYYY-MM-DD.',
                        ],
                        'tanggal_akhir' => [
                            'type' => 'STRING',
                            'description' => 'Tanggal akhir filter format YYYY-MM-DD.',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_ringkasan_laporan_keuangan',
                'description' => 'Ambil ringkasan laporan keuangan (total pemasukan, total pengeluaran, laba bersih operasional) dan saldo riil kas semua rekening bank.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'tanggal_awal' => [
                            'type' => 'STRING',
                            'description' => 'Tanggal awal filter format YYYY-MM-DD.',
                        ],
                        'tanggal_akhir' => [
                            'type' => 'STRING',
                            'description' => 'Tanggal akhir filter format YYYY-MM-DD.',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_cek_laporan_piutang',
                'description' => 'Ambil daftar dan total piutang pelanggan (denda/sewa yang belum lunas), sisa piutang, dan status pelunasan.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'status' => [
                            'type' => 'STRING',
                            'description' => 'Filter status: "belum_lunas", "lunas", atau kosongkan untuk semua.',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_cek_inventori_mutasi_stok',
                'description' => 'Cek catatan riwayat mutasi stok keluar-masuk barang inventori beserta sumber mutasinya (pengadaan, sewa, pengembalian, servis).',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'nama_barang' => [
                            'type' => 'STRING',
                            'description' => 'Nama atau kata kunci barang.',
                        ],
                        'jenis' => [
                            'type' => 'STRING',
                            'description' => 'Jenis mutasi: "masuk" atau "keluar".',
                        ],
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'Batas jumlah data (default 10).',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_cek_pengadaan_barang',
                'description' => 'Cek riwayat pengadaan unit barang baru ke inventori rental.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'Batas jumlah data (default 10).',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_cek_perawatan_barang',
                'description' => 'Cek riwayat perawatan dan perbaikan alat/kamera/drone yang rusak beserta biaya servisnya.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'Batas jumlah data (default 10).',
                        ],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'admin_cek_pembelian_unit',
                'description' => 'Cek riwayat pembelian unit barang baru ke vendor/supplier beserta harganya.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'Batas jumlah data (default 10).',
                        ],
                    ],
                    'required' => [],
                ],
            ],
        ];

        return [['function_declarations' => array_merge($publicDeclarations, $adminDeclarations)]];
    }
}
