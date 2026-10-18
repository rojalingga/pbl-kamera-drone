<?php

namespace App\Http\Controllers\Pengaturan;

use App\Http\Controllers\Controller;
use App\Http\Middleware\SetMenuSession;
use App\Models\HakAkses;
use App\Models\Menu;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class HakAksesController extends Controller
{
    public static function getUserPermissions()
    {
        $routeName = request()->route()?->getName();
        $userId = Auth::id();

        $menu = $routeName ? Menu::where('route_name', $routeName)->first() : null;

        if ($menu) {
            $hakAkses = HakAkses::where('id_user', $userId)
                ->where('id_menu', $menu->id)
                ->first();

            return [
                'lihat' => $hakAkses?->lihat ?? 0,
                'tambah' => $hakAkses?->tambah ?? 0,
                'edit' => $hakAkses?->edit ?? 0,
                'hapus' => $hakAkses?->hapus ?? 0,
            ];
        }

        return [
            'lihat' => 0,
            'tambah' => 0,
            'edit' => 0,
            'hapus' => 0,
        ];
    }

    public function index(Request $request)
    {
        $permissions = self::getUserPermissions();

        $users = User::select('id', 'username', 'nama_lengkap')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('Admin/Pengaturan/HakAkses/Index', compact('users', 'permissions'));
    }

    private function generateHakAkses($id)
    {
        $user = User::find($id);

        if (! $user) {
            return;
        }

        $existingMenu = HakAkses::where('id_user', $user->id)->pluck('id_menu')->toArray();
        $missingMenus = Menu::whereNotIn('id', $existingMenu)->get();

        foreach ($missingMenus as $menu) {
            HakAkses::create([
                'id_user' => $user->id,
                'id_menu' => $menu->id,
                'lihat' => 1,
                'tambah' => 0,
                'edit' => 0,
                'hapus' => 0,
            ]);
        }
    }

    public function getHakAkses(Request $request)
    {
        if (! $request->has('id_user') || empty($request->id_user)) {
            return response()->json(['data' => []]);
        }

        $this->generateHakAkses($request->id_user);

        $hakAkses = HakAkses::with('menu')
            ->where('id_user', $request->id_user)
            ->get();

        $sorted = $this->sortMenu($hakAkses);

        return DataTables::of($sorted)->escapeColumns([])
            ->addIndexColumn()
            ->addColumn('induk_menu', function ($row) {
                if (! $row->menu) {
                    return '-';
                }

                return $row->menu->id_parent == 0 ? 'Induk' : Menu::find($row->menu->id_parent)?->title ?? 'Induk';
            })
            ->addColumn('title', fn ($row) => $row->menu->title ?? '-')
            ->addColumn('route_name', fn ($row) => $row->menu->route_name ?? '-')
            ->addColumn('menu_flag', fn ($row) => [
                'lihat' => (int) ($row->menu->lihat ?? 0),
                'tambah' => (int) ($row->menu->tambah ?? 0),
                'edit' => (int) ($row->menu->edit ?? 0),
                'hapus' => (int) ($row->menu->hapus ?? 0),
            ])
            ->editColumn('lihat', fn ($row) => (int) $row->lihat)
            ->editColumn('tambah', fn ($row) => (int) $row->tambah)
            ->editColumn('edit', fn ($row) => (int) $row->edit)
            ->editColumn('hapus', fn ($row) => (int) $row->hapus)
            ->make(true);
    }

    public function updateHakAkses(Request $request)
    {
        $hakAksesData = $request->hak_akses_data;
        $idUser = $request->id_user;

        if (empty($hakAksesData) || empty($idUser)) {
            return response()->json(['success' => false, 'message' => 'Data tidak lengkap.'], 422);
        }

        $menuIds = collect($hakAksesData)
            ->map(fn ($item) => array_keys($item))
            ->flatten()
            ->unique();

        foreach ($menuIds as $menuId) {
            HakAkses::updateOrCreate(
                [
                    'id_user' => $idUser,
                    'id_menu' => $menuId,
                ],
                [
                    'lihat' => $hakAksesData['lihat'][$menuId] ?? 0,
                    'tambah' => $hakAksesData['tambah'][$menuId] ?? 0,
                    'edit' => $hakAksesData['edit'][$menuId] ?? 0,
                    'hapus' => $hakAksesData['hapus'][$menuId] ?? 0,
                ]
            );
        }

        $menusBerubah = false;

        if ((int) $idUser === (int) Auth::id()) {
            $sebelum = SetMenuSession::fingerprint(session(SetMenuSession::SESSION_KEY));
            $sesudah = SetMenuSession::fingerprint(SetMenuSession::refresh((int) $idUser));

            $menusBerubah = $sebelum !== $sesudah;
        }

        return response()->json([
            'success' => true,
            'message' => 'Hak Akses telah diperbarui.',
            'menus_changed' => $menusBerubah,
        ]);
    }

    private function sortMenu($hakAkses)
    {
        $sorted = collect();

        $induk = $hakAkses->filter(fn ($row) => $row->menu && $row->menu->id_parent == 0)
            ->sortBy(fn ($row) => $row->menu->urutan ?? 0);

        foreach ($induk as $indukItem) {
            $sorted->push($indukItem);

            $anak = $hakAkses->filter(fn ($row) => $row->menu && $row->menu->id_parent == $indukItem->id_menu)
                ->sortBy(fn ($row) => $row->menu->urutan ?? 0);

            foreach ($anak as $anakItem) {
                $sorted->push($anakItem);
            }
        }

        return $sorted;
    }
}
