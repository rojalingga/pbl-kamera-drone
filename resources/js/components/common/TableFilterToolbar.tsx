import { SearchIcon } from "@/icons";

interface TableFilterToolbarProps {
  search: string;
  perPage: number;
  placeholder: string;
  setSearch: (value: string) => void;
  setPerPage: (value: number) => void;
  setCurrentPage: (value: number | ((prev: number) => number)) => void;

  bordered?: boolean;
}

const TableFilterToolbar = ({
  search,
  perPage,
  placeholder,
  setSearch,
  setPerPage,
  setCurrentPage,
  bordered = false,
}: TableFilterToolbarProps) => {
  return (
    <div
      className={
        bordered
          ? "flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-gray-800"
          : "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      }
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Tampilkan
        </span>
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">data</span>
      </div>

      <div className="relative w-full sm:w-72">
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="h-10 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 ps-10 pe-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
        />
        <SearchIcon className="absolute inset-s-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
      </div>
    </div>
  );
};

export default TableFilterToolbar;