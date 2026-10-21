<?php

namespace App\Services;

use App\Exceptions\SaldoTidakCukupException;
use App\Models\Pemasukan;
use App\Models\Pengeluaran;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use Illuminate\Support\Carbon;

class RiwayatSaldoService
{
    public const MASUK = 'Masuk';

    public const KELUAR = 'Keluar';

    public const REKENING_KAS = 1;

    public const REKENING_QRIS = 2;

    public const REKENING_BCA = 3;

    private const SUMBER = [
        'id_pemasukan' => [Pemasukan::class, 'tgl_pemasukan'],
        'id_pengeluaran' => [Pengeluaran::class, 'tgl_pengeluaran'],
    ];

    public static function rekeningUntukMetode(?string $metode): ?int
    {
        return match ($metode) {
            'cash' => self::REKENING_KAS,
            'qris' => self::REKENING_QRIS,
            'transfer' => self::REKENING_BCA,
            default => null,
        };
    }

    public function catat(int $idRekening, string $jenis, int $nominal, int $saldo, ?array $sumber = null, ?string $tanggal = null): RiwayatSaldo
    {
        $sumber = $sumber ?: [];

        return RiwayatSaldo::create([
            'id_rekening' => $idRekening,
            'jenis' => $jenis,
            'nominal' => $nominal,
            'saldo' => $saldo,
            'tanggal' => $tanggal ?? $this->tanggalDariSumber($sumber),
            'id_pemasukan' => $sumber['id_pemasukan'] ?? null,
            'id_pengeluaran' => $sumber['id_pengeluaran'] ?? null,
        ]);
    }

    public function tambah(int $idRekening, int $nominal, string $jenis = self::MASUK, ?array $sumber = null, ?string $tanggal = null): ?RiwayatSaldo
    {
        if ($nominal <= 0) {
            return null;
        }

        $rekening = Rekening::lockForUpdate()->find($idRekening);

        if (! $rekening) {
            return null;
        }

        $rekening->saldo = (int) ($rekening->saldo ?? 0) + $nominal;
        $rekening->save();

        return $this->catat($rekening->id, $jenis, $nominal, (int) $rekening->saldo, $sumber, $tanggal);
    }

    public function kurang(int $idRekening, int $nominal, string $jenis = self::KELUAR, ?array $sumber = null, ?string $tanggal = null): ?RiwayatSaldo
    {
        if ($nominal <= 0) {
            return null;
        }

        $rekening = Rekening::lockForUpdate()->find($idRekening);

        if (! $rekening) {
            return null;
        }

        $saldoBaru = (int) ($rekening->saldo ?? 0) - $nominal;

        if ($saldoBaru < 0) {
            throw new SaldoTidakCukupException('Saldo rekening tidak mencukupi.');
        }

        $rekening->saldo = $saldoBaru;
        $rekening->save();

        return $this->catat($rekening->id, $jenis, $nominal, $saldoBaru, $sumber, $tanggal);
    }

    public function batalkanMasuk(int $idRekening, int $nominal, array $sumber): int
    {
        if ($nominal <= 0) {
            return 0;
        }

        $rekening = Rekening::lockForUpdate()->find($idRekening);

        if (! $rekening) {
            return 0;
        }

        $saldoBaru = (int) ($rekening->saldo ?? 0) - $nominal;

        if ($saldoBaru < 0) {
            throw new SaldoTidakCukupException('Saldo rekening tidak mencukupi.');
        }

        $rekening->saldo = $saldoBaru;
        $rekening->save();

        return $this->hapusSumber($idRekening, $sumber);
    }

    public function batalkanKeluar(int $idRekening, int $nominal, array $sumber): int
    {
        if ($nominal <= 0) {
            return 0;
        }

        $rekening = Rekening::lockForUpdate()->find($idRekening);

        if (! $rekening) {
            return 0;
        }

        $rekening->saldo = (int) ($rekening->saldo ?? 0) + $nominal;
        $rekening->save();

        return $this->hapusSumber($idRekening, $sumber);
    }

    public function hapusRiwayat(int $idRekening): int
    {
        return RiwayatSaldo::where('id_rekening', $idRekening)->delete();
    }

    private function hapusSumber(int $idRekening, array $sumber): int
    {
        $query = RiwayatSaldo::where('id_rekening', $idRekening);
        $adaSumber = false;

        foreach (array_keys(self::SUMBER) as $kolom) {
            if (! empty($sumber[$kolom])) {
                $query->where($kolom, $sumber[$kolom]);
                $adaSumber = true;
            }
        }

        if (! $adaSumber) {
            return 0;
        }

        $dihapus = (clone $query)->orderBy('id')->get(['id', 'jenis', 'nominal']);
        $terhapus = $query->delete();

        foreach ($dihapus as $baris) {
            $susulan = RiwayatSaldo::where('id_rekening', $idRekening)->where('id', '>', $baris->id);

            if ($baris->jenis === self::KELUAR) {
                $susulan->increment('saldo', (int) $baris->nominal);
            } else {
                $susulan->decrement('saldo', (int) $baris->nominal);
            }
        }

        return $terhapus;
    }

    private function tanggalDariSumber(array $sumber): string
    {
        foreach (self::SUMBER as $kolom => [$model, $kolomTanggal]) {
            if (empty($sumber[$kolom])) {
                continue;
            }

            $dokumen = $model::query()->find($sumber[$kolom]);

            if (! $dokumen) {
                continue;
            }

            $tanggal = $dokumen->{$kolomTanggal};

            if ($tanggal) {
                return Carbon::parse($tanggal)->toDateString();
            }
        }

        return now()->toDateString();
    }
}
