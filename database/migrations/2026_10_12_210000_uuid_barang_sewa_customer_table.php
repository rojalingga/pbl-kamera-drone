<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Ubah primary key `barang`, `sewa`, dan `customer` dari bigint auto-increment
 * menjadi UUID char(36). Nama kolom tetap `id`; seluruh kolom relasi ikut
 * diubah dan datanya di-backfill langsung di database.
 *
 * Tabel induk tidak punya foreign key sehingga kolom `id` lama aman dihapus.
 */
return new class extends Migration
{
    /**
     * Tabel induk yang primary key-nya berubah menjadi UUID.
     *
     * @var list<string>
     */
    private const PARENTS = ['barang', 'sewa', 'customer'];

    /**
     * Kolom relasi: [tabel, kolom, tabel induk].
     *
     * @var list<array{0: string, 1: string, 2: string}>
     */
    private const REFERENCES = [
        ['foto_barang', 'id_barang', 'barang'],
        ['pembelian_unit_detail', 'id_barang', 'barang'],
        ['pengadaan_barang_detail', 'id_barang', 'barang'],
        ['riwayat_stok', 'id_barang', 'barang'],
        ['sewa_detail', 'id_barang', 'barang'],
        ['sewa_detail', 'id_sewa', 'sewa'],
        ['pembayaran', 'id_sewa', 'sewa'],
        ['pengembalian', 'id_sewa', 'sewa'],
        ['pemasukan', 'id_sewa', 'sewa'],
        ['sewa', 'id_customer', 'customer'],
    ];

    /**
     * Definisi kolom relasi sebelum diubah (untuk menjaga NULL/NOT NULL & index).
     *
     * @var array<string, bool>
     */
    private const REFERENCE_NULLABLE = [
        'foto_barang.id_barang' => true,
        'pembelian_unit_detail.id_barang' => true,
        'pengadaan_barang_detail.id_barang' => false,
        'riwayat_stok.id_barang' => true,
        'sewa_detail.id_barang' => true,
        'sewa_detail.id_sewa' => true,
        'pembayaran.id_sewa' => true,
        'pengembalian.id_sewa' => true,
        'pemasukan.id_sewa' => true,
        'sewa.id_customer' => true,
    ];

    public function up(): void
    {
        $this->applyNonMysqlSchema();

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        foreach (self::PARENTS as $parent) {
            $this->addUuidColumn($parent);
            $this->backfillUuid($parent);
        }

        foreach (self::REFERENCES as [$table, $column]) {
            $this->widenReferenceColumn($table, $column);
        }

        foreach (self::REFERENCES as [$table, $column, $parent]) {
            $this->rewriteReferences($table, $column, $parent);
        }

        foreach (self::PARENTS as $parent) {
            $this->promoteUuidToPrimaryKey($parent);
        }
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Migrasi ini tidak dapat di-rollback: pemetaan integer -> UUID sudah dihapus. '
            .'Pulihkan dari backup database.'
        );
    }

    /**
     * Ubah tipe kolom untuk driver selain MySQL.
     *
     * Test suite memakai SQLite in-memory, jadi hanya tipe kolom yang perlu
     * disesuaikan; promosi primary key tetap memakai ALTER TABLE khusus MySQL.
     */
    private function applyNonMysqlSchema(): void
    {
        if (DB::getDriverName() === 'mysql') {
            return;
        }

        foreach (self::PARENTS as $parent) {
            if (! Schema::hasTable($parent)) {
                continue;
            }

            Schema::table($parent, function (Blueprint $table): void {
                $table->string('id', 36)->nullable(false)->default(null)->change();
            });
        }

        foreach (self::REFERENCES as [$table, $column]) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $nullable = self::REFERENCE_NULLABLE["{$table}.{$column}"];

            Schema::table($table, function (Blueprint $blueprint) use ($column, $nullable): void {
                $blueprint->char($column, 36)->nullable($nullable)->default(null)->change();
            });
        }
    }

    /**
     * Tambah kolom sementara `uuid_tmp` pada tabel induk.
     */
    private function addUuidColumn(string $parent): void
    {
        DB::statement("ALTER TABLE `{$parent}` ADD COLUMN `uuid_tmp` CHAR(36) NULL");
    }

    /**
     * Isi `uuid_tmp` dengan UUID baru untuk seluruh baris yang ada.
     */
    private function backfillUuid(string $parent): void
    {
        DB::table($parent)->orderBy('id')->select('id')->chunk(200, function ($rows) use ($parent): void {
            foreach ($rows as $row) {
                DB::table($parent)->where('id', $row->id)->update(['uuid_tmp' => (string) Str::uuid()]);
            }
        });
    }

    /**
     * Ubah kolom relasi ke CHAR(36). Nilai bigint lama tetap utuh sebagai digit,
     * sehingga pencocokan dengan tabel induk masih bisa dilakukan pada langkah berikutnya.
     */
    private function widenReferenceColumn(string $table, string $column): void
    {
        $nullable = self::REFERENCE_NULLABLE["{$table}.{$column}"] ? 'NULL' : 'NOT NULL';

        DB::statement("ALTER TABLE `{$table}` MODIFY COLUMN `{$column}` CHAR(36) {$nullable}");
    }

    /**
     * Salin UUID tabel induk ke kolom relasi berdasarkan nilai integer lama.
     *
     * Pemetaan dilakukan lewat PHP, bukan JOIN SQL, karena MySQL mengonversi
     * kolom CHAR ke DOUBLE saat dibandingkan dengan kolom BIGINT.
     * Baris yang isinya sudah berupa UUID dilewati agar idempoten.
     */
    private function rewriteReferences(string $table, string $column, string $parent): void
    {
        $mapping = DB::table($parent)->pluck('uuid_tmp', 'id');

        if ($mapping->isEmpty()) {
            return;
        }

        DB::table($table)
            ->whereNotNull($column)
            ->orderBy('id')
            ->select(['id', $column])
            ->chunk(200, function ($rows) use ($table, $column, $mapping): void {
                foreach ($rows as $row) {
                    $uuid = $mapping[(string) $row->{$column}] ?? null;

                    if ($uuid === null) {
                        continue;
                    }

                    DB::table($table)->where('id', $row->id)->update([$column => $uuid]);
                }
            });
    }

    /**
     * Jadikan kolom UUID sebagai primary key dan hapus kolom integer lama.
     */
    private function promoteUuidToPrimaryKey(string $parent): void
    {
        // AUTO_INCREMENT harus dilepas sebelum primary key bisa dibuang.
        DB::statement("ALTER TABLE `{$parent}` MODIFY COLUMN `id` BIGINT UNSIGNED NOT NULL");
        DB::statement("ALTER TABLE `{$parent}` DROP PRIMARY KEY");
        DB::statement("ALTER TABLE `{$parent}` DROP COLUMN `id`");
        DB::statement("ALTER TABLE `{$parent}` CHANGE COLUMN `uuid_tmp` `id` CHAR(36) NOT NULL");
        DB::statement("ALTER TABLE `{$parent}` ADD PRIMARY KEY (`id`)");
    }
};
