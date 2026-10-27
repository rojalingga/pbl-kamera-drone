<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomerAuthController extends Controller
{
    public function postLogin(Request $request): JsonResponse
    {
        $request->merge(['no_hp' => Customer::normalisasiNoHp($request->input('no_hp'))]);

        $request->validate([
            'no_hp' => ['required', 'string', 'regex:'.Customer::POLA_NO_HP],
            'password' => ['required', 'string'],
        ], [
            'no_hp.required' => 'Nomor WhatsApp / HP wajib diisi.',
            'no_hp.regex' => 'Format nomor WhatsApp / HP tidak valid. Harus diawali 08, contoh: 081234567890.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $noHp = (string) $request->no_hp;

        if (! Customer::where('no_hp', $noHp)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Nomor WhatsApp / HP tidak terdaftar.',
                'errors' => [
                    'no_hp' => ['Nomor WhatsApp / HP tidak terdaftar.'],
                ],
            ], 422);
        }

        if (! Auth::guard('customer')->attempt(['no_hp' => $noHp, 'password' => (string) $request->password], false)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Password salah.',
                'errors' => [
                    'password' => ['Password salah.'],
                ],
            ], 422);
        }

        $request->session()->regenerate();

        /** @var Customer $customer */
        $customer = Auth::guard('customer')->user();

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil.',
            'customer' => [
                'id' => $customer->id,
                'nama_lengkap' => $customer->nama_lengkap,
                'no_hp' => $customer->no_hp,
            ],
        ]);
    }

    public function postRegister(Request $request): JsonResponse
    {
        $request->merge(['no_hp' => Customer::normalisasiNoHp($request->input('no_hp'))]);

        $request->validate([
            'nama_lengkap' => ['required', 'string', 'max:150'],
            'no_hp' => ['required', 'string', 'max:20', 'regex:'.Customer::POLA_NO_HP, 'unique:customer,no_hp'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'nama_lengkap.required' => 'Nama lengkap wajib diisi.',
            'nama_lengkap.max' => 'Nama lengkap maksimal 150 karakter.',
            'no_hp.required' => 'Nomor WhatsApp / HP wajib diisi.',
            'no_hp.max' => 'Nomor WhatsApp / HP maksimal 20 karakter.',
            'no_hp.regex' => 'Format nomor WhatsApp / HP tidak valid. Harus diawali 08, contoh: 081234567890.',
            'no_hp.unique' => 'Nomor WhatsApp / HP sudah terdaftar. Silakan masuk.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 6 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ]);

        $customer = Customer::create([
            'nama_lengkap' => trim((string) $request->nama_lengkap),
            'no_hp' => (string) $request->no_hp,
            'password' => (string) $request->password,
        ]);

        Auth::guard('customer')->login($customer);
        $request->session()->regenerate();

        return response()->json([
            'status' => 'success',
            'message' => 'Pendaftaran berhasil.',
            'customer' => [
                'id' => $customer->id,
                'nama_lengkap' => $customer->nama_lengkap,
                'no_hp' => $customer->no_hp,
            ],
        ]);
    }

    public function postLogout(Request $request): JsonResponse|RedirectResponse
    {
        Auth::guard('customer')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['status' => 'success', 'message' => 'Logout berhasil.']);
        }

        return redirect()->route('home')->with('success', 'Logout berhasil.');
    }

    public function me(): JsonResponse
    {
        $customer = Auth::guard('customer')->user();

        return response()->json([
            'authenticated' => $customer !== null,
            'customer' => $customer ? [
                'id' => $customer->id,
                'nama_lengkap' => $customer->nama_lengkap,
                'no_hp' => $customer->no_hp,
            ] : null,
        ]);
    }
}
