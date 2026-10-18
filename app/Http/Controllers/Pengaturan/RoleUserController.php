<?php

namespace App\Http\Controllers\Pengaturan;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Role;
use App\Models\RoleUser;
use Illuminate\Http\Request;
use Yajra\DataTables\Facades\DataTables;

class RoleUserController extends Controller
{
    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        $roles = Role::select('id', 'role')->get();

        return view('admin.pengaturan.role_user.index', compact('permissions', 'roles'));
    }

    public function getRoleUser(Request $request)
    {
        if (! $request->has('id_role') || empty($request->id_role)) {
            return response()->json(['data' => []]);
        }

        $permissions = $request->permissions ?? ['edit' => 1];

        $this->generateRoleUser($request->id_role);

        $roleUser = RoleUser::with('menu')
            ->where('id_role', $request->id_role)
            ->get();

        $sorted = collect();

        $induk = $roleUser->filter(fn ($row) => $row->menu && $row->menu->id_parent == 0)
            ->sortBy(fn ($row) => $row->menu->urutan ?? 0);

        foreach ($induk as $indukItem) {
            $sorted->push($indukItem);

            $anak = $roleUser->filter(fn ($row) => $row->menu && $row->menu->id_parent == $indukItem->id_menu)
                ->sortBy(fn ($row) => $row->menu->urutan ?? 0);

            foreach ($anak as $anakItem) {
                $sorted->push($anakItem);
            }
        }

        return DataTables::of($sorted)
            ->addIndexColumn()
            ->addColumn('induk_menu', function ($row) {
                if (! $row->menu) {
                    return '-';
                }

                return $row->menu->id_parent == 0 ? 'Induk' : Menu::find($row->menu->id_parent)?->title ?? 'Induk';
            })
            ->addColumn('title', fn ($row) => $row->menu->title ?? '-')
            ->addColumn('route_name', fn ($row) => $row->menu->route_name ?? '-')
            ->addColumn('lihat', fn ($row) => $this->checkbox($row, 'lihat', $permissions))
            ->addColumn('tambah', fn ($row) => $this->checkbox($row, 'tambah', $permissions))
            ->addColumn('edit', fn ($row) => $this->checkbox($row, 'edit', $permissions))
            ->addColumn('hapus', fn ($row) => $this->checkbox($row, 'hapus', $permissions))
            ->rawColumns(['induk_menu', 'title', 'route_name', 'lihat', 'tambah', 'edit', 'hapus'])
            ->make(true);
    }

    public function updateRoleUser(Request $request)
    {
        $hakAksesData = $request->hak_akses_data;

        if (empty($hakAksesData)) {
            return response()->json(['success' => false, 'message' => 'Data tidak lengkap.'], 422);
        }

        $ids = collect($hakAksesData)
            ->map(fn ($item) => array_keys($item))
            ->flatten()
            ->unique();

        foreach ($ids as $id) {
            $hakAkses = RoleUser::find($id);

            if (! $hakAkses) {
                continue;
            }

            $hakAkses->lihat = $hakAksesData['lihat'][$id] ?? 0;
            $hakAkses->tambah = $hakAksesData['tambah'][$id] ?? 0;
            $hakAkses->edit = $hakAksesData['edit'][$id] ?? 0;
            $hakAkses->hapus = $hakAksesData['hapus'][$id] ?? 0;
            $hakAkses->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Role User telah diperbarui.',
        ]);
    }

    private function generateRoleUser($idRole)
    {
        $existingMenu = RoleUser::where('id_role', $idRole)->pluck('id_menu')->toArray();
        $missingMenus = Menu::whereNotIn('id', $existingMenu)->get();

        foreach ($missingMenus as $menu) {
            RoleUser::create([
                'id_role' => (int) $idRole,
                'id_menu' => $menu->id,
                'lihat' => 1,
                'tambah' => 0,
                'edit' => 0,
                'hapus' => 0,
            ]);
        }
    }

    private function checkbox($row, $column, $permissions)
    {
        if (! $row->menu || $row->menu->$column == 0) {
            return '';
        }

        $checked = $row->$column == 1 ? 'checked' : '';
        $disabled = ($permissions['edit'] ?? 1) == 0 ? 'disabled' : '';

        return "<div class='text-center'><input type='checkbox' class='form-check-input' name='{$column}[{$row->id}]' $checked $disabled></div>";
    }
}
