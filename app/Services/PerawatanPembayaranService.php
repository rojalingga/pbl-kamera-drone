<?php

namespace App\Services;

use App\Models\KategoriTransaksi;
use App\Models\Pengeluaran;
use App\Models\Perawatan;
use App\Models\Rekening;

class PerawatanPembayaranService
{
    /** Metode bayar yang didukung: Kas Kantor (tunai) atau Transfer Bank. */
    public const METODE_KAS = 'cash';

    public const METODE_TRANSFER = 'transfer';

    public function __construct(private RiwayatSaldoService $saldo, private NomorDokumenService $nomor) {}

    /**
     * Catat pembayaran perawatan: buat pengeluaran kategori Perawatan lalu potong
     * saldo rekening sesuai metode bayar. Perawatan tidak punya record di tabel
     * pembayaran, jadi relasinya hanya lewat pengeluaran dan riwayat saldo.
     *
     * Dipanggil di dalam transaksi database oleh pemanggil.
     *
     * @return array{perawatan: Perawatan, pengeluaran: Pengeluaran}
     */
    public function bayar(Perawatan $perawatan, string $metode, ?string $tanggal = null): array
    {
        $nominal = (int) ($perawatan->total_biaya_perawatan ?? 0);

        if ($nominal <= 0) {
            throw new \DomainException('Perawatan ini tidak memiliki biaya yang harus dibayar.');
        }

        if ($perawatan->sudahLunas() || Pengeluaran::where('id_perawatan', $perawatan->id)->exists()) {
            throw new \DomainException('Perawatan ini sudah lunas.');
        }

        $idRekening = RiwayatSaldoService::rekeningUntukMetode($metode);

        if ($idRekening === null) {
            throw new \InvalidArgumentException('Metode pembayaran tidak valid.');
        }

        $tglPengeluaran = $tanggal ?: now()->toDateString();
        $noKwitansi = $perawatan->no_kwitansi ?: $this->nomor->noNotaPerawatan($tglPengeluaran);
        $rekening = Rekening::find($idRekening);

        $pengeluaran = Pengeluaran::create([
            'tgl_pengeluaran' => $tglPengeluaran,
            'nominal' => $nominal,
            'id_kategori_transaksi' => $this->kategoriPerawatan()?->id,
            'id_rekening' => $idRekening,
            'id_perawatan' => $perawatan->id,
            'lampiran' => $noKwitansi,
            'keterangan' => $this->nomor->keteranganPembayaranPerawatan($perawatan, $rekening, $nominal, $tglPengeluaran),
        ]);

        $this->saldo->kurang($idRekening, $nominal, RiwayatSaldoService::KELUAR, ['id_pengeluaran' => $pengeluaran->id], $pengeluaran->tgl_pengeluaran);

        $perawatan->update([
            'status_pembayaran' => Perawatan::BAYAR_LUNAS,
            'no_kwitansi' => $noKwitansi,
        ]);

        return ['perawatan' => $perawatan, 'pengeluaran' => $pengeluaran];
    }

    /**
     * Batalkan pembayaran perawatan: hapus pengeluaran milik perawatan ini lalu
     * kembalikan saldo rekening. Dipakai saat maintenance dihapus atau
     * detailnya diubah sehingga pembayaran lama tidak lagi valid.
     *
     * Dipanggil di dalam transaksi database oleh pemanggil.
     */
    public function batalkan(Perawatan $perawatan): void
    {
        foreach (Pengeluaran::where('id_perawatan', $perawatan->id)->get() as $pengeluaran) {
            if ($pengeluaran->id_rekening) {
                $this->saldo->batalkanKeluar($pengeluaran->id_rekening, (int) $pengeluaran->nominal, ['id_pengeluaran' => $pengeluaran->id]);
            }

            $pengeluaran->delete();
        }

        $perawatan->update([
            'status_pembayaran' => Perawatan::BAYAR_BELUM_LUNAS,
        ]);
    }

    private function kategoriPerawatan(): ?KategoriTransaksi
    {
        return KategoriTransaksi::where('kategori', 'Perawatan')
            ->where('jenis', 'Pengeluaran')
            ->first()
            ?? KategoriTransaksi::where('jenis', 'Pengeluaran')->first();
    }
}
