import { useCallback, useEffect, useState } from "react";
import {
  adminFetchUser,
  adminFetchUsers,
  adminUpdateUser,
  type AdminUserDetail,
  type AdminUserRow,
} from "@/lib/admin-api";
import { PLAN_LABELS, USER_PLANS, CATEGORY_LABELS } from "@/lib/admin-constants";
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
  onViewUserDivinations: (userId: number) => void;
};

export function AdminUsersTab({ refreshKey, databaseOk, onAuthError, onViewUserDivinations }: Props) {
  const [q, setQ] = useState("");
  const [guest, setGuest] = useState<"" | "true" | "false">("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [planDraft, setPlanDraft] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [bonusDraft, setBonusDraft] = useState("0");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    if (databaseOk === false) {
      setUsers([]);
      setTotal(0);
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await adminFetchUsers({ page, limit, q, guest, plan });
      setUsers(res.users);
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
  }, [page, q, guest, plan, databaseOk, onAuthError]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!selectedId || databaseOk === false) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    adminFetchUser(selectedId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setPlanDraft(d.user.plan);
        setNicknameDraft(d.user.nickname ?? "");
        setBonusDraft(String(d.user.bonus_credits ?? 0));
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        if (isAdminAuthError(err)) onAuthError();
        else setError(formatAdminError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, databaseOk, onAuthError]);

  const openUser = (u: AdminUserRow) => {
    setSelectedId(u.id);
  };

  const closeUser = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const saveUser = async () => {
    if (!selectedId || databaseOk === false) return;
    const bonus = Number(bonusDraft);
    if (!Number.isInteger(bonus) || bonus < 0) {
      setError("额外次数须为非负整数");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { user } = await adminUpdateUser(selectedId, {
        plan: planDraft,
        nickname: nicknameDraft.trim() || null,
        bonus_credits: bonus,
      });
      setUsers((list) =>
        list.map((u) =>
          u.id === user.id
            ? {
                ...u,
                plan: user.plan,
                nickname: user.nickname,
                bonus_credits: user.bonus_credits ?? bonus,
              }
            : u,
        ),
      );
      if (detail) {
        setDetail({
          ...detail,
          user: { ...detail.user, ...user, bonus_credits: user.bonus_credits ?? bonus },
        });
      }
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(formatAdminError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="搜索邮箱 / 昵称"
          className="input-field min-w-[200px] flex-1 text-sm"
        />
        <select
          value={guest}
          onChange={(e) => {
            setGuest(e.target.value as "" | "true" | "false");
            setPage(1);
          }}
          className="input-field text-sm"
        >
          <option value="">全部用户</option>
          <option value="false">仅注册</option>
          <option value="true">仅游客</option>
        </select>
        <select
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value);
            setPage(1);
          }}
          className="input-field text-sm"
        >
          <option value="">全部套餐</option>
          {USER_PLANS.map((p) => (
            <option key={p} value={p}>
              {PLAN_LABELS[p]}
            </option>
          ))}
          <option value="guest">游客</option>
        </select>
        <button type="button" onClick={load} disabled={pending} className="btn-ghost-gold text-sm px-3">
          查询
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <AdminDataTable minWidth={720} className="mt-4">
        <AdminTableHead>
          <tr>
            <AdminTableHeadCell>ID</AdminTableHeadCell>
            <AdminTableHeadCell>昵称</AdminTableHeadCell>
            <AdminTableHeadCell>邮箱</AdminTableHeadCell>
            <AdminTableHeadCell>类型</AdminTableHeadCell>
            <AdminTableHeadCell>套餐</AdminTableHeadCell>
            <AdminTableHeadCell align="right">额外次数</AdminTableHeadCell>
            <AdminTableHeadCell align="right">起卦</AdminTableHeadCell>
            <AdminTableHeadCell>操作</AdminTableHeadCell>
          </tr>
        </AdminTableHead>
        <tbody>
          {pending ? (
            <AdminTableEmptyRow colSpan={8}>加载用户…</AdminTableEmptyRow>
          ) : users.length === 0 ? (
            <AdminTableEmptyRow colSpan={8}>无匹配用户</AdminTableEmptyRow>
          ) : (
            users.map((u) => (
              <tr
                key={u.id}
                className={`border-b border-border/60 last:border-0 hover:bg-secondary/25 ${
                  selectedId === u.id ? "bg-[var(--bagua-active-bg)]/30" : ""
                }`}
              >
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{u.id}</td>
                <td className="px-3 py-2">{u.nickname || "—"}</td>
                <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground" title={u.email}>
                  {u.email}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{u.is_guest ? "游客" : "注册"}</td>
                <td className="whitespace-nowrap px-3 py-2">{PLAN_LABELS[u.plan] || u.plan}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{u.bonus_credits ?? 0}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{u.divination_count}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button type="button" onClick={() => openUser(u)} className="text-[var(--gold)] hover:underline">
                    管理
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminDataTable>
      <AdminPagination page={page} total={total} limit={limit} onPage={setPage} />

      {selectedId != null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-lg">
            <h3 className="font-serif-cjk text-base font-medium">用户 #{selectedId}</h3>
            {detail ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">{detail.user.email}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">注册</dt>
                    <dd className="mt-0.5">{formatTime(detail.user.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">近 30 日起卦</dt>
                    <dd className="mt-0.5 tabular-nums">{detail.stats.month}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">累计起卦</dt>
                    <dd className="mt-0.5 tabular-nums">{detail.stats.total}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">类型</dt>
                    <dd className="mt-0.5">{detail.user.is_guest ? "游客" : "注册用户"}</dd>
                  </div>
                </dl>

                <label className="mt-4 block text-xs text-muted-foreground">昵称</label>
                <input
                  value={nicknameDraft}
                  onChange={(e) => setNicknameDraft(e.target.value)}
                  className="input-field mt-1 w-full text-sm"
                  placeholder="可选"
                />

                <label className="mt-3 block text-xs text-muted-foreground">套餐</label>
                <select
                  value={planDraft}
                  onChange={(e) => setPlanDraft(e.target.value)}
                  className="input-field mt-1 w-full text-sm"
                >
                  {USER_PLANS.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_LABELS[p]}
                    </option>
                  ))}
                </select>

                <label className="mt-3 block text-xs text-muted-foreground">额外解读次数（bonus_credits）</label>
                <input
                  type="number"
                  min={0}
                  value={bonusDraft}
                  onChange={(e) => setBonusDraft(e.target.value)}
                  className="input-field mt-1 w-full text-sm tabular-nums"
                />

                {detail.recentDivinations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-foreground">最近起卦</h4>
                    <AdminDataTable minWidth={480} className="mt-2">
                      <AdminTableHead>
                        <tr>
                          <AdminTableHeadCell>时间</AdminTableHeadCell>
                          <AdminTableHeadCell>分类</AdminTableHeadCell>
                          <AdminTableHeadCell>卦名</AdminTableHeadCell>
                          <AdminTableHeadCell>所问</AdminTableHeadCell>
                        </tr>
                      </AdminTableHead>
                      <tbody>
                        {detail.recentDivinations.map((d) => (
                          <tr key={d.id} className="border-b border-border/50 last:border-0">
                            <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                              {formatTime(d.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5">
                              {CATEGORY_LABELS[d.category] || d.category}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5">{d.benName}</td>
                            <td className="max-w-[180px] truncate px-3 py-1.5 text-muted-foreground">{d.question}</td>
                          </tr>
                        ))}
                      </tbody>
                    </AdminDataTable>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveUser}
                    disabled={saving}
                    className="btn-gold px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {saving ? "保存中…" : "保存修改"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onViewUserDivinations(selectedId);
                      closeUser();
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm"
                  >
                    查看起卦
                  </button>
                  <button type="button" onClick={closeUser} className="text-sm text-muted-foreground">
                    关闭
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">加载用户详情…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
