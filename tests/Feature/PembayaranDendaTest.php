<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\Pemasukan;
use App\Models\Pembayaran;
use App\Models\Pengembalian;
use App\Models\Piutang;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PembayaranDendaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    private Barang $barang;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->customer = Customer::create(['nama_lengkap' => 'Budi', 'no_hp' => '081234567890']);
        $this->barang = Barang::create(['nama_barang' => 'Drone DJI', 'stok' => 10, 'harga_sewa' => 50000]);
    }

    public function test_info_pembayaran_denda_memuat_total_dan_piutang(): void
    {
        $pengembalian = $this->buatPengembalianDenganDenda();
        $this->actingAs($this->user)->getJson(route('pembayaran.showDenda', $pengembalian->id))->assertOk()->assertJsonPath('data.pengembalian.status_pembayaran', 'Belum Lunas')->assertJsonPath('data.piutang.nominal', 70000);
    }

    public function test_bayar_cash_melunasi_denda(): void
    {
        $pengembalian = $this->buatPengembalianDenganDenda();
        $res = $this->actingAs($this->user)->postJson(route('pembayaran.storeDenda', $pengembalian->id), ['metode_pembayaran' => 'cash'])->assertOk();
        $pembayaranId = $res->json('data.id');
        $this->assertNotNull($pembayaranId);
        $pembayaran = Pembayaran::findOrFail($pembayaranId);
        $this->assertSame('cash', $pembayaran->metode_pembayaran);
        $this->assertSame($pengembalian->id, (int) $pembayaran->id_pengembalian);
        $this->assertSame(70000.0, (float) $pembayaran->gross_amount);
        $this->actingAs($this->user)->postJson(route('pembayaran.confirm', $pembayaranId))->assertOk()->assertJson(['status' => 'success']);
        $this->assertSame('settlement', $pembayaran->fresh()->transaction_status);
        $this->assertSame('Lunas', $pengembalian->fresh()->status_pembayaran);
        $piutang = Piutang::where('id_pengembalian', $pengembalian->id)->firstOrFail();
        $this->assertSame(70000.0, (float) $piutang->terbayar);
        $this->assertNotNull($piutang->tgl_pelunasan);
        $pemasukan = Pemasukan::where('id_pembayaran', $pembayaranId)->firstOrFail();
        $this->assertSame(70000.0, (float) $pemasukan->nominal);
        $this->assertSame($pengembalian->id, (int) $pemasukan->id_pengembalian);
    }

    public function test_initiate_ditolak_bila_denda_sudah_lunas(): void
    {
        $pengembalian = $this->buatPengembalianDenganDenda();
        $pembayaranId = $this->actingAs($this->user)->postJson(route('pembayaran.storeDenda', $pengembalian->id), ['metode_pembayaran' => 'transfer'])->assertOk()->json('data.id');
        $this->actingAs($this->user)->postJson(route('pembayaran.confirm', $pembayaranId))->assertOk();
        $this->actingAs($this->user)->postJson(route('pembayaran.storeDenda', $pengembalian->id), ['metode_pembayaran' => 'cash'])->assertStatus(422)->assertJsonPath('error', 'Denda pengembalian ini sudah lunas.');
    }

    private function buatPengembalianDenganDenda(): Pengembalian
    {
        $this->actingAs($this->user)->postJson(route('sewa.store'), ['tgl_sewa' => '2026-09-27', 'tgl_akhir_sewa' => '2026-09-30', 'id_customer' => $this->customer->id, 'items' => [['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 1]]])->assertOk();
        $sewa = Sewa::firstOrFail();
        $detail = SewaDetail::where('id_sewa', $sewa->id)->firstOrFail();
        $this->actingAs($this->user)->postJson(route('pengembalian.store'), ['id_sewa' => $sewa->id, 'tgl_pengembalian' => '2026-09-30', 'details' => [['id_sewa_detail' => $detail->id, 'qty_pengembalian' => 1]], 'dendas' => [['id_sewa_detail' => $detail->id, 'jenis_denda' => 'Denda Keterlambatan', 'nominal_denda' => 20000], ['id_sewa_detail' => $detail->id, 'jenis_denda' => 'Denda Kerusakan', 'nominal_denda' => 50000]]])->assertOk();

        return Pengembalian::firstOrFail();
    }
}
