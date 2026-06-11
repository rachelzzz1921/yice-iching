type Props = {
  page: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
};

export function AdminPagination({ page, total, limit, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total === 0) return null;

  const jump = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    onPage(Math.min(pages, Math.max(1, n)));
  };

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="tabular-nums">
        共 {total} 条 · 第 {page}/{pages} 页 · 每页 {limit} 条
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded border border-border px-2 py-1 disabled:opacity-40"
        >
          上一页
        </button>
        {pages > 1 && (
          <label className="inline-flex items-center gap-1">
            跳至
            <input
              type="number"
              min={1}
              max={pages}
              defaultValue={page}
              key={page}
              onKeyDown={(e) => {
                if (e.key === "Enter") jump((e.target as HTMLInputElement).value);
              }}
              onBlur={(e) => jump(e.target.value)}
              className="input-field w-12 py-0.5 text-center text-xs tabular-nums"
            />
            页
          </label>
        )}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded border border-border px-2 py-1 disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
