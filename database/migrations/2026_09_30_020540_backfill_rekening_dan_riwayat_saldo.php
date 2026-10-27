<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->isiRekeningKosong();
        $this->bangunRiwayatKosong();
    }

    public function down(): void {}

    private function isiRekeningKosong(): void
    {
        $metode = DB::table('pembayaran')->pluck('metode_pembayaran', 'id');

        foreach (DB::table('pemasukan')->whereNull('id_rekening')->get() as $row) {
            DB::table('pemasukan')->where('id', $row->id)->update([
                'id_rekening' => $this->rekeningUntukMetode($metode[$row->id_pembayaran] ?? null),
            ]);
        }

        DB::table('pengeluaran')->whereNull('id_rekening')->update(['id_rekening' => 1]);
    }

    private function rekeningUntukMetode(?string $metode): int
    {
        return match ($metode) {
            'qris' => 2,
            'transfer' => 3,
            default => 1,
        };
    }

    private function bangunRiwayatKosong(): void
    {
        foreach (DB::table('rekening')->pluck('id') as $idRekening) {
            $this->bangunRiwayatRekening((int) $idRekening);
        }
    }

    private function bangunRiwayatRekening(int $idRekening): void
    {
        $saldo = (int) (DB::table('rekening')->where('id', $idRekening)->value('saldo') ?? 0);

        $dokumen = [];

        $masuk = DB::table('pemasukan')
            ->where('pemasukan.id_rekening', $idRekening)
            ->whereNotExists(fn ($query) => $query->select(DB::raw(1))->from('riwayat_saldo')->whereColumn('riwayat_saldo.id_pemasukan', 'pemasukan.id'))
            ->orderBy('tgl_pemasukan')
            ->orderBy('id')
            ->get();

        foreach ($masuk as $row) {
            $dokumen[] = [
                'tanggal' => $row->tgl_pemasukan,
                'jenis' => 'Masuk',
                'id_pemasukan' => $row->id,
                'id_pengeluaran' => null,
                'nominal' => (int) ($row->nominal ?? 0),
            ];
        }

        $keluar = DB::table('pengeluaran')
            ->where('pengeluaran.id_rekening', $idRekening)
            ->whereNotExists(fn ($query) => $query->select(DB::raw(1))->from('riwayat_saldo')->whereColumn('riwayat_saldo.id_pengeluaran', 'pengeluaran.id'))
            ->orderBy('tgl_pengeluaran')
            ->orderBy('id')
            ->get();

        foreach ($keluar as $row) {
            $dokumen[] = [
                'tanggal' => $row->tgl_pengeluaran,
                'jenis' => 'Keluar',
                'id_pemasukan' => null,
                'id_pengeluaran' => $row->id,
                'nominal' => (int) ($row->nominal ?? 0),
            ];
        }

        usort($dokumen, fn ($a, $b) => ($a['tanggal'] ?? '9999-12-31') <=> ($b['tanggal'] ?? '9999-12-31'));

        foreach ($dokumen as $item) {
            if ($item['nominal'] <= 0) {
                continue;
            }

            $saldo = $item['jenis'] === 'Masuk' ? $saldo + $item['nominal'] : $saldo - $item['nominal'];

            DB::table('riwayat_saldo')->insert([
                'tanggal' => $item['tanggal'] ? Carbon::parse($item['tanggal'])->toDateString() : now()->toDateString(),
                'id_rekening' => $idRekening,
                'id_pemasukan' => $item['id_pemasukan'],
                'id_pengeluaran' => $item['id_pengeluaran'],
                'jenis' => $item['jenis'],
                'nominal' => $item['nominal'],
                'saldo' => $saldo,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('rekening')->where('id', $idRekening)->update(['saldo' => $saldo]);
    }
};
