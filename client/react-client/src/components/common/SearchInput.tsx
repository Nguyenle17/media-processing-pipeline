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
    <div className={`vs-search ${className}`}>
      <Search size={16} className="vs-search__icon" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="vs-search-input"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Clear"
          aria-label="Clear search"
          className="vs-search__clear"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
