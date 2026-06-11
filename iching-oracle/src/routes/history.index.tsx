import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { GuardedDivineLink } from "@/components/home/DivineEntryLink";
import { PageShell } from "@/components/SiteNav";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { GuideStage } from "@/components/GuideCallout";
import { CATEGORIES, relativeTime, getHistoryRecord, loadHistory, deleteHistoryRecord, type HistoryRecord } from "@/lib/iching";
import { compressHistoryList, mergeHistoryRecords, normalizeHistoryRecord } from "@/lib/history-display";
import { apiHistoryDelete, apiHistoryList, ApiError, isOfflineGuestToken } from "@/lib/api";
import {
  formatApiErrorMessage,
  isRecoverableApiFailure,
  SOFT_NOTICE_CLASS,
  withAuthRetry,
} from "@/lib/api-errors";
import { useRequireUser } from "@/lib/auth";

export const Route = createFileRoute("/history/")({ component: HistoryPage });

function HistoryPage() {
  const auth = useRequireUser();
  const { refresh } = auth;
  const [items, setItems] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    setLoading(true);
    setError("");
    setNotice("");
    if (isOfflineGuestToken()) {
      setItems(compressHistoryList(loadHistory().map(normalizeHistoryRecord)));
      setLoading(false);
      return;
    }
    const local = loadHistory();
    const applyList = (records: HistoryRecord[]) => {
      setItems(compressHistoryList(mergeHistoryRecords(records, local)));
    };
    const loadRemote = () =>
      withAuthRetry(() => apiHistoryList(), refresh)
        .then((res) => applyList(res.records))
        .catch((e) => {
          if (local.length) {
            setItems(compressHistoryList(local.map(normalizeHistoryRecord)));
            if (isRecoverableApiFailure(e)) {
              setNotice("云端暂不可用，已显示本机保存的卦象");
            }
          } else {
            setError(formatApiErrorMessage(e, "加载失败"));
          }
        });

    void loadRemote().finally(() => setLoading(false));
  }, [pathname, auth.loading, auth.user, refresh]);

  const pending = items.find((h) => h.id === deleteId);

  const confirmDelete = async () => {
    if (!deleteId) return;
    if (isOfflineGuestToken()) {
      deleteHistoryRecord(deleteId);
      setItems((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
      return;
    }
    try {
      await withAuthRetry(() => apiHistoryDelete(deleteId), refresh);
      deleteHistoryRecord(deleteId);
      setItems((prev) => prev.filter((r) => r.id !== deleteId));
    } catch (e) {
      const local = getHistoryRecord(deleteId);
      if (local || isRecoverableApiFailure(e)) {
        if (local) deleteHistoryRecord(deleteId);
        setItems((prev) => prev.filter((r) => r.id !== deleteId));
        if (isRecoverableApiFailure(e)) {
          setNotice("已从本机移除；云端同步将在联网后完成");
        }
      } else {
        setError(formatApiErrorMessage(e, "删除失败"));
      }
    }
    setDeleteId(null);
  };

  if (auth.loading) {
    return (
      <PageShell>
        <GuideStage title="加载中" hint="正在读取卦象档案…" className="m-6" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between px-6 pt-7 sm:px-8">
        <h1 className="font-serif-cjk text-lg font-medium text-foreground">卦象档案</h1>
        <span className="tabular-nums text-xs text-muted-foreground">{items.length} 条</span>
      </div>
      <div className="flex flex-col gap-2 p-6 sm:p-8">
        {notice && <p className={SOFT_NOTICE_CLASS}>{notice}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {loading && (
          <GuideStage title="读取档案" hint="从云端加载历史卦象…" className="rounded-md border border-dashed border-border py-10" />
        )}
        {!loading && items.length === 0 && (
          <>
            <GuideStage
              title="卦象档案尚空"
              hint="每一次问卜都值得留存。"
              className="rounded-md border border-dashed border-border bg-secondary/30 py-10"
            />
            <div className="text-center">
              <GuardedDivineLink className="btn-gold inline-block text-xs">
                去起一卦
              </GuardedDivineLink>
            </div>
          </>
        )}
        {items.map((h, idx) => {
          const cat = CATEGORIES.find((c) => c.id === h.category) ?? CATEGORIES[0];
          const hexMissing = !h.benChar || h.benChar === "?" || !h.benName || h.benName === "?";
          return (
            <div
              key={h.id}
              className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3 transition hover:bg-secondary/50 animate-stagger"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <Link to="/history/$id" params={{ id: h.id }} className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={`text-2xl leading-none ${hexMissing ? "text-muted-foreground" : "text-foreground"}`}
                  title={hexMissing ? "卦象未记录完整" : undefined}
                >
                  {hexMissing ? "—" : h.benChar}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{h.question}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span
                      className="rounded-full border px-1.5 py-0.5"
                      style={{ background: cat.bg, color: cat.textColor, borderColor: cat.borderColor }}
                    >
                      {cat.label}
                    </span>
                    <span>{hexMissing ? "卦象未明" : `${h.benName}卦`}</span>
                    <span>{relativeTime(h.createdAt)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => setDeleteId(h.id)}
                aria-label="删除"
                className="rounded p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="删除这条卦象？"
        description={pending ? `「${pending.question}」删除后无法恢复。` : ""}
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}
