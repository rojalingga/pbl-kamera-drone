<?php

namespace Database\Seeders;

use App\Models\Barang;
use App\Models\Customer;
use App\Models\Keranjang;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class KeranjangSeeder extends Seeder
{
    public function run(): void
    {
        $customer = Customer::where('nama_lengkap', 'Siti Aminah')->first();
        if (! $customer) {
            return;
        }

        $barang1 = Barang::where('nama_barang', 'Canon EOS R6 Mark II Body Only')->first();
        $barang2 = Barang::where('nama_barang', 'DJI Air 3 Fly More Combo (DJI RC 2)')->first();

        $tglMulai = Carbon::now()->addDays(3)->toDateString();
        $tglSelesai = Carbon::now()->addDays(5)->toDateString();

        if ($barang1) {
            Keranjang::firstOrCreate(
                [
                    'id_customer' => $customer->id,
                    'id_barang' => $barang1->id,
                ],
                [
                    'qty' => 1,
                    'tgl_sewa' => $tglMulai,
                    'tgl_akhir_sewa' => $tglSelesai,
                ]
            );
        }

        if ($barang2) {
            Keranjang::firstOrCreate(
                [
                    'id_customer' => $customer->id,
                    'id_barang' => $barang2->id,
                ],
                [
                    'qty' => 1,
                    'tgl_sewa' => $tglMulai,
                    'tgl_akhir_sewa' => $tglSelesai,
                ]
            );
        }
    }
}
