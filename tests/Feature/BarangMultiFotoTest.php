<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\FotoBarang;
use App\Models\Kategori;
use App\Models\Merk;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BarangMultiFotoTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<int, string> */
    private array $files = [];

    protected function tearDown(): void
    {
        foreach ($this->files as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }

        parent::tearDown();
    }

    public function test_store_barang_with_multiple_fotos(): void
    {
        $user = User::factory()->create();
        $merk = Merk::create(['merk' => 'Canon']);
        $kategori = Kategori::create(['kategori' => 'Kamera']);

        $response = $this->actingAs($user)->postJson(route('barang.store'), [
            'nama_barang' => 'Kamera EOS',
            'id_merk' => $merk->id,
            'id_kategori' => $kategori->id,
            'harga_sewa' => 150000,
            'foto' => [
                UploadedFile::fake()->image('depan.jpg'),
                UploadedFile::fake()->image('belakang.jpg'),
            ],
        ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        $barang = Barang::first();
        $this->assertNotNull($barang);
        $this->assertSame(0, (int) $barang->stok);
        $this->assertSame(2, FotoBarang::where('id_barang', $barang->id)->count());

        foreach (FotoBarang::all() as $foto) {
            $path = public_path('assets/barang/'.$foto->foto);
            $this->files[] = $path;
            $this->assertFileExists($path);
        }
    }

    public function test_store_barang_requires_at_least_one_foto(): void
    {
        $user = User::factory()->create();
        $merk = Merk::create(['merk' => 'Sony']);
        $kategori = Kategori::create(['kategori' => 'Kamera']);

        $response = $this->actingAs($user)->postJson(route('barang.store'), [
            'nama_barang' => 'Tanpa Foto',
            'id_merk' => $merk->id,
            'id_kategori' => $kategori->id,
            'harga_sewa' => 10000,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['foto']);
    }

    public function test_update_barang_removes_unselected_fotos(): void
    {
        $user = User::factory()->create();
        $merk = Merk::create(['merk' => 'Sony']);
        $kategori = Kategori::create(['kategori' => 'Kamera']);

        $this->actingAs($user)->postJson(route('barang.store'), [
            'nama_barang' => 'Kamera Sony',
            'id_merk' => $merk->id,
            'id_kategori' => $kategori->id,
            'harga_sewa' => 10000,
            'foto' => [
                UploadedFile::fake()->image('satu.jpg'),
                UploadedFile::fake()->image('dua.jpg'),
            ],
        ])->assertOk();

        $barang = Barang::first();
        $created = FotoBarang::where('id_barang', $barang->id)->orderBy('id')->get();
        $this->files = $created->map(fn ($f) => public_path('assets/barang/'.$f->foto))->all();

        $keptFoto = $created->first()->foto;
        $removedFoto = $created->last()->foto;

        $response = $this->actingAs($user)->putJson(route('barang.update', $barang->id), [
            'nama_barang' => 'Kamera Sony',
            'id_merk' => $merk->id,
            'id_kategori' => $kategori->id,
            'harga_sewa' => 250000,
            'existing_foto' => [$created->first()->id],
        ]);

        $response->assertOk()->assertJson(['status' => 'success']);

        $remaining = FotoBarang::where('id_barang', $barang->id)->get();
        $this->assertCount(1, $remaining);
        $this->assertSame($keptFoto, $remaining->first()->foto);
        $this->assertFileExists(public_path('assets/barang/'.$remaining->first()->foto));
        $this->assertFileDoesNotExist(public_path('assets/barang/'.$removedFoto));
        $this->assertSame(0, (int) $barang->fresh()->stok);
    }

    public function test_store_barang_requires_merk_dan_kategori(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('barang.store'), [
            'nama_barang' => 'Tanpa Data Pendukung',
            'harga_sewa' => 10000,
            'foto' => [UploadedFile::fake()->image('satu.jpg')],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors([
            'id_merk',
            'id_kategori',
        ]);
    }

    public function test_update_barang_requires_at_least_one_foto(): void
    {
        $user = User::factory()->create();
        $merk = Merk::create(['merk' => 'Canon']);
        $kategori = Kategori::create(['kategori' => 'Kamera']);

        $this->actingAs($user)->postJson(route('barang.store'), [
            'nama_barang' => 'Kamera Canon',
            'id_merk' => $merk->id,
            'id_kategori' => $kategori->id,
            'harga_sewa' => 10000,
            'foto' => [UploadedFile::fake()->image('satu.jpg')],
        ])->assertOk();

        $barang = Barang::first();
        $created = FotoBarang::where('id_barang', $barang->id)->get();
        $this->files = $created->map(fn ($f) => public_path('assets/barang/'.$f->foto))->all();

        $response = $this->actingAs($user)->putJson(route('barang.update', $barang->id), [
            'nama_barang' => 'Kamera Canon',
            'id_merk' => $merk->id,
            'id_kategori' => $kategori->id,
            'harga_sewa' => 10000,
            'existing_foto' => [],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['foto']);
        $this->assertSame(1, FotoBarang::where('id_barang', $barang->id)->count());
    }

    public function test_store_barang_formats_harga_sewa_with_dot_separator(): void
    {
        $user = User::factory()->create();
        $merk = Merk::create(['merk' => 'Canon']);
        $kategori = Kategori::create(['kategori' => 'Kamera']);

        $this->actingAs($user)->postJson(route('barang.store'), [
            'nama_barang' => 'Kamera EOS',
            'id_merk' => $merk->id,
            'id_kategori' => $kategori->id,
            'harga_sewa' => '150.000',
            'foto' => [UploadedFile::fake()->image('satu.jpg')],
        ])->assertOk();

        $barang = Barang::first();
        $foto = FotoBarang::where('id_barang', $barang->id)->first();
        $this->files[] = public_path('assets/barang/'.$foto->foto);

        $this->assertSame(150000.0, (float) $barang->harga_sewa);
    }
}
