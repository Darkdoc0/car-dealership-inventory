interface PaginationProps {
  offset: number;
  limit: number;
  shown: number;
  total: number;
  /** Disables paging while another page is loading. */
  busy: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export default function Pagination({ offset, limit, shown, total, busy, onPrevious, onNext }: PaginationProps) {
  const buttonClass =
    'rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      <p className="text-sm text-slate-600">{`Showing ${offset + 1}–${offset + shown} of ${total} vehicles`}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onPrevious} disabled={busy || offset === 0} className={buttonClass}>
          Previous
        </button>
        <button type="button" onClick={onNext} disabled={busy || offset + limit >= total} className={buttonClass}>
          Next
        </button>
      </div>
    </nav>
  );
}
