<?php

namespace App\Services;

use App\Exceptions\StokTidakCukupException;
use App\Models\Barang;
use App\Models\PembelianUnitDetail;
use App\Models\PengadaanBarangDetail;
use App\Models\PengembalianDetail;
use App\Models\PerawatanDetail;
use App\Models\RiwayatStok;
use App\Models\SewaDetail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class RiwayatStokService
{
    public const MASUK = 'Masuk';

    public const KELUAR = 'Keluar';

    private const SUMBER = [
        'id_pengadaan_barang_detail' => [PengadaanBarangDetail::class, 'pengadaan', 'tgl_pengadaan'],
        'id_sewa_detail' => [SewaDetail::class, 'sewa', 'tgl_sewa'],
        'id_pengembalian_detail' => [PengembalianDetail::class, 'pengembalian', 'tgl_pengembalian'],
        'id_perawatan_detail' => [PerawatanDetail::class, 'perawatan', 'tgl_perawatan'],
        'id_pembelian_unit_detail' => [PembelianUnitDetail::class, 'pembelianUnit', 'tanggal'],
    ];

    public function catat(string $idBarang, string $jenis, int $jumlah, int $stok, ?array $sumber = null): RiwayatStok
    {
        $sumber = $sumber ?: [];

        return RiwayatStok::create([
            'id_barang' => $idBarang,
            'jenis' => $jenis,
            'jumlah' => $jumlah,
            'stok' => $stok,
            'tanggal' => $this->tanggalDariSumber($sumber),
            'id_pengadaan_barang_detail' => $sumber['id_pengadaan_barang_detail'] ?? null,
            'id_sewa_detail' => $sumber['id_sewa_detail'] ?? null,
            'id_pengembalian_detail' => $sumber['id_pengembalian_detail'] ?? null,
            'id_perawatan_detail' => $sumber['id_perawatan_detail'] ?? null,
            'id_pembelian_unit_detail' => $sumber['id_pembelian_unit_detail'] ?? null,
        ]);
    }

    public function tambah(string $idBarang, int $jumlah, string $jenis = self::MASUK, ?array $sumber = null): ?RiwayatStok
    {
        if ($jumlah <= 0) {
            return null;
        }

        $barang = Barang::lockForUpdate()->find($idBarang);

        if (! $barang) {
            return null;
        }

        $barang->stok = (int) $barang->stok + $jumlah;
        $barang->save();

        return $this->catat($barang->id, $jenis, $jumlah, (int) $barang->stok, $sumber);
    }

    public function kurang(string $idBarang, int $jumlah, string $jenis = self::KELUAR, ?array $sumber = null): ?RiwayatStok
    {
        if ($jumlah <= 0) {
            return null;
        }

        $barang = Barang::lockForUpdate()->find($idBarang);

        if (! $barang) {
            return null;
        }

        $stokBaru = (int) $barang->stok - $jumlah;

        if ($stokBaru < 0) {
            throw new StokTidakCukupException('Stok tidak mencukupi.', $idBarang, (int) $barang->stok);
        }

        $barang->stok = $stokBaru;
        $barang->save();

        return $this->catat($barang->id, $jenis, $jumlah, $stokBaru, $sumber);
    }

    public function batalkanMasuk(string $idBarang, int $jumlah, array $sumber): int
    {
        if ($jumlah <= 0) {
            return 0;
        }

        $barang = Barang::lockForUpdate()->find($idBarang);

        if (! $barang) {
            return 0;
        }

        $baris = $this->barisSumber($idBarang, $sumber);

        if ($baris->isEmpty()) {
            return 0;
        }

        $stokBaru = (int) $barang->stok - $this->deltaStok($baris);

        if ($stokBaru < 0) {
            throw new StokTidakCukupException('Stok tidak mencukupi.', $idBarang, (int) $barang->stok);
        }

        $barang->stok = $stokBaru;
        $barang->save();

        return $this->terapkanHapus($idBarang, $baris);
    }

    public function batalkanKeluar(string $idBarang, int $jumlah, array $sumber): int
    {
        if ($jumlah <= 0) {
            return 0;
        }

        $barang = Barang::lockForUpdate()->find($idBarang);

        if (! $barang) {
            return 0;
        }

        $baris = $this->barisSumber($idBarang, $sumber);

        if ($baris->isEmpty()) {
            return 0;
        }

        $barang->stok = (int) $barang->stok - $this->deltaStok($baris);
        $barang->save();

        return $this->terapkanHapus($idBarang, $baris);
    }

    public function hapusRiwayat(string $idBarang): int
    {
        return RiwayatStok::where('id_barang', $idBarang)->delete();
    }

    /**
     * Baris riwayat milik satu sumber dokumen.
     *
     * Satu sumber bisa punya beberapa baris, misalnya detail perawatan yang
     * statusnya pernah diubah bolak-balik, sehingga dampaknya harus dihitung dari
     * seluruh baris tersebut, bukan dari satu jumlah dari pemanggil.
     *
     * @param  array<string, int|null>  $sumber
     * @return Collection<int, RiwayatStok>
     */
    private function barisSumber(string $idBarang, array $sumber): Collection
    {
        $query = RiwayatStok::where('id_barang', $idBarang);
        $adaSumber = false;

        foreach (array_keys(self::SUMBER) as $kolom) {
            if (! empty($sumber[$kolom])) {
                $query->where($kolom, $sumber[$kolom]);
                $adaSumber = true;
            }
        }

        if (! $adaSumber) {
            return collect();
        }

        return $query->orderBy('id')->get(['id', 'jenis', 'jumlah']);
    }

    /**
     * Dampak bersih baris-baris yang akan dihapus terhadap stok barang.
     * Nilai positif berarti stok bertambah dan harus dikurangi pada barang.
     *
     * @param  Collection<int, RiwayatStok>  $baris
     */
    private function deltaStok(Collection $baris): int
    {
        $delta = 0;

        foreach ($baris as $row) {
            $delta += $row->jenis === self::MASUK
                ? (int) $row->jumlah
                : -(int) $row->jumlah;
        }

        return $delta;
    }

    /**
     * Hapus baris-baris sumber lalu geser kolom stok pada baris-baris
     * berikutnya sebesar dampak tiap baris yang dihapus.
     *
     * @param  Collection<int, RiwayatStok>  $baris
     */
    private function terapkanHapus(string $idBarang, Collection $baris): int
    {
        $terhapus = RiwayatStok::whereIn('id', $baris->pluck('id'))->delete();

        foreach ($baris as $row) {
            $susulan = RiwayatStok::where('id_barang', $idBarang)->where('id', '>', $row->id);

            if ($row->jenis === self::KELUAR) {
                $susulan->increment('stok', (int) $row->jumlah);
            } else {
                $susulan->decrement('stok', (int) $row->jumlah);
            }
        }

        return $terhapus;
    }

    private function tanggalDariSumber(array $sumber): string
    {
        foreach (self::SUMBER as $kolom => [$model, $relasi, $kolomTanggal]) {
            if (empty($sumber[$kolom])) {
                continue;
            }

            $dokumen = $model::query()->find($sumber[$kolom]);

            if (! $dokumen) {
                continue;
            }

            $tanggal = $relasi
                ? $dokumen->{$relasi}?->{$kolomTanggal}
                : $dokumen->{$kolomTanggal};

            if ($tanggal) {
                return Carbon::parse($tanggal)->toDateString();
            }
        }

        return now()->toDateString();
    }
}
