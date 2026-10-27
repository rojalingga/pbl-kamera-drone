<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\KategoriTransaksi;
use App\Models\Piutang;
use App\Models\User;
use Database\Seeders\RekeningSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LaporanExportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->seed(RekeningSeeder::class);
    }

    public function test_laporan_sewa_export_excel_dan_pdf(): void
    {
        $customer = Customer::create(['nama_lengkap' => 'Budi', 'no_hp' => '081234567890']);
        $barang = Barang::create(['nama_barang' => 'Drone DJI', 'stok' => 10, 'harga_sewa' => 50000]);

        $this->actingAs($this->user)
            ->postJson(route('sewa.store'), [
                'tgl_sewa' => '2026-09-27',
                'tgl_akhir_sewa' => '2026-09-30',
                'id_customer' => $customer->id,
                'items' => [
                    ['id_barang' => $barang->id, 'harga_sewa_satuan' => 50000, 'qty' => 2],
                ],
            ])
            ->assertOk();

        $excel = $this->actingAs($this->user)->get('/admin/laporan/sewa/export-excel');
        $excel->assertOk();
        $this->assertSame('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $excel->headers->get('Content-Type'));
        $this->assertStringStartsWith('PK', $excel->streamedContent() ?? $excel->getContent());

        $pdf = $this->actingAs($this->user)->get('/admin/laporan/sewa/export-pdf');
        $pdf->assertOk();
        $this->assertSame('application/pdf', $pdf->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
    }

    public function test_laporan_keuangan_export_excel_dan_pdf_mengikuti_filter(): void
    {
        $kategori = KategoriTransaksi::create(['kategori' => 'Sewa', 'jenis' => 'Pemasukan']);

        $this->actingAs($this->user)->post('/admin/keuangan/pemasukan', [
            'tgl_pemasukan' => '2026-09-30',
            'nominal' => 200000,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => 1,
        ])->assertOk();

        $excel = $this->actingAs($this->user)->get('/admin/laporan/keuangan/export-excel?id_rekening=1');
        $excel->assertOk();
        $this->assertSame('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $excel->headers->get('Content-Type'));

        $kosong = $this->actingAs($this->user)->get('/admin/laporan/keuangan/export-excel?id_rekening=3');
        $kosong->assertOk();

        $pdf = $this->actingAs($this->user)->get('/admin/laporan/keuangan/export-pdf?id_rekening=1');
        $pdf->assertOk();
        $this->assertSame('application/pdf', $pdf->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
    }

    public function test_laporan_piutang_export_excel_dan_pdf(): void
    {
        Piutang::create(['tgl_piutang' => '2026-09-01', 'nominal' => 200000, 'terbayar' => 0]);

        $excel = $this->actingAs($this->user)->get('/admin/laporan/piutang-hutang/export-excel');
        $excel->assertOk();
        $this->assertSame('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $excel->headers->get('Content-Type'));

        $pdf = $this->actingAs($this->user)->get('/admin/laporan/piutang-hutang/export-pdf?status=belum');
        $pdf->assertOk();
        $this->assertSame('application/pdf', $pdf->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
    }
}
