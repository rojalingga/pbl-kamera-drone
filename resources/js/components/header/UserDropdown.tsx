import { useState, useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
import { PageProps } from "@/types";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { LogOutIcon } from "lucide-react";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { auth } = usePage<PageProps>().props;

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    closeDropdown();
    router.post('/admin/logout');
  };

  useEffect(() => {
    return () => {
      setIsOpen(false);
    };
  }, []);

  const userName = auth?.user?.name || "Admin Rental";
  const userRole = auth?.user?.role || "Administrator";

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400"
      >
        <span className="me-3 h-11 w-11 overflow-hidden rounded-full ring-2 ring-brand-500/20">
          <img src="/images/user/owner.png" alt="User" />
        </span>

        <span className="me-1 block text-theme-sm font-medium">{userName.split(' ')[0]}</span>
        <svg
          className={`stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute inset-e-0 mt-4.25 flex w-65 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="border-b border-gray-200 pb-3 dark:border-gray-800">
          <span className="block text-theme-sm font-medium text-gray-700 no-underline dark:text-gray-400">
            {userName}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 no-underline dark:text-gray-400">
            {userRole}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="group mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 cursor-pointer text-left"
        >
          <LogOutIcon className="size-4" />
          Keluar (Sign Out)
        </button>
      </Dropdown>
    </div>
  );
}
