<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\KategoriTransaksi;
use App\Models\Pengeluaran;
use App\Models\Perawatan;
use App\Models\PerawatanDetail;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use App\Models\RiwayatStok;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PerawatanTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Barang $barang;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->user = User::factory()->create([
            'id_role' => Role::where('role', 'Owner')->firstOrFail()->id,
        ]);
        $this->barang = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 10,
            'harga_sewa' => 50000,
        ]);

        Rekening::create(['nama_rek' => 'Kas Kantor', 'saldo' => 1000000]);
        Rekening::create(['nama_rek' => 'QRIS', 'saldo' => 0]);
        Rekening::create(['nama_rek' => 'Transfer Bank', 'saldo' => 1000000]);

        KategoriTransaksi::create(['kategori' => 'Perawatan', 'jenis' => 'Pengeluaran']);
    }

    public function test_halaman_perawatan_render_inertia(): void
    {
        $this->actingAs($this->user)
            ->get('/admin/transaksi/perawatan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Transaksi/Perawatan/Index')
                ->has('permissions')
                ->has('barangs'));
    }

    public function test_datatable_perawatan_mengembalikan_json(): void
    {
        $this->buatPerawatan();

        $this->actingAs($this->user)
            ->get('/admin/transaksi/perawatan?datatable=1', [
                'headers' => [
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Accept' => 'application/json',
                ],
            ])
            ->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);
    }

    public function test_status_perawatan_mengurangi_stok_dan_mencatat_riwayat(): void
    {
        $response = $this->actingAs($this->user)->postJson('/admin/transaksi/perawatan', [
            'tgl_perawatan' => '2026-10-15',
            'metode_pembayaran' => 'cash',
            'is_owner_acc' => Perawatan::STATUS_DISETUJUI,
            'details' => [
                [
                    'id_barang' => $this->barang->id,
                    'qty' => 2,
                    'biaya_perawatan' => 150000,
                    'status' => PerawatanDetail::STATUS_PERAWATAN,
                    'keterangan' => 'Ganti gimbal',
                ],
            ],
        ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        $this->assertSame(8, (int) $this->barang->fresh()->stok);

        $perawatan = Perawatan::firstOrFail();
        $this->assertSame(150000, (int) $perawatan->total_biaya_perawatan);
        $this->assertSame(Perawatan::BAYAR_LUNAS, $perawatan->status_pembayaran);

        $detail = PerawatanDetail::firstOrFail();
        $this->assertSame(PerawatanDetail::STATUS_PERAWATAN, $detail->status);

        $riwayat = RiwayatStok::where('id_perawatan_detail', $detail->id)->firstOrFail();
        $this->assertSame('Keluar', $riwayat->jenis);
        $this->assertSame(2, (int) $riwayat->jumlah);
    }

    public function test_status_selesai_menambah_stok_kembali(): void
    {
        $perawatan = $this->buatPerawatan();
        $this->assertSame(9, (int) $this->barang->fresh()->stok);

        $detail = $perawatan->details()->firstOrFail();

        $this->actingAs($this->user)
            ->patchJson("/admin/transaksi/perawatan-detail/{$detail->id}/status", [
                'status' => PerawatanDetail::STATUS_SELESAI,
            ])
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(10, (int) $this->barang->fresh()->stok);
        $this->assertSame(PerawatanDetail::STATUS_SELESAI, $detail->fresh()->status);
    }

    public function test_status_selesai_dikembalikan_ke_perawatan_mengurangi_stok(): void
    {
        $perawatan = $this->buatPerawatan(PerawatanDetail::STATUS_SELESAI);
        $this->assertSame(11, (int) $this->barang->fresh()->stok);

        $detail = $perawatan->details()->firstOrFail();

        $this->actingAs($this->user)
            ->patchJson("/admin/transaksi/perawatan-detail/{$detail->id}/status", [
                'status' => PerawatanDetail::STATUS_PERAWATAN,
            ])
            ->assertOk();

        $this->assertSame(10, (int) $this->barang->fresh()->stok);
    }

    public function test_update_perawatan_menghitung_ulang_stok_dan_pembayaran(): void
    {
        $perawatan = $this->buatPerawatan();

        $this->actingAs($this->user)->postJson("/admin/transaksi/perawatan/{$perawatan->id}", [
            'tgl_perawatan' => '2026-10-16',
            'metode_pembayaran' => 'transfer',
            'is_owner_acc' => Perawatan::STATUS_DISETUJUI,
            'details' => [
                [
                    'id_barang' => $this->barang->id,
                    'qty' => 3,
                    'biaya_perawatan' => 200000,
                    'status' => PerawatanDetail::STATUS_PERAWATAN,
                    'keterangan' => null,
                ],
            ],
            '_method' => 'PUT',
        ])->assertOk();

        $this->assertSame(7, (int) $this->barang->fresh()->stok);
        $this->assertSame(200000, (int) $perawatan->fresh()->total_biaya_perawatan);
        $this->assertSame(1, $perawatan->details()->count());

        $this->assertSame(1, Pengeluaran::where('id_perawatan', $perawatan->id)->count());
        $this->assertSame(200000, (int) Pengeluaran::where('id_perawatan', $perawatan->id)->firstOrFail()->nominal);
        $this->assertSame(800000, (int) Rekening::find(3)->saldo);
    }

    public function test_update_perawatan_dengan_format_tanggal_iso_tetap_berhasil(): void
    {
        $perawatan = $this->buatPerawatan();

        $this->actingAs($this->user)->postJson("/admin/transaksi/perawatan/{$perawatan->id}", [
            'tgl_perawatan' => '2026-10-27T00:00:00.000000Z',
            'metode_pembayaran' => 'cash',
            'is_owner_acc' => Perawatan::STATUS_DISETUJUI,
            'details' => [
                [
                    'id_barang' => $this->barang->id,
                    'qty' => 1,
                    'biaya_perawatan' => 250000,
                    'status' => PerawatanDetail::STATUS_PERAWATAN,
                    'keterangan' => 'Ganti sparepart',
                ],
            ],
            '_method' => 'PUT',
        ])->assertOk();

        $pengeluaran = Pengeluaran::where('id_perawatan', $perawatan->id)->firstOrFail();
        $this->assertSame('2026-10-27', $pengeluaran->tgl_pengeluaran);
        $this->assertSame(250000, (int) $pengeluaran->nominal);
    }

    public function test_hapus_perawatan_mengembalikan_stok(): void
    {
        $perawatan = $this->buatPerawatan();
        $this->assertSame(9, (int) $this->barang->fresh()->stok);

        $this->actingAs($this->user)
            ->deleteJson("/admin/transaksi/perawatan/{$perawatan->id}")
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(10, (int) $this->barang->fresh()->stok);
        $this->assertSame(0, PerawatanDetail::count());
    }

    public function test_hapus_perawatan_membatalkan_pembayaran(): void
    {
        $perawatan = $this->buatPerawatan();
        $noKwitansi = $perawatan->no_kwitansi;

        $this->assertNotNull($noKwitansi);
        $this->assertSame(900000, (int) Rekening::find(1)->saldo);
        $this->assertSame(1, Pengeluaran::where('id_perawatan', $perawatan->id)->count());

        $this->actingAs($this->user)
            ->deleteJson("/admin/transaksi/perawatan/{$perawatan->id}")
            ->assertOk()
            ->assertJson(['status' => 'success']);

        $this->assertSame(0, Perawatan::count());
        $this->assertSame(0, Pengeluaran::where('id_perawatan', $perawatan->id)->count());
        $this->assertSame(1000000, (int) Rekening::find(1)->saldo);
        $this->assertSame(0, RiwayatSaldo::where('jenis', 'Keluar')->count());
    }

    public function test_pembayaran_cash_mencatat_pengeluaran_dan_status_lunas(): void
    {
        $perawatan = $this->buatPerawatan();

        $perawatan->refresh();
        $this->assertSame(Perawatan::BAYAR_LUNAS, $perawatan->status_pembayaran);
        $this->assertNotNull($perawatan->no_kwitansi);

        $pengeluaran = Pengeluaran::where('id_perawatan', $perawatan->id)->firstOrFail();
        $this->assertSame(100000, (int) $pengeluaran->nominal);
        $this->assertSame(1, (int) $pengeluaran->id_rekening);
        $this->assertSame(900000, (int) Rekening::find(1)->saldo);

        $kategori = KategoriTransaksi::findOrFail($pengeluaran->id_kategori_transaksi);
        $this->assertSame('Perawatan', $kategori->kategori);
        $this->assertSame('Pengeluaran', $kategori->jenis);
    }

    public function test_pembayaran_transfer_mengurangi_saldo_rekening_bank(): void
    {
        $perawatan = $this->buatPerawatan(metode: 'transfer');

        $pengeluaran = Pengeluaran::where('id_perawatan', $perawatan->id)->firstOrFail();

        $this->assertSame(3, (int) $pengeluaran->id_rekening);
        $this->assertSame(900000, (int) Rekening::find(3)->saldo);
        $this->assertSame(1000000, (int) Rekening::find(1)->saldo);
    }

    public function test_metode_pembayaran_qris_ditolak(): void
    {
        $this->actingAs($this->user)
            ->postJson('/admin/transaksi/perawatan', [
                'tgl_perawatan' => '2026-10-15',
                'metode_pembayaran' => 'qris',
                'details' => [
                    [
                        'id_barang' => $this->barang->id,
                        'qty' => 1,
                        'biaya_perawatan' => 100000,
                        'status' => PerawatanDetail::STATUS_PERAWATAN,
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('metode_pembayaran');
    }

    public function test_perawatan_tanpa_biaya_tidak_mencatat_pengeluaran(): void
    {
        $this->buatPerawatan(qty: 1, biaya: 0);

        $perawatan = Perawatan::firstOrFail();

        $this->assertSame(Perawatan::BAYAR_BELUM_LUNAS, $perawatan->status_pembayaran);
        $this->assertNull($perawatan->no_kwitansi);
        $this->assertSame(0, Pengeluaran::count());
        $this->assertSame(1000000, (int) Rekening::find(1)->saldo);
    }

    public function test_validasi_menolak_detail_tanpa_barang(): void
    {
        $this->actingAs($this->user)
            ->postJson('/admin/transaksi/perawatan', [
                'tgl_perawatan' => '2026-10-15',
                'metode_pembayaran' => 'cash',
                'details' => [['qty' => 1]],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('details.0.id_barang');
    }

    private function buatPerawatan(
        string $status = PerawatanDetail::STATUS_PERAWATAN,
        int $qty = 1,
        int $biaya = 100000,
        string $metode = 'cash',
        int $isOwnerAcc = Perawatan::STATUS_DISETUJUI,
    ): Perawatan {
        $this->actingAs($this->user)->postJson('/admin/transaksi/perawatan', [
            'tgl_perawatan' => '2026-10-15',
            'metode_pembayaran' => $metode,
            'is_owner_acc' => $isOwnerAcc,
            'details' => [
                [
                    'id_barang' => $this->barang->id,
                    'qty' => $qty,
                    'biaya_perawatan' => $biaya,
                    'status' => $status,
                    'keterangan' => 'Ganti motor',
                ],
            ],
        ])->assertOk();

        return Perawatan::with('details')->firstOrFail();
    }

    public function test_non_owner_tidak_bisa_menyetujui_perawatan_saat_store(): void
    {
        $nonOwner = User::factory()->create([
            'id_role' => Role::where('role', 'Admin')->firstOrFail()->id,
        ]);

        $this->actingAs($nonOwner)->postJson('/admin/transaksi/perawatan', [
            'tgl_perawatan' => '2026-10-15',
            'metode_pembayaran' => 'cash',
            'is_owner_acc' => Perawatan::STATUS_DISETUJUI,
            'alasan_penolakan' => null,
            'details' => [
                [
                    'id_barang' => $this->barang->id,
                    'qty' => 2,
                    'biaya_perawatan' => 150000,
                    'status' => PerawatanDetail::STATUS_PERAWATAN,
                ],
            ],
        ])->assertOk()->assertJson(['status' => 'success']);

        $perawatan = Perawatan::firstOrFail();

        $this->assertSame(Perawatan::STATUS_PENDING, (int) $perawatan->is_owner_acc);
        $this->assertNull($perawatan->alasan_penolakan);
        $this->assertSame(10, (int) $this->barang->fresh()->stok);
        $this->assertSame(0, Pengeluaran::count());
        $this->assertSame(0, RiwayatStok::count());
        $this->assertSame(Perawatan::BAYAR_BELUM_LUNAS, $perawatan->status_pembayaran);
    }

    public function test_non_owner_tidak_bisa_mengubah_status_persetujuan_saat_update(): void
    {
        $perawatan = $this->buatPerawatan(isOwnerAcc: Perawatan::STATUS_DISETUJUI);

        $nonOwner = User::factory()->create([
            'id_role' => Role::where('role', 'Admin')->firstOrFail()->id,
        ]);

        $this->actingAs($nonOwner)->postJson("/admin/transaksi/perawatan/{$perawatan->id}", [
            'tgl_perawatan' => '2026-10-16',
            'metode_pembayaran' => 'cash',
            'is_owner_acc' => Perawatan::STATUS_PENDING,
            'alasan_penolakan' => 'Ditolak dari request manual',
            'details' => [
                [
                    'id_barang' => $this->barang->id,
                    'qty' => 1,
                    'biaya_perawatan' => 100000,
                    'status' => PerawatanDetail::STATUS_PERAWATAN,
                ],
            ],
            '_method' => 'PUT',
        ])->assertOk()->assertJson(['status' => 'success']);

        $perawatan->refresh();

        $this->assertSame(Perawatan::STATUS_DISETUJUI, (int) $perawatan->is_owner_acc);
        $this->assertNull($perawatan->alasan_penolakan);
        $this->assertSame(1, Pengeluaran::where('id_perawatan', $perawatan->id)->count());
    }

    public function test_perawatan_disetujui_gagal_jika_saldo_rekening_tidak_cukup(): void
    {
        // Kas Kantor saldo awalnya 1.000.000, ubah jadi 50.000
        Rekening::where('id', 1)->update(['saldo' => 50000]);

        // Biaya perawatan 100.000
        $response = $this->actingAs($this->user)->postJson('/admin/transaksi/perawatan', [
            'tgl_perawatan' => '2026-10-15',
            'metode_pembayaran' => 'cash',
            'is_owner_acc' => Perawatan::STATUS_DISETUJUI,
            'details' => [
                [
                    'id_barang' => $this->barang->id,
                    'qty' => 1,
                    'biaya_perawatan' => 100000,
                    'status' => PerawatanDetail::STATUS_PERAWATAN,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJson(['status' => 'error', 'error' => 'Saldo rekening Kas Kantor tidak cukup!']);

        $this->assertSame(0, Perawatan::count());
        $this->assertSame(50000, (int) Rekening::where('id', 1)->value('saldo'));
    }
}
