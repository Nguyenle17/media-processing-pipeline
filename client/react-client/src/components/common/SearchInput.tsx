import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative w-full sm:w-72 ${className}`}>
      <Search
        size={17}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="block w-full h-10 box-border rounded-xl border border-white/10 bg-white/5 pl-10 pr-9 text-sm text-gray-200 placeholder:text-gray-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Clear"
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/10 transition"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}