import React, { useState, useEffect, useCallback } from "react";
import { Head, router } from "@inertiajs/react";
import axios from "axios";
import AppLayout from "@/layout/AppLayout";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TableFilterToolbar from "@/components/common/TableFilterToolbar";
import TablePagination from "@/components/common/TablePagination";
import { Permissions } from "@/types";
import { notifyError, notifySuccess } from "@/utils/toast";

interface UserItem {
  id: number;
  username: string;
  nama_lengkap?: string | null;
}

interface MenuFlag {
  lihat: number;
  tambah: number;
  edit: number;
  hapus: number;
}

interface MatricRow {
  id: number;
  DT_RowIndex?: number;
  id_user: number;
  id_menu: number;
  lihat: number;
  tambah: number;
  edit: number;
  hapus: number;
  induk_menu: string;
  title: string;
  route_name: string;
  menu_flag: MenuFlag;
}

interface IndexProps {
  permissions: Permissions;
  users: UserItem[];
}

type IzinKolom = "lihat" | "tambah" | "edit" | "hapus";

const KOLOM: { key: IzinKolom; label: string }[] = [
  { key: "lihat", label: "Lihat" },
  { key: "tambah", label: "Tambah" },
  { key: "edit", label: "Edit" },
  { key: "hapus", label: "Hapus" },
];

export default function HakAksesIndex({ permissions, users }: IndexProps) {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [rows, setRows] = useState<MatricRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const bolehUbah = permissions?.edit === 1;

  const fetchData = useCallback(async (idUser: string) => {
    if (!idUser) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get("/admin/pengaturan/get-hak-akses", {
        params: { id_user: idUser },
      });

      if (response.data && response.data.data) {
        setRows(response.data.data);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error("Gagal memuat data hak akses:", err);
      notifyError("Gagal memuat data hak akses!");

      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedUser);
    setSearch("");
    setCurrentPage(1);
  }, [selectedUser, fetchData]);

  const filteredData = rows.filter((item) => {
    const keyword = search.toLowerCase();
    if (!keyword) {
      return true;
    }

    return [item.induk_menu, item.title, item.route_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const toggleIzin = (idMenu: number, kolom: IzinKolom) => {
    if (!bolehUbah) {
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id_menu === idMenu
          ? { ...row, [kolom]: row[kolom] ? 0 : 1 }
          : row
      )
    );
  };

  const renderCheckbox = (row: MatricRow, kolom: IzinKolom) => {
    if (!row.menu_flag || Number(row.menu_flag[kolom]) !== 1) {
      return <span className="text-gray-300 dark:text-gray-600">-</span>;
    }

    return (
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={Number(row[kolom]) === 1}
          disabled={!bolehUbah}
          onChange={() => toggleIzin(row.id_menu, kolom)}
          className="size-4 cursor-pointer rounded border-gray-300 bg-transparent text-brand-500 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
        />
      </div>
    );
  };

  const handleSave = async () => {
    if (!selectedUser || !bolehUbah) {
      return;
    }

    setIsSaving(true);

    const hakAksesData: Record<IzinKolom, Record<string, number>> = {
      lihat: {},
      tambah: {},
      edit: {},
      hapus: {},
    };

    rows.forEach((row) => {
      hakAksesData.lihat[row.id_menu] = Number(row.lihat) || 0;
      hakAksesData.tambah[row.id_menu] = Number(row.tambah) || 0;
      hakAksesData.edit[row.id_menu] = Number(row.edit) || 0;
      hakAksesData.hapus[row.id_menu] = Number(row.hapus) || 0;
    });

    try {
      const response = await axios.put("/admin/pengaturan/update-hak-akses", {
        id_user: Number(selectedUser),
        hak_akses_data: hakAksesData,
      });

      if (response.data && response.data.success) {
        notifySuccess("Berhasil!", response.data.message || "Hak akses telah diperbarui.");

        if (response.data.menus_changed) {
          router.reload({ only: ["auth"] });
        }

        fetchData(selectedUser);
      }
    } catch (err: any) {
      notifyError(err.response?.data?.message || err.response?.data?.error || "Gagal menyimpan hak akses!");

    } finally {
      setIsSaving(false);
    }
  };

  const userOptions = users.map((user) => ({
    value: String(user.id),
    label: user.nama_lengkap
      ? `${user.nama_lengkap} (${user.username})`
      : user.username,
  }));

  const selectedUsername =
    users.find((user) => String(user.id) === selectedUser)?.username ??
    "pengguna terpilih";

  return (
    <AppLayout>
      <Head title="Pengaturan Hak Akses - Admin" />
      <PageBreadcrumb parent="Pengaturan" pageTitle="Hak Akses" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">

        <div className="border-b border-gray-200 p-5 sm:p-6 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Hak Akses Pengguna
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Atur izin menu (lihat, tambah, edit, hapus) untuk tiap pengguna.
          </p>
        </div>

        <div className="grid gap-5 border-b border-gray-200 p-5 sm:grid-cols-2 sm:p-6 dark:border-gray-800">
          <div className="space-y-2">
            <Label htmlFor="pilih-pengguna">Pilih Pengguna</Label>
            <Select
              id="pilih-pengguna"
              options={userOptions}
              placeholder="- Pilih Pengguna -"
              value={selectedUser}
              onChange={(val) => setSelectedUser(val)}
            />
          </div>

          <div className="flex items-end">
            {!bolehUbah && (
              <p className="rounded-lg border border-warning-300 bg-warning-50 px-4 py-2.5 text-sm text-warning-600 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
                Anda tidak memiliki izin untuk mengubah hak akses.
              </p>
            )}
          </div>
        </div>

        <TableFilterToolbar
          search={search}
          perPage={perPage}
          placeholder="Cari menu..."
          setSearch={setSearch}
          setPerPage={setPerPage}
          setCurrentPage={setCurrentPage}
          bordered
        />

        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Induk Menu</th>
                <th className="px-6 py-4">Judul Menu</th>
                {KOLOM.map((kolom) => (
                  <th key={kolom.key} className="px-6 py-4 w-24 text-center">
                    {kolom.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-7 animate-spin rounded-full border-3 border-brand-500 border-t-transparent"></div>
                      <span className="text-xs">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {!selectedUser
                      ? "Pilih pengguna terlebih dahulu untuk menampilkan daftar menu."
                      : search
                        ? "Tidak ditemukan menu yang sesuai pencarian."
                        : "Belum ada data menu untuk pengguna ini."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => {
                  const itemIndex = (currentPage - 1) * perPage + index + 1;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/3 transition-colors"
                    >
                      <td className="px-6 py-3 text-center font-medium text-gray-600 dark:text-gray-400">
                        {itemIndex}
                      </td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                        {row.induk_menu ?? "-"}
                      </td>
                      <td className="px-6 py-3 font-semibold text-gray-800 dark:text-white/90">
                        {row.title ?? "-"}
                      </td>
                      {KOLOM.map((kolom) => (
                        <td key={kolom.key} className="px-6 py-3 text-center">
                          {renderCheckbox(row, kolom.key)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          perPage={perPage}
          setCurrentPage={setCurrentPage}
          unitLabel="menu"
          labelSuffix={selectedUser ? ` untuk ${selectedUsername}` : ""}
          navClassName="flex flex-wrap items-center justify-center gap-2"
        >
          {bolehUbah && (
            <button
              onClick={handleSave}
              disabled={!selectedUser || isSaving || rows.length === 0}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none"
            >
              {isSaving && (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isSaving ? "Menyimpan..." : "Simpan Hak Akses"}
            </button>
          )}
        </TablePagination>
      </div>
    </AppLayout>
  );
}
