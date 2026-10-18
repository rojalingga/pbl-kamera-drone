<?php

namespace App\Http\Controllers\Pengaturan;

use App\Http\Controllers\Controller;
use App\Models\HakAkses;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class PenggunaController extends Controller
{
    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = User::with('role')->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('role', fn ($row) => $row->role?->role ?? '-')
                ->editColumn('status', fn ($row) => (int) $row->status)
                ->make(true);
        }

        $roles = Role::orderBy('role')->get();

        return Inertia::render('Admin/Pengaturan/Pengguna/Index', compact('permissions', 'roles'));
    }

    public function edit($id)
    {
        $data = User::findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_lengkap' => 'required|string|max:150',
            'username' => 'required|unique:users,username',
            'password' => 'required|min:5',
            'id_role' => 'required|integer|exists:roles,id',
            'status' => 'required|integer',
            'foto' => 'nullable|file|mimes:jpeg,png,jpg',
        ], [
            'nama_lengkap.required' => 'Nama lengkap wajib diisi.',
            'username.required' => 'Username wajib diisi.',
            'username.unique' => 'Username sudah digunakan.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 5 karakter.',
            'id_role.required' => 'Role wajib dipilih.',
            'status.required' => 'Status harus dipilih.',
            'foto.mimes' => 'Foto harus berformat jpeg, png, atau jpg.',
        ]);

        DB::beginTransaction();
        try {
            $foto = '';

            if ($request->hasFile('foto')) {
                $file = $request->file('foto');
                $filename = Str::random(25).'.'.$file->getClientOriginalExtension();
                $file->move($this->direktoriFoto(), $filename);
                $foto = $filename;
            }

            $user = User::create([
                'nama_lengkap' => $request->nama_lengkap,
                'username' => $request->username,
                'password' => Hash::make($request->password),
                'id_role' => $request->id_role,
                'status' => $request->status,
                'foto' => $foto,
            ]);

            $dataHakAkses = RoleUser::where('id_role', $request->id_role)
                ->get()
                ->map(fn ($roleMenu) => [
                    'id_user' => $user->id,
                    'id_menu' => $roleMenu->id_menu,
                    'lihat' => $roleMenu->lihat,
                    'tambah' => $roleMenu->tambah,
                    'edit' => $roleMenu->edit,
                    'hapus' => $roleMenu->hapus,
                ])
                ->toArray();

            if ($dataHakAkses !== []) {
                HakAkses::insert($dataHakAkses);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating pengguna: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = User::findOrFail($id);

        $request->validate([
            'nama_lengkap' => 'required|string|max:150',
            'username' => 'required|unique:users,username,'.$data->id.',id',
            'password' => 'nullable|min:5',
            'id_role' => 'required|integer|exists:roles,id',
            'status' => 'required|integer',
            'foto' => 'nullable|file|mimes:jpeg,png,jpg',
        ], [
            'nama_lengkap.required' => 'Nama lengkap wajib diisi.',
            'username.required' => 'Username wajib diisi.',
            'username.unique' => 'Username sudah digunakan.',
            'password.min' => 'Password minimal 5 karakter.',
            'id_role.required' => 'Role wajib dipilih.',
            'status.required' => 'Status harus dipilih.',
            'foto.mimes' => 'Foto harus berformat jpeg, png, atau jpg.',
        ]);

        DB::beginTransaction();
        try {
            $db = [
                'nama_lengkap' => $request->nama_lengkap,
                'username' => $request->username,
                'id_role' => $request->id_role,
                'status' => $request->status,
            ];

            if (! empty($request->password)) {
                $db['password'] = Hash::make($request->password);
            }

            if ($request->hasFile('foto')) {
                if (! empty($data->foto) && file_exists(public_path('assets/pengguna/'.$data->foto))) {
                    unlink(public_path('assets/pengguna/'.$data->foto));
                }

                $file = $request->file('foto');
                $filename = Str::random(25).'.'.$file->getClientOriginalExtension();
                $file->move($this->direktoriFoto(), $filename);
                $db['foto'] = $filename;
            }

            $data->update($db);

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating pengguna: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $data = User::findOrFail($id);

        if ((int) $data->id === Auth::id()) {
            return response()->json([
                'status' => 'error',
                'error' => 'Tidak dapat menghapus akun yang sedang digunakan.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            if (! empty($data->foto) && file_exists(public_path('assets/pengguna/'.$data->foto))) {
                unlink(public_path('assets/pengguna/'.$data->foto));
            }

            HakAkses::where('id_user', $data->id)->delete();
            $data->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting pengguna: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    private function direktoriFoto(): string
    {
        $direktori = public_path('assets/pengguna');

        if (! is_dir($direktori)) {
            mkdir($direktori, 0755, true);
        }

        return $direktori;
    }
}
