import { useEffect, useState } from "react";
import { adminFetchOverview, adminFetchTrends, type AdminOverview, type AdminTrends } from "@/lib/admin-api";
import { CATEGORY_LABELS } from "@/lib/admin-constants";
import {
  AdminDataTable,
  AdminTableEmptyRow,
  AdminTableHead,
  AdminTableHeadCell,
} from "./AdminDataTable";
import { formatAdminError, formatDay, isAdminAuthError } from "./admin-utils";

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif-cjk text-2xl font-medium text-foreground">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TrendBars({ title, rows }: { title: string; rows: { day: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">近 14 日暂无数据</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.day} className="flex items-center gap-2 text-xs">
              <span className="w-12 shrink-0 text-muted-foreground">{formatDay(r.day)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-[var(--gold)]/70"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type TabProps = {
  refreshKey: number;
  databaseOk: boolean | null;
  onAuthError: () => void;
};

export function AdminOverviewTab({ refreshKey, databaseOk, onAuthError }: TabProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [trends, setTrends] = useState<AdminTrends | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (databaseOk === false) return;
    let cancelled = false;
    (async () => {
      try {
        const [ov, tr] = await Promise.all([adminFetchOverview(), adminFetchTrends()]);
        if (!cancelled) {
          setOverview(ov);
          setTrends(tr);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          if (isAdminAuthError(err)) {
            onAuthError();
            return;
          }
          setError(formatAdminError(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, databaseOk, onAuthError]);

  if (databaseOk === false) {
    return <p className="text-sm text-muted-foreground">连接数据库后可查看概览数据。</p>;
  }

  if (!overview && !error) {
    return <p className="text-sm text-muted-foreground">加载概览…</p>;
  }

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {overview && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="注册用户" value={overview.users.registered} hint={`游客 ${overview.users.guests}`} />
            <StatCard label="用户总数" value={overview.users.total} hint={`近 7 日新增 ${overview.users.new_7d}`} />
            <StatCard label="起卦总数" value={overview.divinations.total} hint={`本月 ${overview.divinations.month}`} />
            <StatCard label="今日起卦" value={overview.divinations.today} />
          </div>
          {overview.categories30d.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium text-foreground">近 30 日问事分类</h3>
              <AdminDataTable minWidth={360}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeadCell>分类</AdminTableHeadCell>
                    <AdminTableHeadCell align="right">起卦次数</AdminTableHeadCell>
                    <AdminTableHeadCell align="right">占比</AdminTableHeadCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {[...overview.categories30d]
                    .sort((a, b) => b.count - a.count)
                    .map((c) => {
                      const sum = overview.categories30d.reduce((s, x) => s + x.count, 0);
                      const pct = sum > 0 ? Math.round((c.count / sum) * 100) : 0;
                      return (
                        <tr key={c.category} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2">{CATEGORY_LABELS[c.category] || c.category}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{c.count}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </AdminDataTable>
            </div>
          )}
        </>
      )}
      {trends && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <TrendBars title="近 14 日起卦趋势" rows={trends.divinations} />
          <TrendBars title="近 14 日新增用户" rows={trends.users} />
        </div>
      )}
    </div>
  );
}
