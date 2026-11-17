<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\KategoriTransaksi;
use App\Models\PembelianUnit;
use App\Models\PembelianUnitDetail;
use App\Models\Pengeluaran;
use App\Models\Rekening;
use App\Models\RiwayatStok;
use App\Models\Role;
use App\Models\User;
use App\Services\RiwayatSaldoService;
use App\Services\RiwayatStokService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PembelianUnitTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Barang $barangA;

    private Barang $barangB;

    private Rekening $rekening;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->user = User::factory()->create([
            'id_role' => Role::where('role', 'Owner')->firstOrFail()->id,
        ]);
        $this->barangA = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 0,
            'harga_sewa' => 100000,
        ]);
        $this->barangB = Barang::create([
            'nama_barang' => 'Kamera Sony',
            'stok' => 0,
            'harga_sewa' => 75000,
        ]);
        $this->rekening = Rekening::create([
            'nama_rek' => 'Kas',
            'saldo' => 10000000,
        ]);
    }

    public function test_store_menambah_stok_dan_mencatat_pengeluaran(): void
    {
        $response = $this->actingAs($this->user)->postJson(route('pembelian-unit.store'), [
            'tanggal' => '2026-09-30',
            'keterangan' => 'Beli unit baru',
            'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
            'id_rekening' => $this->rekening->id,
            'details' => [
                ['id_barang' => $this->barangA->id, 'harga_beli' => 5000000, 'jumlah' => 1],
                ['id_barang' => $this->barangB->id, 'harga_beli' => 3000000, 'jumlah' => 1],
            ],
        ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        $this->assertSame(1, PembelianUnit::count());
        $this->assertSame(2, PembelianUnitDetail::count());
        $this->assertSame(1, (int) $this->barangA->fresh()->stok);
        $this->assertSame(1, (int) $this->barangB->fresh()->stok);

        $pengeluaran = Pengeluaran::firstOrFail();
        $this->assertSame(8000000, (int) $pengeluaran->nominal);
        $this->assertSame(PembelianUnit::firstOrFail()->id, (int) $pengeluaran->id_pembelian_unit);
        $this->assertSame('2026-09-30', $pengeluaran->tgl_pengeluaran);

        $this->assertSame(2000000, (int) $this->rekening->fresh()->saldo);

        $riwayatA = RiwayatStok::where('id_barang', $this->barangA->id)->firstOrFail();
        $this->assertSame('Masuk', $riwayatA->jenis);
        $this->assertSame(1, (int) $riwayatA->jumlah);
        $this->assertNotNull($riwayatA->id_pembelian_unit_detail);
        $this->assertSame('2026-09-30', $riwayatA->tanggal->toDateString());
    }

    public function test_store_ditolak_bila_saldo_tidak_cukupi(): void
    {
        $this->rekening->update(['saldo' => 1000]);

        $this->actingAs($this->user)->postJson(route('pembelian-unit.store'), [
            'tanggal' => '2026-09-30',
            'keterangan' => 'Beli unit baru',
            'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
            'id_rekening' => $this->rekening->id,
            'details' => [
                ['id_barang' => $this->barangA->id, 'harga_beli' => 5000000, 'jumlah' => 1],
            ],
        ])->assertStatus(422)->assertJson(['status' => 'error', 'error' => 'Saldo rekening Kas tidak cukup!']);

        $this->assertSame(0, PembelianUnit::count());
        $this->assertSame(0, (int) $this->barangA->fresh()->stok);
    }

    public function test_update_menulis_ulang_stok_dan_pengeluaran(): void
    {
        $pembelian = PembelianUnit::create([
            'tanggal' => '2026-09-30',
            'keterangan' => 'Awal',
            'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
        ]);
        $detail = PembelianUnitDetail::create([
            'id_pembelian_unit' => $pembelian->id,
            'id_barang' => $this->barangA->id,
            'harga_beli' => 5000000,
            'jumlah' => 2,
        ]);
        app(RiwayatStokService::class)->tambah($this->barangA->id, 2, 'Masuk', [
            'id_pembelian_unit_detail' => $detail->id,
        ]);
        $kategori = KategoriTransaksi::firstOrCreate(['kategori' => 'Pembelian Unit', 'jenis' => 'Pengeluaran']);
        $pengeluaran = Pengeluaran::create([
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 10000000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
            'id_pembelian_unit' => $pembelian->id,
        ]);
        app(RiwayatSaldoService::class)->kurang($this->rekening->id, 10000000, 'Keluar', [
            'id_pengeluaran' => $pengeluaran->id,
        ], '2026-09-30');

        $this->actingAs($this->user)
            ->putJson(route('pembelian-unit.update', $pembelian->id), [
                'tanggal' => '2026-09-30',
                'keterangan' => 'Revisi',
                'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
                'id_rekening' => $this->rekening->id,
                'details' => [
                    ['id_barang' => $this->barangB->id, 'harga_beli' => 3000000, 'jumlah' => 1],
                ],
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(0, (int) $this->barangA->fresh()->stok);
        $this->assertSame(1, (int) $this->barangB->fresh()->stok);
        $this->assertSame(3000000, (int) $pengeluaran->fresh()->nominal);
        $this->assertSame(7000000, (int) $this->rekening->fresh()->saldo);
        $this->assertSame(0, RiwayatStok::where('id_barang', $this->barangA->id)->count());
    }

    public function test_destroy_mengembalikan_stok_dan_menghapus_pengeluaran(): void
    {
        $pembelian = PembelianUnit::create([
            'tanggal' => '2026-09-30',
            'keterangan' => 'Awal',
            'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
        ]);
        $detail = PembelianUnitDetail::create([
            'id_pembelian_unit' => $pembelian->id,
            'id_barang' => $this->barangA->id,
            'harga_beli' => 5000000,
            'jumlah' => 2,
        ]);
        app(RiwayatStokService::class)->tambah($this->barangA->id, 2, 'Masuk', [
            'id_pembelian_unit_detail' => $detail->id,
        ]);
        $kategori = KategoriTransaksi::firstOrCreate(['kategori' => 'Pembelian Unit', 'jenis' => 'Pengeluaran']);
        $pengeluaran = Pengeluaran::create([
            'tgl_pengeluaran' => '2026-09-30',
            'nominal' => 10000000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $this->rekening->id,
            'id_pembelian_unit' => $pembelian->id,
        ]);
        app(RiwayatSaldoService::class)->kurang($this->rekening->id, 10000000, 'Keluar', [
            'id_pengeluaran' => $pengeluaran->id,
        ], '2026-09-30');

        $this->actingAs($this->user)
            ->deleteJson(route('pembelian-unit.destroy', $pembelian->id))
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(0, PembelianUnit::count());
        $this->assertSame(0, PembelianUnitDetail::count());
        $this->assertSame(0, Pengeluaran::count());
        $this->assertSame(0, (int) $this->barangA->fresh()->stok);
        $this->assertSame(10000000, (int) $this->rekening->fresh()->saldo);
        $this->assertSame(0, RiwayatStok::where('id_barang', $this->barangA->id)->count());
    }

    public function test_index_datatable_memformat_tanggal_dan_nominal(): void
    {
        $pembelian = PembelianUnit::create(['tanggal' => '2026-01-15', 'keterangan' => 'Beli']);
        PembelianUnitDetail::create([
            'id_pembelian_unit' => $pembelian->id,
            'id_barang' => $this->barangA->id,
            'harga_beli' => 1500000,
            'jumlah' => 2,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->get(route('pembelian-unit.index'));

        $response->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);

        $this->assertSame('15 Januari 2026', $response->json('data.0.tanggal'));
        $this->assertSame('3.000.000', $response->json('data.0.total_biaya'));
    }

    public function test_riwayat_stok_menampilkan_sumber_pembelian_unit(): void
    {
        $this->actingAs($this->user)->postJson(route('pembelian-unit.store'), [
            'tanggal' => '2026-09-30',
            'keterangan' => 'Beli unit baru',
            'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
            'id_rekening' => $this->rekening->id,
            'details' => [[
                'id_barang' => $this->barangA->id, 'harga_beli' => 5000000, 'jumlah' => 1,
            ]],
        ])->assertOk();

        $response = $this->actingAs($this->user)->getJson(route('riwayat-stok.data', ['id_barang' => $this->barangA->id]));

        $response->assertOk()->assertJson(['status' => 'success']);
        $this->assertSame('Masuk', $response->json('data.0.jenis'));
        $this->assertSame('Pembelian Unit', $response->json('data.0.sumber'));
        $this->assertSame(1, (int) $response->json('data.0.jumlah'));
        $this->assertSame(1, (int) $response->json('data.0.stok'));
    }

    public function test_non_owner_tidak_bisa_menyetujui_pembelian_saat_store(): void
    {
        $nonOwner = $this->buatUserNonOwner();

        $this->actingAs($nonOwner)->postJson(route('pembelian-unit.store'), [
            'tanggal' => '2026-09-30',
            'keterangan' => 'Beli unit baru',
            'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
            'id_rekening' => $this->rekening->id,
            'details' => [
                ['id_barang' => $this->barangA->id, 'harga_beli' => 5000000, 'jumlah' => 1],
            ],
        ])->assertOk()->assertJson(['status' => 'success']);

        $pembelian = PembelianUnit::firstOrFail();

        $this->assertSame(PembelianUnit::STATUS_PENDING, (int) $pembelian->is_owner_acc);
        $this->assertSame(0, (int) $this->barangA->fresh()->stok);
        $this->assertSame(0, Pengeluaran::count());
        $this->assertSame(10000000, (int) $this->rekening->fresh()->saldo);
        $this->assertSame(0, RiwayatStok::count());
    }

    public function test_non_owner_tidak_bisa_mengubah_status_persetujuan_saat_update(): void
    {
        $pembelian = PembelianUnit::create([
            'tanggal' => '2026-09-30',
            'keterangan' => 'Awal',
            'is_owner_acc' => PembelianUnit::STATUS_PENDING,
        ]);

        $nonOwner = $this->buatUserNonOwner();

        $this->actingAs($nonOwner)
            ->putJson(route('pembelian-unit.update', $pembelian->id), [
                'tanggal' => '2026-09-30',
                'keterangan' => 'Revisi',
                'is_owner_acc' => PembelianUnit::STATUS_DISETUJUI,
                'id_rekening' => $this->rekening->id,
                'details' => [
                    ['id_barang' => $this->barangA->id, 'harga_beli' => 5000000, 'jumlah' => 1],
                ],
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(PembelianUnit::STATUS_PENDING, (int) $pembelian->fresh()->is_owner_acc);
        $this->assertSame(0, (int) $this->barangA->fresh()->stok);
        $this->assertSame(0, Pengeluaran::count());
        $this->assertSame(10000000, (int) $this->rekening->fresh()->saldo);
    }

    private function buatUserNonOwner(): User
    {
        return User::factory()->create([
            'id_role' => Role::where('role', 'Admin')->firstOrFail()->id,
        ]);
    }
}
