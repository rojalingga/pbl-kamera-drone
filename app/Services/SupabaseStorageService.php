<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SupabaseStorageService
{
    private ?string $url;

    private ?string $key;

    private string $bucket;

    public function __construct()
    {
        $this->url = rtrim((string) config('services.supabase.url'), '/');
        $this->key = (string) config('services.supabase.secret_key');
        $this->bucket = (string) (config('services.supabase.bucket') ?: 'rental-kamera');
    }

    /**
     * Cek apakah kredensial Supabase Storage telah dikonfigurasi.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->url) && ! empty($this->key);
    }

    /**
     * Pastikan bucket public sudah ada di Supabase Storage.
     */
    public function ensureBucket(): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->key,
                'apikey' => $this->key,
            ])->get($this->url.'/storage/v1/bucket');

            if ($response->successful()) {
                $buckets = $response->json();
                foreach ($buckets as $b) {
                    if (($b['id'] ?? '') === $this->bucket || ($b['name'] ?? '') === $this->bucket) {
                        return true;
                    }
                }
            }

            // Jika belum ada, buat bucket sebagai public
            $createRes = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->key,
                'apikey' => $this->key,
                'Content-Type' => 'application/json',
            ])->post($this->url.'/storage/v1/bucket', [
                'id' => $this->bucket,
                'name' => $this->bucket,
                'public' => true,
            ]);

            return $createRes->successful();
        } catch (\Throwable $e) {
            Log::warning('Gagal memeriksa/membuat bucket Supabase: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Upload berkas ke Supabase Storage atau fallback ke local public assets.
     * Mengembalikan link public URL Supabase jika berhasil, atau nama file lokal.
     */
    public function upload(UploadedFile|string $file, string $folder = 'barang', ?string $customFilename = null): string
    {
        if ($file instanceof UploadedFile) {
            $ext = $file->getClientOriginalExtension() ?: 'jpg';
            $mime = $file->getMimeType() ?: 'application/octet-stream';
            $contents = file_get_contents($file->getRealPath());
        } elseif (is_string($file) && File::exists($file)) {
            $ext = pathinfo($file, PATHINFO_EXTENSION) ?: 'jpg';
            $mime = mime_content_type($file) ?: 'application/octet-stream';
            $contents = file_get_contents($file);
        } else {
            throw new \InvalidArgumentException('Berkas tidak valid atau berkas tidak ditemukan di path: '.$file);
        }

        $filename = $customFilename ?: (Str::random(25).'.'.$ext);
        $objectPath = trim($folder, '/').'/'.$filename;

        // Coba upload ke Supabase jika terkonfigurasi
        if ($this->isConfigured()) {
            try {
                $uploadUrl = $this->url.'/storage/v1/object/'.$this->bucket.'/'.$objectPath;

                $response = Http::timeout(60)
                    ->withHeaders([
                        'Authorization' => 'Bearer '.$this->key,
                        'apikey' => $this->key,
                        'Content-Type' => $mime,
                    ])
                    ->withBody($contents, $mime)
                    ->post($uploadUrl);

                if ($response->successful()) {
                    return $this->url.'/storage/v1/object/public/'.$this->bucket.'/'.$objectPath;
                }

                Log::warning('Gagal upload ke Supabase Storage: '.$response->body().'. Menyimpan ke lokal.');
            } catch (\Throwable $e) {
                Log::warning('Eksepsi saat upload ke Supabase: '.$e->getMessage().'. Menyimpan ke lokal.');
            }
        }

        // Fallback: simpan di direktori lokal public/assets/{$folder}
        $targetDir = public_path('assets/'.$folder);
        if (! File::isDirectory($targetDir)) {
            File::makeDirectory($targetDir, 0755, true);
        }
        File::put($targetDir.'/'.$filename, $contents);

        return $filename;
    }

    /**
     * Hapus berkas dari Supabase Storage dan/atau filesystem lokal.
     */
    public function delete(?string $urlOrFilename, string $folder = 'barang'): bool
    {
        if (empty($urlOrFilename)) {
            return true;
        }

        $prefixSupabase = $this->url.'/storage/v1/object/public/'.$this->bucket.'/';

        if ($this->isConfigured() && str_starts_with($urlOrFilename, $prefixSupabase)) {
            $objectPath = str_replace($prefixSupabase, '', $urlOrFilename);

            try {
                Http::timeout(30)
                    ->withHeaders([
                        'Authorization' => 'Bearer '.$this->key,
                        'apikey' => $this->key,
                        'Content-Type' => 'application/json',
                    ])
                    ->delete($this->url.'/storage/v1/object/'.$this->bucket, [
                        'prefixes' => [$objectPath],
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Gagal menghapus file dari Supabase Storage: '.$e->getMessage());
            }
        }

        // Cek dan bersihkan juga file lokal jika ada
        $cleanFilename = basename($urlOrFilename);
        $localPath = public_path('assets/'.$folder.'/'.$cleanFilename);
        if (File::exists($localPath)) {
            @unlink($localPath);
        }

        return true;
    }

    /**
     * Kosongkan folder tertentu di Supabase Storage (berguna untuk seeder).
     */
    public function emptyFolder(string $folder = 'barang'): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        try {
            $prefix = trim($folder, '/').'/';
            $response = Http::timeout(60)
                ->withHeaders([
                    'Authorization' => 'Bearer '.$this->key,
                    'apikey' => $this->key,
                ])
                ->post($this->url.'/storage/v1/object/list/'.$this->bucket, [
                    'prefix' => $prefix,
                    'limit' => 100,
                ]);

            if ($response->successful()) {
                $files = $response->json();
                $paths = [];

                foreach ($files as $file) {
                    if (isset($file['name']) && $file['name'] !== '.emptyFolderPlaceholder') {
                        $paths[] = $prefix.$file['name'];
                    }
                }

                if (! empty($paths)) {
                    Http::timeout(60)
                        ->withHeaders([
                            'Authorization' => 'Bearer '.$this->key,
                            'apikey' => $this->key,
                            'Content-Type' => 'application/json',
                        ])
                        ->delete($this->url.'/storage/v1/object/'.$this->bucket, [
                            'prefixes' => $paths,
                        ]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Gagal mengosongkan folder '.$folder.' di Supabase: '.$e->getMessage());
        }
    }

    /**
     * Dapatkan URL publik dari foto / lampiran (menangani Supabase URL maupun path lokal).
     */
    public function getUrl(?string $path, string $folder = 'barang'): ?string
    {
        if (empty($path)) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return '/assets/'.$folder.'/'.$path;
    }
}
