<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\Sewa;
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

    public function test_laporan_sewa_data_mengembalikan_json_dan_filter(): void
    {
        $customer = Customer::create(['nama_lengkap' => 'Budi', 'no_hp' => '081234567890']);
        $barang = Barang::create([
            'nama_barang' => 'Drone DJI',
            'stok' => 10,
            'harga_sewa' => 50000,
        ]);

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

        $response = $this->actingAs($this->user)
            ->get('/admin/laporan/sewa/data');

        $response->assertOk()
            ->assertJsonStructure(['draw', 'recordsTotal', 'recordsFiltered', 'data']);

        $this->assertSame('Budi', $response->json('data.0.customer'));
        $this->assertSame(Sewa::SEWA_PENDING, $response->json('data.0.status'));
        $this->assertSame('300.000', $response->json('data.0.total_biaya'));

        $this->actingAs($this->user)
            ->get('/admin/laporan/sewa/data?tanggal_awal=2026-10-01&tanggal_akhir=2026-10-31')
            ->assertOk()
            ->assertJson(['recordsFiltered' => 0]);
    }

    public function test_laporan_sewa_data_menolak_rentang_tanggal(): void
    {
        $this->actingAs($this->user)
            ->getJson('/admin/laporan/sewa/data?tanggal_awal=2026-10-05&tanggal_akhir=2026-10-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tanggal_akhir']);
    }
}
