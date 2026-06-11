import { useCallback, useEffect, useState } from "react";
import {
  adminDeleteDivination,
  adminFetchDivination,
  adminFetchDivinations,
  type AdminDivinationDetail,
  type AdminDivinationRow,
} from "@/lib/admin-api";
import { CATEGORY_LABELS } from "@/lib/admin-constants";
import { AdminPagination } from "./AdminPagination";
import {
  AdminDataTable,
  AdminTableEmptyRow,
  AdminTableHead,
  AdminTableHeadCell,
} from "./AdminDataTable";
import { formatAdminError, formatTime, isAdminAuthError } from "./admin-utils";

type Props = {
  refreshKey: number;
  databaseOk: boolean | null;
  onAuthError: () => void;
  filterUserId?: number;
  onClearUserFilter?: () => void;
};

export function AdminDivinationsTab({
  refreshKey,
  databaseOk,
  onAuthError,
  filterUserId,
  onClearUserFilter,
}: Props) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<AdminDivinationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<AdminDivinationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    if (databaseOk === false) {
      setRecords([]);
      setTotal(0);
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await adminFetchDivinations({
        page,
        limit,
        q,
        category,
        userId: filterUserId,
      });
      setRecords(res.records);
      setTotal(res.total);
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(formatAdminError(err));
    } finally {
      setPending(false);
    }
  }, [page, q, category, filterUserId, databaseOk, onAuthError]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [filterUserId]);

  const openDetail = async (id: number) => {
    if (databaseOk === false) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await adminFetchDivination(id);
      setDetail(d);
      setError("");
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(formatAdminError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (databaseOk === false) return;
    if (!confirm("确定删除这条起卦记录？不可恢复（用户起卦计数会自动减 1）。")) return;
    try {
      await adminDeleteDivination(id);
      setDetail(null);
      load();
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(formatAdminError(err));
    }
  };

  return (
    <div>
      {filterUserId != null && (
        <p className="mb-3 rounded-lg border border-[var(--gold)]/30 bg-[var(--bagua-active-bg)] px-3 py-2 text-xs">
          仅显示用户 #{filterUserId} 的记录
          {onClearUserFilter && (
            <button type="button" onClick={onClearUserFilter} className="ml-2 text-[var(--gold)] underline">
              清除筛选
            </button>
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="搜索问题 / 用户"
          className="input-field min-w-[200px] flex-1 text-sm"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="input-field text-sm"
        >
          <option value="">全部分类</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" onClick={load} disabled={pending} className="btn-ghost-gold px-3 text-sm">
          查询
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <AdminDataTable minWidth={800} className="mt-4">
        <AdminTableHead>
          <tr>
            <AdminTableHeadCell>ID</AdminTableHeadCell>
            <AdminTableHeadCell>时间</AdminTableHeadCell>
            <AdminTableHeadCell>用户</AdminTableHeadCell>
            <AdminTableHeadCell>分类</AdminTableHeadCell>
            <AdminTableHeadCell>卦名</AdminTableHeadCell>
            <AdminTableHeadCell>所问</AdminTableHeadCell>
            <AdminTableHeadCell>操作</AdminTableHeadCell>
          </tr>
        </AdminTableHead>
        <tbody>
          {pending ? (
            <AdminTableEmptyRow colSpan={7}>加载起卦记录…</AdminTableEmptyRow>
          ) : records.length === 0 ? (
            <AdminTableEmptyRow colSpan={7}>无匹配记录</AdminTableEmptyRow>
          ) : (
            records.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/25">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{r.id}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatTime(r.createdAt)}</td>
                <td className="max-w-[120px] truncate px-3 py-2" title={r.userEmail}>
                  {r.userNickname || (r.isGuest ? "游客" : r.userEmail?.split("@")[0])}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{CATEGORY_LABELS[r.category] || r.category}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.benName || "—"}
                  {r.bianName ? ` → ${r.bianName}` : ""}
                </td>
                <td className="max-w-[220px] truncate px-3 py-2 text-muted-foreground" title={r.question}>
                  {r.question || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button type="button" onClick={() => openDetail(r.id)} className="text-[var(--gold)] hover:underline">
                    详情
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminDataTable>
      <AdminPagination page={page} total={total} limit={limit} onPage={setPage} />

      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-lg">
            {detailLoading && !detail ? (
              <p className="text-sm text-muted-foreground">加载详情…</p>
            ) : detail ? (
              <>
                <h3 className="font-serif-cjk text-base font-medium">
                  起卦 #{detail.id} · {detail.benName}
                  {detail.bianName ? ` → ${detail.bianName}` : ""}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTime(detail.createdAt)} · {CATEGORY_LABELS[detail.category] || detail.category}
                  {detail.changingLine ? ` · 动爻 ${detail.changingLine}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  用户：{detail.userNickname || detail.userEmail || "—"}
                  {detail.isGuest ? "（游客）" : ""}
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">{detail.question}</p>

                {detail.sections.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {detail.sections.map((s) => (
                      <div key={s.title} className="rounded border border-border/70 bg-secondary/25 p-3">
                        <p className="text-xs font-medium text-[var(--gold)]">{s.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{s.body}</p>
                      </div>
                    ))}
                  </div>
                ) : detail.interpretation ? (
                  <div className="mt-4 max-h-64 overflow-y-auto rounded border border-border bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {detail.interpretation}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">无解读正文</p>
                )}

                {detail.followUpMessages && detail.followUpMessages.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-foreground">追问记录（{detail.followUpMessages.length}）</h4>
                    <AdminDataTable minWidth={480} className="mt-2 max-h-48">
                      <AdminTableHead>
                        <tr>
                          <AdminTableHeadCell>角色</AdminTableHeadCell>
                          <AdminTableHeadCell>内容</AdminTableHeadCell>
                        </tr>
                      </AdminTableHead>
                      <tbody>
                        {detail.followUpMessages.map((m, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="whitespace-nowrap px-3 py-2 align-top text-muted-foreground">
                              {m.role === "user" ? "问" : "答"}
                            </td>
                            <td className="max-w-[360px] px-3 py-2 align-top whitespace-pre-wrap leading-relaxed">
                              {m.content}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </AdminDataTable>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => remove(detail.id)}
                    className="rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive"
                  >
                    删除记录
                  </button>
                  <button type="button" onClick={() => setDetail(null)} className="text-sm text-muted-foreground">
                    关闭
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
