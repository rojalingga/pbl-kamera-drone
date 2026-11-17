<?php

namespace Tests\Feature;

use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Pengeluaran;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaldoKeuanganTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Rekening $rekening;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->rekening = Rekening::create([
            'nama_rek' => 'Kas',
            'saldo' => 100000,
        ]);
    }

    public function test_store_pemasukan_menambah_saldo_dan_riwayat(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);

        $this->actingAs($this->user)->postJson(route('pemasukan.store'), [
            'tgl_pemasukan' => '2026-09-30',
            'nominal' => 50000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
        ])->assertOk()->assertJson(['status' => 'success']);

        $this->assertSame(150000, (int) $this->rekening->fresh()->saldo);

        $pemasukan = Pemasukan::firstOrFail();
        $riwayat = RiwayatSaldo::where('id_pemasukan', $pemasukan->id)->firstOrFail();
        $this->assertSame('Masuk', $riwayat->jenis);
        $this->assertSame(50000, (int) $riwayat->nominal);
        $this->assertSame(150000, (int) $riwayat->saldo);
        $this->assertSame('2026-09-30', $riwayat->tanggal->toDateString());
    }

    public function test_update_pemasukan_menyesuaikan_saldo_dan_riwayat(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);

        $this->actingAs($this->user)->postJson(route('pemasukan.store'), [
            'tgl_pemasukan' => '2026-09-30',
            'nominal' => 50000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
        ])->assertOk();

        $pemasukan = Pemasukan::firstOrFail();

        $this->actingAs($this->user)->putJson(route('pemasukan.update', $pemasukan->id), [
            'tgl_pemasukan' => '2026-09-30',
            'nominal' => 80000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
        ])->assertOk()->assertJson(['status' => 'success']);

        $this->assertSame(180000, (int) $this->rekening->fresh()->saldo);

        $riwayat = RiwayatSaldo::where('id_pemasukan', $pemasukan->id)->get();
        $this->assertCount(1, $riwayat);
        $this->assertSame(80000, (int) $riwayat[0]->nominal);
        $this->assertSame(180000, (int) $riwayat[0]->saldo);
    }

    public function test_store_pengeluaran_mengurangi_saldo_dan_riwayat(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Operasional', 'jenis' => 'Pengeluaran']);

        $this->actingAs($this->user)->postJson(route('pengeluaran.store'), [
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 30000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
        ])->assertOk()->assertJson(['status' => 'success']);

        $this->assertSame(70000, (int) $this->rekening->fresh()->saldo);

        $pengeluaran = Pengeluaran::firstOrFail();
        $riwayat = RiwayatSaldo::where('id_pengeluaran', $pengeluaran->id)->firstOrFail();
        $this->assertSame('Keluar', $riwayat->jenis);
        $this->assertSame(30000, (int) $riwayat->nominal);
        $this->assertSame(70000, (int) $riwayat->saldo);
        $this->assertSame('2026-09-30', $riwayat->tanggal->toDateString());
    }

    public function test_update_pengeluaran_menyesuaikan_saldo_dan_riwayat(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Operasional', 'jenis' => 'Pengeluaran']);

        $this->actingAs($this->user)->postJson(route('pengeluaran.store'), [
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 30000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
        ])->assertOk();

        $pengeluaran = Pengeluaran::firstOrFail();

        $this->actingAs($this->user)->putJson(route('pengeluaran.update', $pengeluaran->id), [
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 10000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
        ])->assertOk()->assertJson(['status' => 'success']);

        $this->assertSame(90000, (int) $this->rekening->fresh()->saldo);

        $riwayat = RiwayatSaldo::where('id_pengeluaran', $pengeluaran->id)->get();
        $this->assertCount(1, $riwayat);
        $this->assertSame(10000, (int) $riwayat[0]->nominal);
        $this->assertSame(90000, (int) $riwayat[0]->saldo);
    }

    public function test_pengeluaran_gagal_jika_saldo_rekening_tidak_mencukupi(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Operasional', 'jenis' => 'Pengeluaran']);

        // Saldo rekening 100.000, pengeluaran 200.000
        $this->actingAs($this->user)->postJson(route('pengeluaran.store'), [
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 200000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
        ])->assertStatus(422)
            ->assertJson(['status' => 'error', 'error' => 'Saldo rekening Kas tidak cukup!']);

        // Pastikan saldo rekening tetap tidak berkurang
        $this->assertSame(100000, (int) $this->rekening->fresh()->saldo);
    }
}
