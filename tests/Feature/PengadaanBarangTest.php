<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\PengadaanBarang;
use App\Models\PengadaanBarangDetail;
use App\Models\RiwayatStok;
use App\Models\User;
use App\Services\RiwayatStokService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PengadaanBarangTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Barang $barangA;

    private Barang $barangB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->barangA = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 5,
            'harga_sewa' => 100000,
        ]);
        $this->barangB = Barang::create([
            'nama_barang' => 'Kamera Sony',
            'stok' => 3,
            'harga_sewa' => 75000,
        ]);
    }

    public function test_store_menambah_stok_dan_menulis_riwayat_masuk(): void
    {
        $response = $this->actingAs($this->user)->postJson(route('pengadaan-barang.store'), [
            'tgl_pengadaan' => '2026-09-27',
            'keterangan' => 'Restock bulanan',
            'details' => [
                ['id_barang' => $this->barangA->id, 'jumlah' => 2],
                ['id_barang' => $this->barangB->id, 'jumlah' => 4],
            ],
        ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        $this->assertSame(1, PengadaanBarang::count());
        $this->assertSame(2, PengadaanBarangDetail::count());
        $this->assertSame(7, (int) $this->barangA->fresh()->stok);
        $this->assertSame(7, (int) $this->barangB->fresh()->stok);

        $riwayatA = RiwayatStok::where('id_barang', $this->barangA->id)->firstOrFail();
        $this->assertSame('Masuk', $riwayatA->jenis);
        $this->assertSame(2, (int) $riwayatA->jumlah);
        $this->assertSame(7, (int) $riwayatA->stok);
        $this->assertNotNull($riwayatA->id_pengadaan_barang_detail);
        $this->assertSame('2026-09-27', $riwayatA->tanggal->toDateString());

        $riwayatB = RiwayatStok::where('id_barang', $this->barangB->id)->firstOrFail();
        $this->assertSame('Masuk', $riwayatB->jenis);
        $this->assertSame(4, (int) $riwayatB->jumlah);
        $this->assertSame(7, (int) $riwayatB->stok);
    }

    public function test_store_wajib_menyertakan_item_barang(): void
    {
        $this->actingAs($this->user)->postJson(route('pengadaan-barang.store'), [
            'tgl_pengadaan' => '2026-09-27',
            'keterangan' => 'Tanpa item',
            'details' => [],
        ])->assertStatus(422)->assertJsonValidationErrors(['details']);

        $this->assertSame(0, PengadaanBarang::count());
        $this->assertSame(5, (int) $this->barangA->fresh()->stok);
    }

    public function test_update_menyesuaikan_stok_dengan_selisih(): void
    {
        $pengadaan = $this->buatPengadaan([[$this->barangA->id, 2]]);
        $this->assertSame(7, (int) $this->barangA->fresh()->stok);

        $this->actingAs($this->user)
            ->putJson(route('pengadaan-barang.update', $pengadaan->id), [
                'tgl_pengadaan' => '2026-09-27',
                'keterangan' => 'Restock bulanan',
                'details' => [
                    ['id_barang' => $this->barangA->id, 'jumlah' => 5],
                ],
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(10, (int) $this->barangA->fresh()->stok);

        $this->actingAs($this->user)
            ->putJson(route('pengadaan-barang.update', $pengadaan->id), [
                'tgl_pengadaan' => '2026-09-27',
                'keterangan' => 'Restock bulanan',
                'details' => [
                    ['id_barang' => $this->barangA->id, 'jumlah' => 1],
                ],
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(6, (int) $this->barangA->fresh()->stok);
        $this->assertSame(1, PengadaanBarangDetail::count());

        $riwayat = RiwayatStok::where('id_barang', $this->barangA->id)->orderBy('id')->get();
        $this->assertCount(1, $riwayat);
        $this->assertSame('Masuk', $riwayat[0]->jenis);
        $this->assertSame(1, (int) $riwayat[0]->jumlah);
        $this->assertSame(6, (int) $riwayat[0]->stok);
    }

    public function test_update_ditolak_bila_stok_tidak_cukupi(): void
    {
        $pengadaan = $this->buatPengadaan([[$this->barangA->id, 5]]);
        app(RiwayatStokService::class)->kurang($this->barangA->id, 9);

        $this->actingAs($this->user)
            ->putJson(route('pengadaan-barang.update', $pengadaan->id), [
                'tgl_pengadaan' => '2026-09-27',
                'keterangan' => 'Dipangkas',
                'details' => [
                    ['id_barang' => $this->barangA->id, 'jumlah' => 1],
                ],
            ])
            ->assertStatus(422)
            ->assertJson(['status' => 'error', 'error' => 'Stok tidak mencukupi.']);

        $this->assertSame(1, (int) $this->barangA->fresh()->stok);
        $this->assertSame(5, (int) PengadaanBarangDetail::firstOrFail()->jumlah);
        $this->assertSame('Restock', PengadaanBarang::firstOrFail()->keterangan);
    }

    public function test_destroy_mengembalikan_stok(): void
    {
        $pengadaan = $this->buatPengadaan([
            [$this->barangA->id, 2],
            [$this->barangB->id, 1],
        ]);

        $this->actingAs($this->user)
            ->deleteJson(route('pengadaan-barang.destroy', $pengadaan->id))
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(0, PengadaanBarang::count());
        $this->assertSame(0, PengadaanBarangDetail::count());
        $this->assertSame(5, (int) $this->barangA->fresh()->stok);
        $this->assertSame(3, (int) $this->barangB->fresh()->stok);

        $this->assertSame(0, RiwayatStok::where('id_barang', $this->barangA->id)->count());
        $this->assertSame(0, RiwayatStok::where('id_barang', $this->barangB->id)->count());
    }

    public function test_destroy_ditolak_bila_stok_tidak_cukupi(): void
    {
        $pengadaan = $this->buatPengadaan([[$this->barangA->id, 5]]);
        app(RiwayatStokService::class)->kurang($this->barangA->id, 9);

        $this->actingAs($this->user)
            ->deleteJson(route('pengadaan-barang.destroy', $pengadaan->id))
            ->assertStatus(422)
            ->assertJson(['status' => 'error', 'error' => 'Stok tidak mencukupi.']);

        $this->assertSame(1, PengadaanBarang::count());
        $this->assertSame(1, PengadaanBarangDetail::count());
        $this->assertSame(1, (int) $this->barangA->fresh()->stok);
    }

    public function test_edit_mengembalikan_detail_item(): void
    {
        $pengadaan = $this->buatPengadaan([[$this->barangA->id, 3]]);

        $response = $this->actingAs($this->user)
            ->getJson(route('pengadaan-barang.edit', $pengadaan->id));

        $response->assertOk()->assertJson(['status' => 'success']);
        $this->assertSame('Restock', $response->json('data.keterangan'));
        $this->assertSame((string) $this->barangA->id, $response->json('data.details.0.id_barang'));
        $this->assertSame('3', $response->json('data.details.0.jumlah'));
    }

    public function test_index_datatable_memformat_tanggal_indonesia(): void
    {
        PengadaanBarang::create([
            'tgl_pengadaan' => '2026-01-15',
            'keterangan' => 'Restock',
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get(route('pengadaan-barang.index'));

        $response->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);

        $this->assertSame('15 Januari 2026', $response->json('data.0.tgl_pengadaan'));
    }

    /**
     * Buat pengadaan langsung lewat service agar stok ikut bertambah.
     *
     * @param  array<int, array{0: int, 1: int}>  $items
     */
    private function buatPengadaan(array $items): PengadaanBarang
    {
        $pengadaan = PengadaanBarang::create([
            'tgl_pengadaan' => '2026-09-27',
            'keterangan' => 'Restock',
        ]);

        foreach ($items as [$idBarang, $jumlah]) {
            $detail = PengadaanBarangDetail::create([
                'id_pengadaan_barang' => $pengadaan->id,
                'id_barang' => $idBarang,
                'jumlah' => $jumlah,
            ]);

            app(RiwayatStokService::class)->tambah($idBarang, $jumlah, RiwayatStokService::MASUK, [
                'id_pengadaan_barang_detail' => $detail->id,
            ]);
        }

        return $pengadaan;
    }
}
