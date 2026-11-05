import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  delta?: number;
}

export default function Pagination({ page, totalPages, onPageChange, delta = 2 }: PaginationProps) {
  const pageRange = useMemo(() => {
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages, page + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages, delta]);

  if (totalPages <= 1) return null;

  return (
    <nav className="vs-pagination" aria-label="Pagination">
      <button className="vs-page-btn" disabled={page === 1} onClick={() => onPageChange(1)} aria-label="First page">
        <ChevronsLeft size={14} />
      </button>
      <button className="vs-page-btn" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))} aria-label="Previous page">
        <ChevronLeft size={14} />
      </button>
      {pageRange.map((p) => (
        <button
          key={p}
          className={`vs-page-btn ${page === p ? 'active' : ''}`}
          onClick={() => onPageChange(p)}
          aria-label={`Page ${p}`}
          aria-current={page === p ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button className="vs-page-btn" disabled={page === totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} aria-label="Next page">
        <ChevronRight size={14} />
      </button>
      <button className="vs-page-btn" disabled={page === totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">
        <ChevronsRight size={14} />
      </button>
    </nav>
  );
}
