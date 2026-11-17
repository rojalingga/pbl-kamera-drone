<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\MenuSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\RoleUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardRedesignTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(MenuSeeder::class);
        $this->seed(RoleUserSeeder::class);

        $this->user = User::factory()->create([
            'id_role' => 2, // Owner role
        ]);
    }

    public function test_dashboard_renders_inertia_page_with_all_business_metrics(): void
    {
        $response = $this->actingAs($this->user)->get('/admin/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->has('filter')
            ->has('ringkasanBisnis')
            ->has('operasional')
            ->has('inventaris')
            ->has('keuangan')
            ->has('aktivitas')
            ->has('actionItems')
            // Backward compatibility
            ->has('stats')
            ->has('chartKeuangan')
        );
    }

    public function test_dashboard_data_endpoint_returns_json_structure(): void
    {
        $response = $this->actingAs($this->user)->getJson('/admin/dashboard/data');

        $response->assertOk()
            ->assertJsonStructure([
                'filter' => ['periode', 'start_date', 'end_date', 'label'],
                'ringkasanBisnis' => [
                    'total_pemasukan',
                    'total_pengeluaran',
                    'profit',
                    'total_piutang_belum_lunas',
                    'pemasukan_growth',
                    'pengeluaran_growth',
                    'profit_growth',
                    'profit_margin',
                    'piutang_count',
                ],
                'operasional' => [
                    'total_sewa',
                    'sewa_berjalan',
                    'sewa_terlambat',
                    'menunggu_konfirmasi',
                    'pengembalian_belum_selesai',
                ],
                'inventaris' => [
                    'total_jenis_barang',
                    'total_stok_unit',
                    'stok_tersedia',
                    'sedang_disewa',
                    'dalam_perawatan',
                    'stok_rendah_count',
                    'utilisasi_persen',
                    'barang_stok_rendah',
                ],
                'keuangan' => [
                    'saldo_rekening',
                    'total_saldo_rekening',
                    'chart_periode',
                    'chart_bulanan',
                ],
                'aktivitas' => [
                    'sewa_terbaru',
                    'pembayaran_terbaru',
                    'pengembalian_terbaru',
                    'perawatan_terbaru',
                    'pengadaan_terbaru',
                ],
                'actionItems' => [
                    'overdue_rentals',
                    'pending_payments',
                    'unpaid_fines',
                ],
            ]);
    }

    public function test_dashboard_filter_period_changes_successfully(): void
    {
        $periods = ['hari_ini', 'minggu_ini', 'bulan_ini', 'tahun_ini'];

        foreach ($periods as $p) {
            $response = $this->actingAs($this->user)->getJson("/admin/dashboard/data?periode={$p}");
            $response->assertOk();
            $this->assertSame($p, $response->json('filter.periode'));
        }

        // Custom date
        $response = $this->actingAs($this->user)->getJson('/admin/dashboard/data?periode=custom&start_date=2026-10-01&end_date=2026-10-31');
        $response->assertOk();
        $this->assertSame('custom', $response->json('filter.periode'));
        $this->assertSame('2026-10-01', $response->json('filter.start_date'));
        $this->assertSame('2026-10-31', $response->json('filter.end_date'));
    }
}
