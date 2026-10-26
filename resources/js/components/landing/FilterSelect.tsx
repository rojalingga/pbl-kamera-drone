import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  options: FilterSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  wrapperClassName?: string;
}

export default function FilterSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi',
  searchPlaceholder = 'Cari...',
  searchable = true,
  wrapperClassName = 'w-full sm:w-auto',
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return options;
    }

    return options.filter((opt) => opt.label.toLowerCase().includes(keyword));
  }, [options, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }

    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, searchable]);

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-2 rounded-2xl border bg-white py-3 ps-4 pe-3 text-xs font-semibold shadow-sm transition-colors sm:text-sm ${
          isOpen
            ? 'border-brand-500 text-black ring-2 ring-brand-500/20'
            : 'border-black/10 text-black hover:border-black/25'
        }`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-black/40 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
          {searchable && (
            <div className="border-b border-black/5 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-black/30" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-xl border border-black/10 bg-black/[0.03] py-2 ps-9 pe-3 text-xs text-black placeholder:text-black/30 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors sm:text-sm ${
                      isSelected
                        ? 'bg-brand-500 text-white'
                        : 'text-black/70 hover:bg-black/5 hover:text-black'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-center text-xs text-black/40">Tidak ada data ditemukan</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}