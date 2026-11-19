<?php

namespace App\Http\Controllers;

use App\Http\Middleware\SetMenuSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function getLogin(): Response
    {
        return Inertia::render('Auth/AdminLogin');
    }

    public function postLogin(Request $request)
    {
        $request->validate([
            'username' => 'required|exists:users,username',
            'password' => 'required',
        ], [
            'username.required' => 'Username wajib diisi.',
            'usernamecomposer.exists' => 'User tidak ditemukan.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $user = User::where('username', $request->username)->first();

        if ($user && $user->status == 0) {
            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => [
                        'username' => ['Akun ini telah diblokir.'],
                    ],
                ], 422);
            }

            return back()->withErrors(['username' => 'Akun ini telah diblokir.']);
        }

        if (! Auth::attempt(['username' => $request->username, 'password' => $request->password])) {
            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => [
                        'password' => ['Password salah.'],
                    ],
                ], 422);
            }

            return back()->withErrors(['password' => 'Password salah.']);
        }

        $request->session()->regenerate();

        SetMenuSession::flush();
        $request->session()->forget('url.intended');

        $redirectUrl = SetMenuSession::firstUrlFor((int) $user->id);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['redirect' => $redirectUrl]);
        }

        return redirect($redirectUrl);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home')->with('success', 'Logout Berhasil.');
    }
}
