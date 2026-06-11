import { useCallback, useEffect, useState } from "react";
import { adminFetchPayments, type AdminPaymentOrder } from "@/lib/admin-api";
import { PAYMENT_STATUS_LABELS } from "@/lib/admin-constants";
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
};

function formatYuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function AdminPaymentsTab({ refreshKey, databaseOk, onAuthError }: Props) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<AdminPaymentOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    if (databaseOk === false) {
      setOrders([]);
      setTotal(0);
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await adminFetchPayments({
        page,
        limit,
        status: status || undefined,
        q: q.trim() || undefined,
      });
      setOrders(res.orders);
      setTotal(res.total);
      setTablesMissing(!!res.tablesMissing);
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(formatAdminError(err));
    } finally {
      setPending(false);
    }
  }, [page, status, q, databaseOk, onAuthError, limit]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (databaseOk === false) {
    return <p className="text-sm text-muted-foreground">数据库未连接，无法查看订单。</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="订单号 / 邮箱 / 昵称"
          className="input-field min-w-[200px] flex-1 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="input-field text-sm"
        >
          <option value="">全部状态</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void load()} disabled={pending} className="btn-ghost-gold px-3 text-sm">
          查询
        </button>
      </div>

      {tablesMissing && (
        <p className="mt-3 rounded-lg border border-[var(--gold)]/30 bg-[var(--bagua-active-bg)] px-3 py-2 text-xs text-muted-foreground">
          付费订单表尚未创建。请到「系统」页执行「同步数据库结构」，不会删除现有数据。
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <AdminDataTable minWidth={800} className="mt-4">
        <AdminTableHead>
          <tr>
            <AdminTableHeadCell>时间</AdminTableHeadCell>
            <AdminTableHeadCell>订单号</AdminTableHeadCell>
            <AdminTableHeadCell>用户</AdminTableHeadCell>
            <AdminTableHeadCell align="right">金额</AdminTableHeadCell>
            <AdminTableHeadCell align="right">次数</AdminTableHeadCell>
            <AdminTableHeadCell>状态</AdminTableHeadCell>
          </tr>
        </AdminTableHead>
        <tbody>
          {pending ? (
            <AdminTableEmptyRow colSpan={6}>加载订单…</AdminTableEmptyRow>
          ) : orders.length === 0 ? (
            <AdminTableEmptyRow colSpan={6}>暂无订单记录</AdminTableEmptyRow>
          ) : (
            orders.map((o) => (
              <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/25">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatTime(o.createdAt)}</td>
                <td className="max-w-[160px] truncate px-3 py-2 font-mono" title={o.orderNo}>
                  {o.orderNo}
                </td>
                <td className="max-w-[140px] truncate px-3 py-2" title={o.userEmail}>
                  {o.userNickname || o.userEmail?.split("@")[0]}
                  {o.isGuest ? <span className="text-muted-foreground">（游客）</span> : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatYuan(o.amountCents)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{o.credits}</td>
                <td className="whitespace-nowrap px-3 py-2">{PAYMENT_STATUS_LABELS[o.status] || o.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </AdminDataTable>
      <AdminPagination page={page} total={total} limit={limit} onPage={setPage} />
    </div>
  );
}
