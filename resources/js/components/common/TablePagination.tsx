import type { ReactNode } from "react";
import { ChevronLeftIcon } from "@/icons";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  setCurrentPage: (value: number | ((prev: number) => number)) => void;

  unitLabel?: string;

  labelSuffix?: ReactNode;

  navClassName?: string;

  children?: ReactNode;
}

/**
 * Daftar nomor halaman untuk ditampilkan. Jika halaman terlalu banyak,
 * hanya tampilkan sebagian nomor di sekitar halaman aktif beserta gap "…"
 * supaya footer tabel tidak melebar melebihi card.
 *
 * @param  current  Halaman yang sedang aktif
 * @param  total    Jumlah halaman keseluruhan
 * @return Array nomor halaman, `"gap"` sebagai penanda elipsis
 */
const pageNumbers = (current: number, total: number): (number | "gap")[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);

  if (current <= 3) {
    [2, 3, 4].forEach((page) => pages.add(page));
  }

  if (current >= total - 2) {
    [total - 1, total - 2, total - 3].forEach((page) => pages.add(page));
  }

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  return sorted.reduce<(number | "gap")[]>((acc, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      acc.push("gap");
    }

    acc.push(page);

    return acc;
  }, []);
};

const TablePagination = ({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  setCurrentPage,
  unitLabel = "data",
  labelSuffix,
  navClassName = "flex items-center gap-2",
  children,
}: TablePaginationProps) => {
  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 p-5 sm:flex-row sm:p-6 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Menampilkan{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          {totalItems > 0 ? (currentPage - 1) * perPage + 1 : 0}
        </span>{" "}
        sampai{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          {Math.min(currentPage * perPage, totalItems)}
        </span>{" "}
        dari{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          {totalItems}
        </span>{" "}
        {unitLabel}
        {labelSuffix}
      </p>

      <div className={navClassName}>
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ChevronLeftIcon className="size-4" />
          <span className="hidden sm:inline ms-1">Sebelumnya</span>
        </button>

        <div className="flex flex-wrap items-center gap-1 text-sm font-medium">
          {pageNumbers(currentPage, totalPages).map((page, index) =>
            page === "gap" ? (
              <span
                key={`gap-${index}`}
                aria-hidden="true"
                className="flex size-9 items-center justify-center text-gray-400 dark:text-gray-500"
              >
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={`flex size-9 items-center justify-center rounded-lg ${
                  currentPage === page
                    ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <span className="hidden sm:inline me-1">Berikutnya</span>
          <ChevronLeftIcon className="size-4 rotate-180" />
        </button>

        {children}
      </div>
    </div>
  );
};

export default TablePagination;
