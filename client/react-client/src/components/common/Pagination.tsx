import { useMemo } from 'react';

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
    <div className="vs-pagination">
      <button className="vs-page-btn" disabled={page === 1} onClick={() => onPageChange(1)}>≪</button>
      <button className="vs-page-btn" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))}>←</button>
      {pageRange.map((p) => (
        <button key={p} className={`vs-page-btn ${page === p ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      <button className="vs-page-btn" disabled={page === totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>→</button>
      <button className="vs-page-btn" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>≫</button>
    </div>
  );
}
