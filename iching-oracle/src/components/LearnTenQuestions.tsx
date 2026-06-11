import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GuardedDivineLink } from "@/components/home/DivineEntryLink";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Sparkles,
  X,
} from "lucide-react";
import { IncenseSmoke } from "@/components/RitualEffects";
import { playRitualSound, unlockRitualAudio } from "@/lib/ritual-sounds";
import { SLOGAN } from "@/lib/brand";
import {
  ICHING_TEN_QUESTIONS,
  questionNumeralByIndex,
  TEN_QUESTIONS_TOTAL,
  THEME_LABELS,
  type TenQuestion,
  type TenQuestionTheme,
} from "@/lib/iching-ten-questions";

const THEME_ORDER: TenQuestionTheme[] = ["culture", "method", "trust", "service"];

function ProgressRing({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="44" height="44" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border)" strokeWidth="2" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-medium text-[var(--gold)]">{pct}%</span>
    </div>
  );
}

function QuestionView({ item, index }: { item: TenQuestion; index: number }) {
  const theme = THEME_LABELS[item.theme];

  return (
    <article key={item.id} className="animate-slide-in">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-sm border border-[var(--gold)]/30 bg-[var(--bagua-active-bg)] px-2 py-0.5 text-[10px] tracking-wider text-[var(--gold)]">
          {theme.label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {item.num} · 第 {index + 1} / {TEN_QUESTIONS_TOTAL} 问
        </span>
      </div>

      <h2 className="font-serif-cjk text-xl font-medium leading-snug text-foreground sm:text-[1.35rem]">
        {item.question}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{item.tagline}</p>

      <blockquote className="relative mt-6 rounded-md border border-[var(--gold)]/20 bg-[var(--bagua-active-bg)] px-4 py-3.5">
        <p className="font-ritual-cjk text-base leading-relaxed text-[var(--gold)] sm:text-lg">
          {item.quote}
        </p>
      </blockquote>

      <p className="mt-5 whitespace-pre-line text-sm leading-[1.85] text-foreground/90">{item.answer}</p>
    </article>
  );
}

function FloatingQuestionPicker({
  open,
  activeId,
  readIds,
  onClose,
  onSelect,
}: {
  open: boolean;
  activeId: string;
  readIds: Set<string>;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="关闭选问面板"
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] anim-veil"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="选择问题"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-h-[min(52vh,420px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-md border border-border bg-card shadow-[0_8px_32px_rgba(44,36,22,0.14)] animate-fade-up"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <p className="text-xs font-medium text-foreground">选择一问</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 [-webkit-overflow-scrolling:touch]">
          {THEME_ORDER.map((theme) => {
            const qs = ICHING_TEN_QUESTIONS.filter((q) => q.theme === theme);
            return (
              <div key={theme}>
                <p className="sticky top-0 border-b border-border/60 bg-secondary/80 px-4 py-2 text-[10px] tracking-[0.15em] text-muted-foreground backdrop-blur-sm">
                  {THEME_LABELS[theme].label}
                </p>
                <ul>
                  {qs.map((q) => {
                    const active = q.id === activeId;
                    const read = readIds.has(q.id);
                    return (
                      <li key={q.id}>
                        <button
                          type="button"
                          onClick={() => {
                            unlockRitualAudio();
                            playRitualSound("ui-select");
                            onSelect(q.id);
                            onClose();
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                            active
                              ? "bg-[var(--bagua-active-bg)]"
                              : "hover:bg-secondary/50"
                          }`}
                        >
                          <span
                            className={`learn-q-num shrink-0 w-5 text-center ${
                              active ? "text-[var(--gold)]" : "text-muted-foreground"
                            }`}
                          >
                            {questionNumeralByIndex(
                              ICHING_TEN_QUESTIONS.findIndex((x) => x.id === q.id),
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm leading-snug text-foreground">
                              {q.question}
                            </span>
                          </span>
                          {read && (
                            <Check size={14} className="mt-0.5 shrink-0 text-[var(--gold)]" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function FloatingLearnNav({
  active,
  index,
  readCount,
  pickerOpen,
  onTogglePicker,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  active: TenQuestion;
  index: number;
  readCount: number;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-lg">
        {/* 进度点 */}
        <div className="mb-2 flex justify-center gap-1">
          {ICHING_TEN_QUESTIONS.map((q, i) => (
            <span
              key={q.id}
              aria-hidden
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-4 bg-[var(--gold)]"
                  : i < index
                    ? "w-1 bg-[var(--gold)]/50"
                    : "w-1 bg-border"
              }`}
            />
          ))}
        </div>

        <nav
          aria-label="十问导航"
          className="flex items-center gap-1 rounded-md border border-border bg-card/95 p-1.5 shadow-[0_4px_24px_rgba(44,36,22,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-card/90"
        >
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="上一问"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={onTogglePicker}
            aria-expanded={pickerOpen}
            aria-label="打开问题列表"
            className="group flex min-w-0 flex-1 items-stretch gap-1.5 rounded-sm px-1 py-1"
          >
            <span className="learn-q-num flex w-6 shrink-0 items-center justify-center self-center text-[var(--gold)]">
              {questionNumeralByIndex(index)}
            </span>
            <span className="min-w-0 flex-1 rounded-sm px-1.5 py-1.5 text-left transition group-hover:bg-[var(--bagua-active-bg)]">
              <span className="block truncate text-xs font-medium text-foreground">
                {active.question}
              </span>
              <span className="block text-[10px] text-muted-foreground">
                已读 {readCount}/10 · 点击选问
              </span>
            </span>
            <ChevronsUpDown
              size={14}
              className={`my-auto shrink-0 text-muted-foreground transition ${pickerOpen ? "rotate-180" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="下一问"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronRight size={20} />
          </button>
        </nav>
      </div>
    </div>
  );
}

export function LearnTenQuestions() {
  const [activeId, setActiveId] = useState(ICHING_TEN_QUESTIONS[0].id);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem("yice-learn-read");
    } catch {
      /* ignore */
    }
  }, []);

  const activeIndex = ICHING_TEN_QUESTIONS.findIndex((q) => q.id === activeId);
  const active = ICHING_TEN_QUESTIONS[activeIndex] ?? ICHING_TEN_QUESTIONS[0];

  const grouped = useMemo(
    () =>
      THEME_ORDER.map((theme, i) => ({
        theme,
        step: i + 1,
        questions: ICHING_TEN_QUESTIONS.filter((q) => q.theme === theme),
      })),
    [],
  );

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    markRead(activeId);
  }, [activeId, markRead]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      unlockRitualAudio();
      playRitualSound("page-turn");
      setActiveId(ICHING_TEN_QUESTIONS[activeIndex - 1].id);
    }
  }, [activeIndex]);

  const goNext = useCallback(() => {
    if (activeIndex < ICHING_TEN_QUESTIONS.length - 1) {
      unlockRitualAudio();
      playRitualSound("page-turn");
      setActiveId(ICHING_TEN_QUESTIONS[activeIndex + 1].id);
    }
  }, [activeIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pickerOpen) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, pickerOpen]);

  const readCount = readIds.size;
  const allRead = readCount >= ICHING_TEN_QUESTIONS.length;

  useEffect(() => {
    if (allRead) playRitualSound("hex-complete");
  }, [allRead]);
  const currentThemeStep = grouped.find((g) => g.theme === active.theme)?.step ?? 1;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-5 pt-6 text-center sm:px-8 sm:pt-7">
        <IncenseSmoke count={5} />

        <div className="relative mx-auto flex max-w-lg items-center justify-center gap-4">
          <div className="text-center">
            <h1 className="font-serif-cjk text-2xl font-medium text-foreground">易经十问</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              第 {currentThemeStep} 部分 · {THEME_LABELS[active.theme].label}
            </p>
          </div>
          <ProgressRing value={readCount} total={ICHING_TEN_QUESTIONS.length} />
        </div>

        {allRead && (
          <div className="relative mx-auto mt-4 inline-flex animate-yao-pop items-center gap-2 rounded-md border border-[var(--gold)]/35 bg-[var(--bagua-active-bg)] px-4 py-2">
            <Sparkles size={14} className="text-[var(--gold)]" />
            <span className="text-xs text-[var(--gold)]">十问已尽读 · 可以诚心起卦了</span>
          </div>
        )}
      </section>

      {/* 单问阅读区 */}
      <section className="min-h-[50vh] px-6 pb-6 pt-2 sm:px-8">
        <QuestionView item={active} index={activeIndex} />
      </section>

      {/* 起卦引导 — 与阅读区明确分隔 */}
      <section
        aria-labelledby="learn-cta-heading"
        className="border-t-2 border-[var(--gold)]/40 bg-secondary/55 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6 sm:pt-7"
      >
        <p className="text-center text-[10px] tracking-[0.4em] text-muted-foreground">读毕 · 可起卦</p>

        <div className="mx-6 mt-5 rounded-md border border-border bg-card px-5 py-5 text-center sm:mx-8 sm:px-6">
          <h2 id="learn-cta-heading" className="font-ritual-cjk text-lg leading-snug text-[var(--gold)] sm:text-xl">
            {SLOGAN}
          </h2>
          <p className="mt-2 text-[11px] text-muted-foreground">问清一事 · 静观其象 · 笃定前行</p>
          <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-2.5">
            <GuardedDivineLink
              returnPath="/learn"
              className="btn-gold inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 px-5 py-2 text-sm sm:flex-initial sm:px-6 sm:py-2.5"
            >
              开始起卦
              <ArrowRight size={14} aria-hidden />
            </GuardedDivineLink>
            <Link
              to="/history"
              className="inline-flex min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-sm border border-border px-3 py-2 text-[10px] tracking-[0.12em] text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:py-2"
            >
              查看卦档
            </Link>
          </div>
        </div>
      </section>

      <FloatingQuestionPicker
        open={pickerOpen}
        activeId={activeId}
        readIds={readIds}
        onClose={() => setPickerOpen(false)}
        onSelect={setActiveId}
      />

      <FloatingLearnNav
        active={active}
        index={activeIndex}
        readCount={readCount}
        pickerOpen={pickerOpen}
        onTogglePicker={() => {
          setPickerOpen((o) => {
            if (!o) {
              unlockRitualAudio();
              playRitualSound("panel-open");
            }
            return !o;
          });
        }}
        onPrev={goPrev}
        onNext={goNext}
        hasPrev={activeIndex > 0}
        hasNext={activeIndex < ICHING_TEN_QUESTIONS.length - 1}
      />
    </>
  );
}
