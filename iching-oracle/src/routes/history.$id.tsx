import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2, MessageSquare } from "lucide-react";
import { DivineEntryLink } from "@/components/home/DivineEntryLink";
import { PageShell } from "@/components/SiteNav";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { FollowUpChatDialog } from "@/components/FollowUpChatDialog";
import {
  FollowUpPersonaSwitch,
  followUpPersonaShortLabel,
} from "@/components/FollowUpPersonaSwitch";
import {
  loadFollowUpPersona,
  saveFollowUpPersona,
  type FollowUpPersona,
} from "@/lib/follow-up-persona";
import { HexagramFactsPanel } from "@/components/HexagramFactsPanel";
import { InterpretationView } from "@/components/InterpretationView";
import {
  CATEGORIES,
  relativeTime,
  isPresetQuestion,
  getHistoryRecord,
  deleteHistoryRecord,
  findNearLocalHistory,
  resolveHistoryById,
  type HistoryRecord,
} from "@/lib/iching";
import { mergeHistoryRecords, normalizeHistoryRecord } from "@/lib/history-display";
import { buildFollowUpHints } from "@/lib/common-questions";
import { extractInterpretFacts } from "@/lib/interpret-facts";
import { ShareCardDialog, ShareCardTriggerButton } from "@/components/ShareCardDialog";
import { parseSections, type InterpretSection } from "@/lib/interpret.local";
import type { ShareCardData } from "@/lib/share-card";
import { apiHistoryDelete, apiHistoryGet, isOfflineGuestToken } from "@/lib/api";
import {
  formatApiErrorMessage,
  isRecoverableApiFailure,
  SOFT_NOTICE_CLASS,
  withAuthRetry,
} from "@/lib/api-errors";
import { useRequireUser } from "@/lib/auth";

export const Route = createFileRoute("/history/$id")({ component: HistoryDetail });

const YAO_POS = ["初", "二", "三", "四", "五", "上"];

function HistoryDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const auth = useRequireUser();
  const { refresh } = auth;
  const [rec, setRec] = useState<HistoryRecord | null | undefined>(undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [followUpSeed, setFollowUpSeed] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [followUpPersona, setFollowUpPersona] = useState<FollowUpPersona>(() => loadFollowUpPersona());

  const handleFollowUpPersonaChange = (next: FollowUpPersona) => {
    setFollowUpPersona(next);
    saveFollowUpPersona(next);
  };
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    setError("");
    setNotice("");

    const localFirst = resolveHistoryById(id);
    if (localFirst) setRec(normalizeHistoryRecord(localFirst));

    if (isOfflineGuestToken()) {
      setRec(localFirst ? normalizeHistoryRecord(localFirst) : null);
      return;
    }

    void withAuthRetry(() => apiHistoryGet(id), refresh)
      .then((r) => {
        const near = findNearLocalHistory(r.question, r.createdAt);
        const local = getHistoryRecord(id) ?? near;
        const [merged] = mergeHistoryRecords([r], local ? [local] : []);
        setRec(merged ?? normalizeHistoryRecord(r));
      })
      .catch((e) => {
        const local = resolveHistoryById(id);
        if (local) {
          setRec(normalizeHistoryRecord(local));
          if (isRecoverableApiFailure(e)) {
            setNotice("云端暂不可用，已显示本机保存的卦象");
          }
          return;
        }
        setError(formatApiErrorMessage(e, "加载失败"));
        setRec(null);
      });
  }, [id, auth.loading, auth.user, refresh]);

  const sections = useMemo((): InterpretSection[] => {
    if (rec?.sections?.length) return rec.sections as InterpretSection[];
    return rec?.interpretation ? parseSections(rec.interpretation) : [];
  }, [rec?.sections, rec?.interpretation]);

  const shareCardData = useMemo<ShareCardData | null>(() => {
    if (!rec) return null;
    return {
      benName: rec.benName,
      benChar: rec.benChar,
      bianName: rec.bianName ?? null,
      bianChar: rec.bianChar ?? null,
      category: rec.category,
      question: rec.question,
      changingLine: rec.changingLine,
      sections,
      createdAt: rec.createdAt,
    };
  }, [rec, sections]);

  const followUpHints = useMemo(() => {
    if (!rec) return { greeting: "", suggestions: [] as string[] };
    const hints = buildFollowUpHints(rec.question, rec.category, followUpPersona);
    if (!rec.followUp) return hints;
    return { ...rec.followUp, greeting: hints.greeting ?? rec.followUp.greeting };
  }, [rec, followUpPersona]);

  if (auth.loading || rec === undefined) {
    return (
      <PageShell>
        <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
      </PageShell>
    );
  }

  if (rec === null) {
    return (
      <PageShell>
        <div className="p-8 text-center text-sm text-muted-foreground">
          <h1 className="font-serif-cjk text-lg font-medium text-foreground">找不到记录</h1>
          <p className="mt-2">{error || "这条卦象可能已被删除。"}</p>
          <Link to="/history" className="mt-3 inline-block text-foreground underline">返回历史</Link>
        </div>
      </PageShell>
    );
  }

  const cat = CATEGORIES.find((c) => c.id === rec.category)!;
  const facts =
    rec.facts ??
    extractInterpretFacts({
      category: rec.category,
      question: rec.question,
      benName: rec.benName,
      bianName: rec.bianName ?? null,
      changingLine: rec.changingLine,
      yao: rec.yao,
    });

  const openFollowUp = (message?: string) => {
    setFollowUpSeed(message?.trim() || null);
    setChatOpen(true);
  };

  const handleDelete = async () => {
    if (!rec) return;
    if (isOfflineGuestToken()) {
      deleteHistoryRecord(rec.id);
      navigate({ to: "/history" });
      return;
    }
    try {
      await withAuthRetry(() => apiHistoryDelete(rec.id), refresh);
      deleteHistoryRecord(rec.id);
      navigate({ to: "/history" });
    } catch (e) {
      if (isRecoverableApiFailure(e) || getHistoryRecord(rec.id)) {
        deleteHistoryRecord(rec.id);
        navigate({ to: "/history" });
        return;
      }
      setError(formatApiErrorMessage(e, "删除失败"));
      setDeleteOpen(false);
    }
  };

  return (
    <PageShell>
      <div className="px-6 py-7 sm:px-8">
        {notice && <p className={`mb-4 ${SOFT_NOTICE_CLASS}`}>{notice}</p>}
        <div className="mb-5 flex items-center justify-between text-xs">
          <Link to="/history" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} aria-hidden /> 返回历史
          </Link>
          <time dateTime={new Date(rec.createdAt).toISOString()} className="text-muted-foreground">
            {new Date(rec.createdAt).toLocaleString("zh-CN")}
          </time>
        </div>

        <h1 className="sr-only">{rec.benName}卦 · {rec.question}</h1>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-5">
            <div className="text-center">
              <div className="text-4xl leading-none text-foreground">{rec.benChar}</div>
              <div className="mt-1 text-xs text-muted-foreground">{rec.benName}卦</div>
            </div>
            {rec.bianChar && (
              <>
                <div className="text-lg text-muted-foreground" aria-hidden>→</div>
                <div className="text-center">
                  <div className="text-4xl leading-none text-foreground">{rec.bianChar}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{rec.bianName}卦（变）</div>
                </div>
              </>
            )}
          </div>
          <div className="min-w-0 text-right text-xs text-muted-foreground">
            <span
              className="inline-block rounded-full border px-2 py-0.5"
              style={{ background: cat.bg, color: cat.textColor, borderColor: cat.borderColor }}
            >
              {cat.label}
            </span>
            {rec.changingLine ? <div className="mt-1">第{YAO_POS[rec.changingLine - 1]}爻动</div> : null}
            <div className="mt-1 max-w-[220px] break-words text-foreground">{rec.question}</div>
            <div className="mt-1 text-[11px]">{relativeTime(rec.createdAt)}</div>
          </div>
        </div>

        {facts ? (
          <div className="mb-4">
            <HexagramFactsPanel facts={facts} category={rec.category} />
          </div>
        ) : null}

        <InterpretationView text={rec.interpretation} sections={sections} animate={false} />

        {followUpHints.greeting || followUpHints.suggestions.length > 0 ? (
          <div className="mt-4 rounded-lg border border-border/80 bg-secondary/30 px-4 py-3">
            {followUpHints.greeting ? (
              <p className="text-[12px] leading-relaxed text-foreground/85">{followUpHints.greeting}</p>
            ) : null}
            {followUpHints.suggestions.length > 0 ? (
              <div className={`flex flex-wrap gap-1.5${followUpHints.greeting ? " mt-2.5" : ""}`}>
                {followUpHints.suggestions.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => openFollowUp(chip)}
                    className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-foreground/75 transition hover:border-[var(--gold)]/40 hover:text-foreground"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <FollowUpPersonaSwitch
          className="mt-4"
          value={followUpPersona}
          onChange={handleFollowUpPersonaChange}
        />

        <div className="mt-5 flex flex-wrap gap-2">
          <DivineEntryLink
            returnPath={`/history/${rec.id}`}
            search={{
              category: rec.category,
              q: rec.question,
              skipEntry: true,
              step: isPresetQuestion(rec.question, rec.category) ? 2 : undefined,
            }}
            className="flex-1 min-w-[100px] rounded-lg border border-[var(--gold)]/35 bg-[var(--bagua-active-bg)] px-3 py-2.5 text-center text-xs text-foreground transition-opacity hover:opacity-90"
          >
            再起一卦
          </DivineEntryLink>
          <button
            type="button"
            onClick={() => openFollowUp()}
            title={`以「${followUpPersonaShortLabel(followUpPersona)}」语气追问，可在上方切换`}
            className="flex-1 min-w-[100px] rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-secondary"
          >
            <MessageSquare size={13} className="mr-1 inline" aria-hidden />
            深入追问
            <span className="ml-1 text-[10px] text-[var(--gold)]">
              · {followUpPersonaShortLabel(followUpPersona)}
            </span>
          </button>
          <ShareCardTriggerButton onClick={() => setShareOpen(true)} />
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex-1 min-w-[100px] rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 size={13} className="mr-1 inline" aria-hidden />
            删除此卦
          </button>
        </div>
      </div>

      <ShareCardDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        data={shareCardData}
      />

      <FollowUpChatDialog
        open={chatOpen}
        onOpenChange={(open) => {
          setChatOpen(open);
          if (!open) setFollowUpSeed(null);
        }}
        followUpHints={followUpHints}
        initialMessage={followUpSeed}
        autoSubmitInitial={!!followUpSeed}
        persona={followUpPersona}
        onPersonaChange={handleFollowUpPersonaChange}
        ctx={{
          category: rec.category,
          question: rec.question,
          benName: rec.benName,
          bianName: rec.bianName ?? null,
          changingLine: rec.changingLine,
          interpretation: rec.interpretation,
          yao: rec.yao,
          facts,
        }}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除这条卦象？"
        description={`「${rec.question}」删除后无法恢复。`}
        onConfirm={handleDelete}
      />
    </PageShell>
  );
}
