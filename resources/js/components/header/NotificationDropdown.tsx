import { useEffect, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import { cn } from "@/utils";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Modal } from "../ui/modal";

interface NotifItem {
  id: string;
  kategori: string;
  judul: string;
  pesan: string;
  waktu: string;
  tipe: "danger" | "warning" | "info" | "success";
  url: string;
  target_menu: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifList, setNotifList] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter & Search untuk DataTable di Modal
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState<string>("Semua");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/admin/notifications");
      if (res.data?.status === "success") {
        setNotifList(res.data.data ?? []);
      }
    } catch (err) {
      console.error("Gagal memuat notifikasi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleOpenModal = () => {
    closeDropdown();
    setIsModalOpen(true);
  };

  const handleGoTo = (url: string) => {
    closeDropdown();
    setIsModalOpen(false);
    router.visit(url);
  };

  const filteredNotifs = notifList.filter((item) => {
    const matchKategori = filterKategori === "Semua" || item.kategori === filterKategori;
    const matchSearch =
      item.judul.toLowerCase().includes(search.toLowerCase()) ||
      item.pesan.toLowerCase().includes(search.toLowerCase()) ||
      item.kategori.toLowerCase().includes(search.toLowerCase());
    return matchKategori && matchSearch;
  });

  const totalPages = Math.ceil(filteredNotifs.length / perPage) || 1;
  const paginatedNotifs = filteredNotifs.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <div className="relative">
      <button
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
        title="Notifikasi"
      >
        {notifList.length > 0 && (
          <span className="absolute -top-1 -end-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white shadow-sm">
            {notifList.length > 99 ? "99+" : notifList.length}
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -inset-s-13.5 mt-4.25 flex max-h-120 w-87.5 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg sm:w-90.25 xl:inset-s-auto xl:inset-e-0 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h5 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Notifikasi
            </h5>
            {notifList.length > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                {notifList.length} baru
              </span>
            )}
          </div>
          <button
            onClick={closeDropdown}
            className="text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <ul className="flex max-h-80 flex-col overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {notifList.length === 0 ? (
            <li className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Tidak ada notifikasi baru
            </li>
          ) : (
            notifList.slice(0, 5).map((notif) => (
              <li key={notif.id}>
                <DropdownItem
                  onItemClick={() => handleGoTo(notif.url)}
                  className="flex flex-col gap-1 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                        notif.tipe === "danger"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      )}
                    >
                      {notif.kategori}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {notif.waktu}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {notif.judul}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {notif.pesan}
                  </div>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>

        <button
          type="button"
          onClick={handleOpenModal}
          className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750"
        >
          Lihat Semua Notifikasi
        </button>
      </Dropdown>

      {/* Modal Big: Datatable Notifikasi */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-4xl p-6"
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Semua Notifikasi
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Daftar pengembalian melewati batas waktu dan transaksi yang butuh persetujuan owner
            </p>
          </div>
        </div>

        {/* Toolbar Filter & Search */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <select
              value={filterKategori}
              onChange={(e) => {
                setFilterKategori(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Pengembalian">Pengembalian Telat</option>
              <option value="Pembelian Unit">Pembelian Unit (Pending)</option>
              <option value="Perawatan">Perawatan (Pending)</option>
            </select>

            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value={5}>5 per hal</option>
              <option value={10}>10 per hal</option>
              <option value={25}>25 per hal</option>
            </select>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari notifikasi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
          </div>
        </div>

        {/* Table Notifikasi */}
        <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
            <thead className="sticky top-0 bg-gray-50 text-[11px] font-semibold uppercase text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Judul & Keterangan</th>
                <th className="px-4 py-3">Tanggal / Waktu</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedNotifs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Tidak ada notifikasi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedNotifs.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-gray-500">
                      {(currentPage - 1) * perPage + idx + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          item.tipe === "danger"
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        )}
                      >
                        {item.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {item.judul}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {item.pesan}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {item.waktu}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleGoTo(item.url)}
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none"
                      >
                        Ke Menu {item.target_menu}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredNotifs.length > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {Math.min((currentPage - 1) * perPage + 1, filteredNotifs.length)} -{" "}
              {Math.min(currentPage * perPage, filteredNotifs.length)} dari {filteredNotifs.length} data
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
              >
                Sebelumnya
              </button>
              <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
