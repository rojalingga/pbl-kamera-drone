<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\Pengembalian;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PengembalianTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    private Barang $barang;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->customer = Customer::create([
            'nama_lengkap' => 'Budi',
            'no_hp' => '081234567890',
        ]);
        $this->barang = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 10,
            'harga_sewa' => 50000,
        ]);
    }

    public function test_daftar_sewa_memuat_sewa_yang_sudah_dikembalikan(): void
    {
        $sewaId = $this->buatSewaDenganSatuDetail();
        $this->buatPengembalian($sewaId);

        $this->actingAs($this->user)
            ->get('/admin/transaksi/pengembalian')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Transaksi/Pengembalian/Index')
                ->has('sewas')
                ->where('sewas.0.id', (string) $sewaId));
    }

    public function test_sewa_yang_sudah_dikembalikan_ditolak_dengan_pesan_indonesia(): void
    {
        $sewaId = $this->buatSewaDenganSatuDetail();
        $detail = SewaDetail::where('id_sewa', $sewaId)->firstOrFail();
        $this->buatPengembalian($sewaId);

        $response = $this->actingAs($this->user)->postJson(route('pengembalian.store'), [
            'id_sewa' => $sewaId,
            'tgl_pengembalian' => '2026-10-03',
            'details' => [
                ['id_sewa_detail' => $detail->id, 'qty_pengembalian' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['id_sewa'])
            ->assertJsonPath('errors.id_sewa.0', 'Sewa ini sudah dikembalikan.');
    }

    public function test_edit_mengembalikan_detail_dengan_relasi_sewa_detail(): void
    {
        $sewaId = $this->buatSewaDenganSatuDetail();
        $this->buatPengembalian($sewaId);
        $pengembalian = Pengembalian::firstOrFail();

        $this->actingAs($this->user)
            ->getJson(route('pengembalian.edit', $pengembalian->id))
            ->assertOk()
            ->assertJsonPath('data.details.0.sewa_detail.barang.nama_barang', 'Drone DJI');
    }

    private function buatSewaDenganSatuDetail(): string
    {
        $this->actingAs($this->user)->postJson(route('sewa.store'), [
            'tgl_sewa' => '2026-09-27',
            'tgl_akhir_sewa' => '2026-09-30',
            'id_customer' => $this->customer->id,
            'items' => [
                ['id_barang' => $this->barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 1],
            ],
        ])->assertOk();

        return (string) Sewa::firstOrFail()->id;
    }

    private function buatPengembalian(string $sewaId): void
    {
        $detail = SewaDetail::where('id_sewa', $sewaId)->firstOrFail();

        $this->actingAs($this->user)->postJson(route('pengembalian.store'), [
            'id_sewa' => $sewaId,
            'tgl_pengembalian' => '2026-09-30',
            'details' => [
                ['id_sewa_detail' => $detail->id, 'qty_pengembalian' => 1],
            ],
        ])->assertOk();
    }

    public function test_datatable_memuat_status_pembayaran(): void
    {
        $sewaId = $this->buatSewaDenganSatuDetail();
        $this->buatPengembalian($sewaId);

        $this->actingAs($this->user)
            ->getJson('/admin/transaksi/pengembalian?datatable=1', ['X-Requested-With' => 'XMLHttpRequest'])
            ->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data'])
            ->assertJsonPath('data.0.status_pembayaran', 'Lunas');
    }

    public function test_denda_tersimpan_dan_total_menjumlahkan_nominal(): void
    {
        $sewaId = $this->buatSewaDenganSatuDetail();
        $detail = SewaDetail::where('id_sewa', $sewaId)->firstOrFail();

        $this->actingAs($this->user)->postJson(route('pengembalian.store'), [
            'id_sewa' => $sewaId,
            'tgl_pengembalian' => '2026-09-30',
            'details' => [
                ['id_sewa_detail' => $detail->id, 'qty_pengembalian' => 1],
            ],
            'dendas' => [
                ['id_sewa_detail' => $detail->id, 'jenis_denda' => 'Denda Keterlambatan', 'nominal_denda' => 20000],
                ['id_sewa_detail' => $detail->id, 'jenis_denda' => 'Denda Kerusakan', 'nominal_denda' => 50000],
            ],
        ])->assertOk()->assertJson(['status' => 'success']);

        $pengembalian = Pengembalian::firstOrFail();
        $this->assertSame(70000.0, (float) $pengembalian->total_denda);
        $this->assertSame('Belum Lunas', $pengembalian->status_pembayaran);
        $this->assertSame(2, $pengembalian->dendas()->count());

        $this->actingAs($this->user)
            ->getJson(route('pengembalian.edit', $pengembalian->id))
            ->assertOk()
            ->assertJsonPath('data.dendas.0.jenis_denda', 'Denda Keterlambatan')
            ->assertJsonPath('data.dendas.0.nominal_denda', 20000);
    }
}
