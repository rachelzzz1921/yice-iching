import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Check, Download, Plus, Upload, X } from "lucide-react";
import {
  adminCreateRedemptionCode,
  adminExportRedemptionCodes,
  adminFetchRedemptionCode,
  adminFetchRedemptionCodes,
  adminImportRedemptionCodes,
  adminSetupDatabase,
  adminSeedRedemptionCodes,
  adminUpdateRedemptionCode,
  type AdminRedemptionCode,
} from "@/lib/admin-api";
import { REDEMPTION_KINDS } from "@/lib/admin-constants";
import { AdminPagination } from "./AdminPagination";
import {
  AdminDataTable,
  AdminTableEmptyRow,
  AdminTableHead,
  AdminTableHeadCell,
} from "./AdminDataTable";
import { downloadCsv } from "./admin-export";
import {
  downloadRedemptionExportExcel,
  downloadRedemptionImportTemplate,
  parseRedemptionImportFile,
} from "./redemption-code-excel";
import { formatAdminError, formatTime, isAdminAuthError, redemptionStatusClass } from "./admin-utils";

const STATUS_FILTERS = [
  { id: "", label: "全部状态" },
  { id: "active", label: "可兑换" },
  { id: "exhausted", label: "次数用尽" },
  { id: "disabled", label: "已停用" },
  { id: "expired", label: "已过期" },
] as const;

type Props = {
  refreshKey: number;
  databaseOk: boolean | null;
  onAuthError: () => void;
};

export function AdminCodesTab({ refreshKey, databaseOk, onAuthError }: Props) {
  const [codes, setCodes] = useState<AdminRedemptionCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof adminFetchRedemptionCode>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [expiresDraft, setExpiresDraft] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 50;

  const [form, setForm] = useState({
    code: "",
    kind: "lifetime" as (typeof REDEMPTION_KINDS)[number]["id"],
    maxRedemptions: "10",
    creditAmount: "5",
    note: "",
    prefix: "YICE",
    expiresAt: "",
    autoCode: true,
  });

  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);

  const load = useCallback(async () => {
    if (databaseOk === false) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await adminFetchRedemptionCodes({
        page,
        limit,
        q: q.trim() || undefined,
        kind: kindFilter || undefined,
        status: statusFilter || undefined,
      });
      setCodes(res.codes ?? []);
      setTotal(res.total ?? 0);
      setTablesMissing(!!res.tablesMissing);
      if (res.tablesMissing && res.error) setError(res.error);
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(formatAdminError(err));
    } finally {
      setLoading(false);
    }
  }, [databaseOk, onAuthError, page, limit, q, kindFilter, statusFilter]);

  useEffect(() => {
    if (databaseOk === false) return;
    void load();
  }, [load, refreshKey, databaseOk]);

  useEffect(() => {
    if (!selectedId || databaseOk === false) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    adminFetchRedemptionCode(selectedId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setNoteDraft(d.code.note ?? "");
        setExpiresDraft(d.code.expiresAt ? d.code.expiresAt.slice(0, 16) : "");
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        if (isAdminAuthError(err)) onAuthError();
        else setError(formatAdminError(err));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, databaseOk, onAuthError]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("复制失败，请手动选择复制");
    }
  };

  const createCode = async () => {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminCreateRedemptionCode({
        code: form.autoCode ? undefined : form.code.trim(),
        kind: form.kind,
        maxRedemptions: Number(form.maxRedemptions) || 1,
        creditAmount: form.kind === "credits" ? Number(form.creditAmount) || 1 : 0,
        note: form.note.trim() || undefined,
        prefix: form.prefix.trim() || "YICE",
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      });
      setSuccess(`已创建：${res.code.code}`);
      setForm((f) => ({ ...f, code: "", note: "", expiresAt: "" }));
      await load();
      setSelectedId(res.code.id);
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setPending(false);
    }
  };

  const seedDefaults = async () => {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminSeedRedemptionCodes();
      setSuccess(res.message);
      await load();
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setPending(false);
    }
  };

  const setupDatabase = async () => {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminSetupDatabase();
      setCodes(res.codes);
      setTotal(res.total);
      setTablesMissing(false);
      setSuccess(res.message);
    } catch (err) {
      if (isAdminAuthError(err)) onAuthError();
      else setError(formatAdminError(err));
    } finally {
      setPending(false);
    }
  };

  const setCodeEnabled = async (enabled: boolean) => {
    if (!selectedId) return;
    setSavingMeta(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminUpdateRedemptionCode(selectedId, { enabled });
      setSuccess(enabled ? "已启用该兑换码" : "已停用该兑换码");
      setDetail((d) => (d ? { ...d, code: res.code } : d));
      await load();
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setSavingMeta(false);
    }
  };

  const saveCodeMeta = async () => {
    if (!selectedId) return;
    setSavingMeta(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminUpdateRedemptionCode(selectedId, {
        note: noteDraft.trim() || null,
        expiresAt: expiresDraft ? new Date(expiresDraft).toISOString() : null,
      });
      setSuccess("兑换码备注/过期时间已更新");
      setDetail((d) => (d ? { ...d, code: res.code } : d));
      await load();
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setSavingMeta(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const exportCurrentPageCsv = () => {
    if (!codes.length) return;
    downloadCsv(
      `yice-redemption-codes-p${page}.csv`,
      ["兑换码", "类型", "已用", "上限", "状态", "过期", "备注", "创建时间"],
      codes.map((c) => [
        c.code,
        c.kindLabel,
        c.redemptionCount,
        c.maxRedemptions,
        c.statusLabel,
        c.expiresAt ? formatTime(c.expiresAt) : "",
        c.note ?? "",
        formatTime(c.createdAt),
      ]),
    );
  };

  const exportAllExcel = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await adminExportRedemptionCodes({
        q: q.trim() || undefined,
        kind: kindFilter || undefined,
        status: statusFilter || undefined,
      });
      if (!res.codes.length) {
        setError("当前筛选条件下没有可导出的兑换码");
        return;
      }
      downloadRedemptionExportExcel(res.codes);
      setSuccess(
        res.truncated
          ? `已导出前 ${res.exportMax} 条（共 ${res.total} 条匹配，请缩小筛选后分批导出）`
          : `已导出 ${res.codes.length} 条兑换码到 Excel`,
      );
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const parsed = await parseRedemptionImportFile(file);
      if (parsed.errors.length) {
        setError(parsed.errors.slice(0, 8).join("；") + (parsed.errors.length > 8 ? "…" : ""));
        if (!parsed.rows.length) return;
      }
      const res = await adminImportRedemptionCodes(parsed.rows);
      let msg = res.message;
      if (res.failedItems.length) {
        const detail = res.failedItems
          .slice(0, 5)
          .map((f) => `第${f.line}行 ${f.code || "—"}: ${f.error}`)
          .join("；");
        msg += `。失败明细：${detail}${res.failedItems.length > 5 ? "…" : ""}`;
      }
      setSuccess(msg);
      await load();
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (databaseOk === false) {
    return <p className="text-sm text-muted-foreground">数据库未连接，无法管理兑换码。</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-[var(--success)]" role="status">
          {success}
        </p>
      )}

      <details className="rounded-lg border border-border/80 bg-card/40">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <Plus size={14} className="text-[var(--gold)]" aria-hidden />
            生成新兑换码
            <span className="text-xs font-normal text-muted-foreground">
              （留空码串自动生成 · 格式如 YICE-LIFE-2026）
            </span>
          </span>
        </summary>
        <div className="border-t border-border/60 px-4 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-xs text-muted-foreground sm:col-span-2 lg:col-span-1">
              <span className="mb-1 flex items-center justify-between">
                兑换码
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, autoCode: !f.autoCode }))}
                  className="text-[10px] text-[var(--gold)] hover:underline"
                >
                  {form.autoCode ? "手动填写" : "自动生成"}
                </button>
              </span>
              <input
                value={form.autoCode ? "" : form.code}
                disabled={form.autoCode}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder={form.autoCode ? "留空自动生成" : "YICE-LIFE-2026"}
                className="input-field w-full py-2 text-sm uppercase tracking-wider disabled:opacity-60"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              类型
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value as (typeof REDEMPTION_KINDS)[number]["id"] }))
                }
                className="input-field mt-1 w-full text-sm"
              >
                {REDEMPTION_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-muted-foreground">
              可用次数
              <input
                type="number"
                min={1}
                value={form.maxRedemptions}
                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                className="input-field mt-1 w-full py-2 text-sm"
              />
            </label>
            {form.kind === "credits" && (
              <label className="block text-xs text-muted-foreground">
                每人增加次数
                <input
                  type="number"
                  min={1}
                  value={form.creditAmount}
                  onChange={(e) => setForm((f) => ({ ...f, creditAmount: e.target.value }))}
                  className="input-field mt-1 w-full py-2 text-sm"
                />
              </label>
            )}
            <label className="block text-xs text-muted-foreground">
              过期时间
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="input-field mt-1 w-full py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-muted-foreground sm:col-span-2">
              备注
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="小红书活动 2026Q2"
                className="input-field mt-1 w-full py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={createCode} className="btn-gold px-4 py-2 text-xs">
              创建
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={seedDefaults}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              补充默认码
            </button>
          </div>
        </div>
      </details>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">
            已发放兑换码
            <span className="ml-2 font-normal tabular-nums text-muted-foreground">共 {total} 条</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadRedemptionImportTemplate}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download size={14} aria-hidden />
              下载导入模板
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImportFile(f);
              }}
            />
            <button
              type="button"
              disabled={importing || pending}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--gold)]/40 px-3 py-1.5 text-xs text-[var(--gold)] disabled:opacity-50"
            >
              <Upload size={14} aria-hidden />
              {importing ? "导入中…" : "导入 Excel"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="搜索兑换码 / 备注"
            className="input-field min-w-[180px] flex-1 text-sm"
          />
          <select
            value={kindFilter}
            onChange={(e) => {
              setKindFilter(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm"
          >
            <option value="">全部类型</option>
            {REDEMPTION_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.id || "all"} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void load()} disabled={loading} className="btn-ghost-gold px-3 text-sm">
            查询
          </button>
          <button
            type="button"
            disabled={exporting || total === 0}
            onClick={() => void exportAllExcel()}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--gold)]/40 px-3 py-2 text-sm text-[var(--gold)] disabled:opacity-40"
          >
            <Download size={14} aria-hidden />
            {exporting ? "导出中…" : "导出 Excel（全部筛选）"}
          </button>
          <button
            type="button"
            disabled={!codes.length}
            onClick={exportCurrentPageCsv}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            导出 CSV（当前页）
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          批量导入请用「下载导入模板」填好后上传；导出 Excel 含已兑换次数等运营字段（最多 5000 条）。
        </p>

        <AdminDataTable minWidth={980} className="mt-3">
          <AdminTableHead>
            <tr>
              <AdminTableHeadCell>兑换码</AdminTableHeadCell>
              <AdminTableHeadCell>类型</AdminTableHeadCell>
              <AdminTableHeadCell align="right">已用 / 上限</AdminTableHeadCell>
              <AdminTableHeadCell>状态</AdminTableHeadCell>
              <AdminTableHeadCell>过期</AdminTableHeadCell>
              <AdminTableHeadCell>备注</AdminTableHeadCell>
              <AdminTableHeadCell>创建时间</AdminTableHeadCell>
              <AdminTableHeadCell align="center">操作</AdminTableHeadCell>
            </tr>
          </AdminTableHead>
          <tbody>
            {loading ? (
              <AdminTableEmptyRow colSpan={8}>加载兑换码…</AdminTableEmptyRow>
            ) : codes.length === 0 ? (
              <AdminTableEmptyRow colSpan={8}>
                <p>
                  {tablesMissing
                    ? "兑换码表尚未创建，需先初始化数据库。"
                    : "无匹配记录。可调整筛选，或展开上方「生成新兑换码」。"}
                </p>
                {tablesMissing && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void setupDatabase()}
                      className="btn-gold px-4 py-2 text-xs disabled:opacity-50"
                    >
                      初始化数据库 + 默认码
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void seedDefaults()}
                      className="rounded-lg border border-border px-3 py-2 text-xs hover:text-foreground disabled:opacity-50"
                    >
                      仅补充默认码
                    </button>
                  </div>
                )}
              </AdminTableEmptyRow>
            ) : (
              codes.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-border/60 last:border-0 ${
                    selectedId === c.id ? "bg-[var(--bagua-active-bg)]/35" : "hover:bg-secondary/30"
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px] tracking-wide text-foreground">
                    {c.code}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-foreground/90">{c.kindLabel}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    <span className="font-medium text-foreground">{c.usageDisplay}</span>
                    {c.exhausted ? (
                      <span className="ml-1 text-amber-700 dark:text-amber-400">兑完</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${redemptionStatusClass(c.status)}`}
                    >
                      {c.statusLabel}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {c.expiresAt ? formatTime(c.expiresAt) : "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground" title={c.note ?? undefined}>
                    {c.note || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatTime(c.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className="text-[var(--gold)] hover:underline"
                      >
                        详情
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyCode(c.code)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`复制 ${c.code}`}
                      >
                        {copied === c.code ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AdminDataTable>
        <AdminPagination page={page} total={total} limit={limit} onPage={setPage} />
      </section>

      {selectedId != null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="code-detail-title"
          onClick={closeDetail}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h3 id="code-detail-title" className="truncate font-mono text-base text-[var(--gold)]">
                  {detail?.code.code ?? `兑换码 #${selectedId}`}
                </h3>
                {detail && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {detail.code.kindLabel}
                    {detail.code.kind === "credits" ? ` · 每人 +${detail.code.creditAmount} 次` : ""}
                    {" · "}
                    创建于 {formatTime(detail.code.createdAt)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {detailLoading || !detail ? (
                <p className="text-sm text-muted-foreground">加载详情…</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-medium ${redemptionStatusClass(detail.code.status)}`}
                    >
                      {detail.code.statusLabel}
                    </span>
                    <span className="text-xs tabular-nums text-foreground">
                      已用 {detail.code.usageDisplay}（剩余 {detail.code.remaining}）
                    </span>
                    {detail.code.expiresAt ? (
                      <span className="text-xs text-muted-foreground">
                        过期 {formatTime(detail.code.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">永不过期</span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingMeta || detail.code.status === "active"}
                      onClick={() => void setCodeEnabled(true)}
                      className="rounded border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-800 disabled:opacity-40 dark:text-emerald-300"
                    >
                      启用
                    </button>
                    <button
                      type="button"
                      disabled={savingMeta || detail.code.status === "disabled"}
                      onClick={() => void setCodeEnabled(false)}
                      className="rounded border border-border px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      停用
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyCode(detail.code.code)}
                      className="rounded border border-border px-3 py-1.5 text-xs"
                    >
                      复制码
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-muted-foreground sm:col-span-2">
                      备注
                      <input
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        className="input-field mt-1 w-full py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs text-muted-foreground sm:col-span-2">
                      过期时间（留空 = 永不过期）
                      <input
                        type="datetime-local"
                        value={expiresDraft}
                        onChange={(e) => setExpiresDraft(e.target.value)}
                        className="input-field mt-1 w-full py-2 text-sm"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={savingMeta}
                    onClick={() => void saveCodeMeta()}
                    className="mt-2 rounded border border-[var(--gold)]/35 px-3 py-2 text-xs text-[var(--gold)] disabled:opacity-50"
                  >
                    {savingMeta ? "保存中…" : "保存备注 / 过期时间"}
                  </button>

                  <h4 className="mt-5 text-xs font-medium text-foreground">
                    兑换记录（{detail.uses.length}）
                  </h4>
                  {detail.uses.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">尚无人兑换</p>
                  ) : (
                    <AdminDataTable minWidth={520} className="mt-2">
                      <AdminTableHead>
                        <tr>
                          <AdminTableHeadCell>用户</AdminTableHeadCell>
                          <AdminTableHeadCell>套餐</AdminTableHeadCell>
                          <AdminTableHeadCell>兑换时间</AdminTableHeadCell>
                        </tr>
                      </AdminTableHead>
                      <tbody>
                        {detail.uses.map((u) => (
                          <tr key={u.id} className="border-b border-border/50 last:border-0">
                            <td className="max-w-[200px] truncate px-3 py-2">
                              {u.nickname || u.email}
                              {u.isGuest ? (
                                <span className="ml-1 text-muted-foreground">游客</span>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">{u.plan}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {formatTime(u.redeemedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </AdminDataTable>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
