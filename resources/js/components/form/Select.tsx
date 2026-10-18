import React, { useEffect, useRef, useState } from "react";

export interface Option {
  value: string | number;
  label: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  options: Option[];
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  error?: boolean;
  hint?: string;
  disabled?: boolean;
  allowClear?: boolean;
  searchable?: boolean;
}

const Select: React.FC<SelectProps> = ({
  id,
  name,
  options,
  value,
  defaultValue = "",
  placeholder = "- Pilih Option -",
  onChange,
  className = "",
  error = false,
  hint,
  disabled = false,
  allowClear = true,
  searchable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentValue = value !== undefined ? String(value) : String(defaultValue);

  const selectedOption = options.find(
    (opt) => String(opt.value) === currentValue
  );

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen, searchable]);

  const handleSelect = (optionValue: string | number) => {
    const valStr = String(optionValue);
    onChange(valStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={containerRef} className="relative w-full">

      {name && <input type="hidden" id={id} name={name} value={currentValue} />}

      <div
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={`relative flex h-11 w-full items-center justify-between rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs transition-colors cursor-pointer ${
          disabled
            ? "cursor-not-allowed bg-gray-100 opacity-60 dark:bg-gray-800"
            : ""
        } ${
          error
            ? "border-error-500 focus-within:ring-3 focus-within:ring-error-500/20 dark:border-error-500"
            : isOpen
            ? "border-brand-500 ring-3 ring-brand-500/20 dark:border-brand-500"
            : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600 dark:bg-gray-900"
        } ${className}`}
      >

        <span
          className={`truncate pe-6 ${
            selectedOption
              ? "font-medium text-gray-800 dark:text-white/90"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="flex items-center gap-1.5 ms-2">
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              className="flex size-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          <svg
            className={`size-4 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
              isOpen ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.79175 8.02075L10.0001 13.2291L15.2084 8.02075"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {hint && <p className="mt-1.5 text-xs text-error-500">{hint}</p>}

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full z-99999 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in fade-in duration-150">

          {searchable && (
            <div className="border-b border-gray-100 p-2 dark:border-gray-800">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari..."
                  className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 ps-9 pe-3 text-xs text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500 dark:focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === currentValue;
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-brand-50 text-brand-600 font-semibold dark:bg-brand-900/30 dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/70"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <svg
                        className="size-4 shrink-0 text-brand-500"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M16.6666 5L7.50001 14.1667L3.33334 10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                Tidak ada data ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Select;
