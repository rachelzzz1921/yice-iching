import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check, Coins, Sprout, Flower2, Keyboard, RotateCw, MessageSquare,
  Bookmark,
} from "lucide-react";
import { AuthEntryChoice } from "@/components/AuthEntryChoice";
import { PageShell } from "@/components/SiteNav";
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
import {
  HexCompleteReveal, RitualEntryGate, RitualOverlay, RitualAltarFrame, MethodSwitchFlash,
  CAST_METHOD_META, getCastCopy, runCastSequence, type CastPhase,
} from "@/components/RitualEffects";
import {
  CATEGORIES, QUESTIONS, hexFromYao, tossCoins, yarrowYao, meihuaToYao,
  meihuaFromDate, meihuaTrigramIndex, meihuaChangingLine,
  saveHistoryRecord,
  loadHistory,
  rekeyHistoryRecord,
  resolveQuestionFromSearch,
  type CategoryId,
  type CoinYao,
} from "@/lib/iching";
import { interpretReading } from "@/lib/interpret.functions";
import {
  apiInterpretReading,
  ApiError,
  getToken,
  isOfflineGuestToken,
} from "@/lib/api";
import {
  assertOfflineGuestCanInterpret,
  recordOfflineGuestUse,
} from "@/lib/guest-quota";
import { isRecoverableApiFailure, SOFT_NOTICE_CLASS } from "@/lib/api-errors";
import { isOfflineGuest, useAuth } from "@/lib/auth";
import { needsAuthEntryChoice } from "@/lib/auth-entry";
import { TRIGRAMS } from "@/lib/iching";
import { isValidCategory, isValidMethod, loadProfile, type CastMethod } from "@/lib/profile";
import { exitToPrevious, parseReturnPath } from "@/lib/navigation";
import { playRitualSound, unlockRitualAudio } from "@/lib/ritual-sounds";
import { GuideAside, GuideStage } from "@/components/GuideCallout";
import { HexagramFactsPanel } from "@/components/HexagramFactsPanel";
import { MembershipRedeemCard } from "@/components/MembershipRedeemCard";
import { ShareCardDialog, ShareCardTriggerButton } from "@/components/ShareCardDialog";
import type { ShareCardData } from "@/lib/share-card";
import { InterpretationView } from "@/components/InterpretationView";
import { buildFollowUpHints } from "@/lib/common-questions";
import {
  clearDivineDraft,
  draftMatchesSession,
  loadDivineDraft,
  saveDivineDraft,
} from "@/lib/divine-draft";
import { ZhipuTestPanel } from "@/components/ZhipuTestPanel";
import { generateRandomId } from "@/lib/random-id";
import { CAST_METHOD_GUIDES } from "@/lib/cast-method-guide";
import { HexagramTipCard } from "@/components/HexagramTipCard";

type DivineSearch = {
  method?: CastMethod;
  category?: CategoryId;
  q?: string;
  skipEntry?: boolean;
  step?: 1 | 2 | 3;
  /** 站内返回路径，如 /?page=3 */
  return?: string;
};

function parseStep(raw: unknown): 1 | 2 | 3 | undefined {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return undefined;
}

export const Route = createFileRoute("/divine")({
  validateSearch: (search: Record<string, unknown>): DivineSearch => {
    const skipEntry =
      search.skipEntry === true || search.skipEntry === "true" || search.skipEntry === "1";
    return {
      method: isValidMethod(search.method) ? search.method : undefined,
      category: isValidCategory(search.category) ? search.category : undefined,
      q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
      ...(skipEntry ? { skipEntry: true as const } : {}),
      step: parseStep(search.step),
      return: parseReturnPath(search.return),
    };
  },
  component: DivinePage,
});

type Method = CastMethod;
const METHODS: { id: Method; label: string; desc: string; icon: React.ReactNode; seal: string; mantra: string; epithet: string }[] = [
  { id: "coin",    label: "铜钱摇卦", desc: "三枚铜钱各抛三次，最经典", icon: <Coins size={20} />,    ...CAST_METHOD_META.coin },
  { id: "yarrow",  label: "蓍草数",   desc: "概率正统，仪式郑重",       icon: <Sprout size={20} />,   ...CAST_METHOD_META.yarrow },
  { id: "meihua",  label: "梅花易数", desc: "取三个数字即可成卦",       icon: <Flower2 size={20} />,  ...CAST_METHOD_META.meihua },
  { id: "direct",  label: "直接输入", desc: "已知 6 爻阴阳，直接填写", icon: <Keyboard size={20} />, ...CAST_METHOD_META.direct },
];

const YAO_POS = ["初", "二", "三", "四", "五", "上"];
const SANCAI = ["天", "人", "地"];
const YARROW_STAGES = ["分二", "挂一", "揲四", "归奇"];

function DivinePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const auth = useAuth();
  const profile = loadProfile();

  const divineReturnHref =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/divine";

  const mustChooseEntry =
    !auth.loading && (!auth.user || needsAuthEntryChoice(!!auth.user));

  if (mustChooseEntry) {
    return (
      <PageShell>
        <div className="page-content-inner mx-auto max-w-sm py-8 sm:py-10">
          <AuthEntryChoice returnHref={divineReturnHref} />
        </div>
      </PageShell>
    );
  }

  if (auth.loading && (!auth.user || needsAuthEntryChoice(!!auth.user))) {
    return (
      <PageShell>
        <div className="page-content-inner py-16 text-center text-sm text-muted-foreground">
          正在确认身份…
        </div>
      </PageShell>
    );
  }
  const initialResolved = resolveQuestionFromSearch(search.category, search.q);
  const shouldSkipQuestionStep =
    initialResolved.qPreset && search.step !== 1 && search.step !== 3;

  const [method, setMethod] = useState<Method>(search.method ?? profile.defaultMethod);

  const initialDraft = (() => {
    const d = loadDivineDraft();
    if (!d) return null;
    const q = initialResolved.custom.trim() || initialResolved.question;
    const m = search.method ?? profile.defaultMethod;
    return draftMatchesSession(d, initialResolved.category, q, m) ? d : null;
  })();

  const [yaoList, setYaoList] = useState<CoinYao[]>(() => initialDraft?.yaoList ?? []);

  const [step, setStepRaw] = useState<1 | 2 | 3>(() => {
    const requested = search.step;
    if (requested === 3) {
      return initialDraft?.yaoList.length === 6 ? 3 : 2;
    }
    if (requested != null) return requested;
    if (shouldSkipQuestionStep) return 2;
    return 1;
  });
  const [category, setCategory] = useState<CategoryId>(initialResolved.category);
  const [question, setQuestion] = useState<string>(initialResolved.question);
  const [custom, setCustom] = useState(initialResolved.custom);
  const [entered, setEntered] = useState(search.skipEntry || !profile.ritualGuide);

  const effectiveQuestion = custom.trim() || question;

  const buildSearch = (s: 1 | 2 | 3, overrides?: Partial<DivineSearch>): DivineSearch => ({
    category,
    q: effectiveQuestion,
    method,
    skipEntry: search.skipEntry || undefined,
    step: s === 1 ? undefined : s,
    ...overrides,
  });

  const persistCastDraft = () => {
    if (yaoList.length !== 6) return;
    saveDivineDraft({
      yaoList,
      method,
      category,
      question: effectiveQuestion,
      updatedAt: Date.now(),
    });
  };

  const setStep = (s: 1 | 2 | 3) => {
    const next: 1 | 2 | 3 = s === 3 && yaoList.length !== 6 ? 2 : s;
    if (next === 3) persistCastDraft();
    playRitualSound("ui-step");
    setStepRaw(next);
    void navigate({
      to: "/divine",
      search: buildSearch(next),
      replace: true,
    });
  };

  const stepForBar: 1 | 2 | 3 = step === 3 && yaoList.length !== 6 ? 2 : step;

  useEffect(() => {
    if (search.step == null) return;
    if (search.step === 3 && yaoList.length !== 6) {
      const draft = loadDivineDraft();
      if (
        draft &&
        draftMatchesSession(draft, category, effectiveQuestion, method)
      ) {
        setYaoList(draft.yaoList);
        setStepRaw(3);
        return;
      }
      if (step !== 2) {
        setStepRaw(2);
        void navigate({
          to: "/divine",
          search: buildSearch(2),
          replace: true,
        });
      }
      return;
    }
    if (search.step !== step) setStepRaw(search.step);
  }, [search.step, yaoList.length, category, effectiveQuestion, method, step, navigate]);

  useEffect(() => {
    const resolved = resolveQuestionFromSearch(search.category, search.q);
    setCategory(resolved.category);
    setQuestion(resolved.question);
    setCustom(resolved.custom);
  }, [search.category, search.q]);

  useEffect(() => {
    if (search.method) setMethod(search.method);
  }, [search.method]);

  const reset = () => {
    clearDivineDraft();
    setStepRaw(1);
    setYaoList([]);
    setCategory("career");
    setQuestion(QUESTIONS.career[0]);
    setCustom("");
    setEntered(!profile.ritualGuide);
    void navigate({
      to: "/divine",
      search: { skipEntry: search.skipEntry || undefined },
      replace: true,
    });
  };

  return (
    <PageShell>
      <div className="page-content-inner">
        <h1 className="sr-only">问卜</h1>
        <div className="divine-flow-head">
          {search.return ? (
            <Link
              to={search.return}
              className="divine-flow-back inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft size={14} aria-hidden />
              返回
            </Link>
          ) : (
            <a
              href="/"
              className="divine-flow-back inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                exitToPrevious(router, { returnPath: search.return });
              }}
            >
              <ArrowLeft size={14} aria-hidden />
              返回
            </a>
          )}
          <StepBar step={stepForBar} onGo={(s) => { if (s < step) setStep(s); }} />
        </div>
        {step === 1 && !entered && (
          <div className="animate-fade-up">
            <RitualEntryGate onEnter={() => setEntered(true)} />
          </div>
        )}
        {step === 1 && entered && (
          <div key="question" className="animate-fade-up">
            <QuestionStep
              category={category}
              setCategory={(c) => {
                setCategory(c);
                setQuestion(QUESTIONS[c][0]);
                setCustom("");
              }}
              question={question}
              setQuestion={setQuestion}
              custom={custom}
              setCustom={setCustom}
              onNext={() => setStep(2)}
            />
          </div>
        )}
        {step === 2 && (
          <div key="method" className="animate-fade-up">
            <MethodStep
              method={method}
              setMethod={(m) => {
                setMethod(m);
                setYaoList([]);
                clearDivineDraft();
              }}
              yaoList={yaoList}
              setYaoList={setYaoList}
              question={custom.trim() || question}
              onConfirm={() => {
                if (yaoList.length === 6) {
                  saveDivineDraft({
                    yaoList,
                    method,
                    category,
                    question: effectiveQuestion,
                    updatedAt: Date.now(),
                  });
                }
                setStep(3);
              }}
            />
          </div>
        )}
        {step === 3 && (
          <div key="result" className="animate-fade-up">
            {yaoList.length === 6 ? (
              <ResultStep
                yaoList={yaoList}
                category={category}
                question={custom.trim() || question}
                castMethod={method}
                onAgain={reset}
                onBackToCast={() => setStep(2)}
              />
            ) : (
              <div className="text-center">
                <GuideStage
                  title="六爻未齐"
                  hint="请先完成起卦，得齐六爻后再进入解读。"
                  className="rounded-lg border border-border bg-secondary/40 py-10"
                />
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-gold mt-3 inline-block text-xs"
                >
                  返回起卦
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── Step bar ───────────────────────────────────────────────────────────────
function StepBar({ step, onGo }: { step: 1 | 2 | 3; onGo?: (s: 1 | 2 | 3) => void }) {
  const items: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "问题" }, { n: 2, label: "起卦" }, { n: 3, label: "解读" },
  ];
  return (
    <ol className="step-bar mx-auto mb-5 list-none sm:mb-7" aria-label="问卜步骤">
      {items.map((it, i) => {
        const done = step > it.n;
        const active = step === it.n;
        const canBack = done && !!onGo;
        return (
          <li key={it.n} className="step-bar-item">
            {canBack ? (
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onGo!(it.n)}
                className="step-bar-btn"
              >
                <div className={`step-bar-dot is-done`}>
                  <Check size={11} className="animate-yao-pop" aria-hidden />
                </div>
                <span className="step-bar-label">{it.label}</span>
              </button>
            ) : (
              <div
                className="step-bar-btn step-bar-btn--static"
                aria-current={active ? "step" : undefined}
              >
                <div
                  className={`step-bar-dot${done ? " is-done" : ""}${active ? " is-active" : ""}`}
                >
                  {done ? <Check size={11} className="animate-yao-pop" aria-hidden /> : it.n}
                </div>
                <span className={`step-bar-label${active ? " is-active" : ""}`}>{it.label}</span>
              </div>
            )}
            {i < 2 ? (
              <div
                className={`step-bar-rail${step > it.n ? " is-filled" : ""}`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 2: choose method ──────────────────────────────────────────────────
function MethodStep({ method, setMethod, yaoList, setYaoList, question, onConfirm }: {
  method: Method;
  setMethod: (m: Method) => void;
  yaoList: CoinYao[];
  setYaoList: React.Dispatch<React.SetStateAction<CoinYao[]>>;
  question: string;
  onConfirm: () => void;
}) {
  const [showComplete, setShowComplete] = useState(false);
  const [methodFlash, setMethodFlash] = useState<Method | null>(null);
  const prevLen = useRef(yaoList.length);

  useEffect(() => {
    if (yaoList.length > prevLen.current && yaoList.length <= 6) {
      playRitualSound("yao-line");
    }
    if (yaoList.length === 6 && prevLen.current < 6) {
      setShowComplete(true);
    }
    prevLen.current = yaoList.length;
  }, [yaoList.length]);

  const pickMethod = (m: Method) => {
    if (m === method) return;
    unlockRitualAudio();
    playRitualSound("ui-select");
    setMethod(m);
    setYaoList([]);
    setShowComplete(false);
    setMethodFlash(m);
  };

  return (
    <>
      <div className="mb-4 animate-stagger rounded-lg border border-border bg-secondary/40 px-3.5 py-2.5">
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground">所问</p>
        <p className="mt-0.5 text-sm text-foreground">{question}</p>
      </div>
      <p className="mb-4 animate-stagger text-sm text-muted-foreground">问事既明，选一种起卦方式，默念所问而观象</p>
      <GuideAside className="mb-4" reverse>
        四式任选，心诚则灵。起卦是观象明势，不是算命抽签——详见
        <Link to="/learn" className="mx-0.5 text-[var(--gold)] underline underline-offset-2">
          易经十问
        </Link>
        第三、四、六问。
      </GuideAside>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {METHODS.map((m, idx) => {
          const selected = method === m.id;
          return (
            <button key={m.id} onClick={() => pickMethod(m.id)}
              className={`group relative overflow-hidden rounded-lg border p-4 text-left transition-[transform,opacity,box-shadow,border-color,background-color] duration-300 hover:-translate-y-0.5 hover:shadow-md animate-stagger ${
                selected
                  ? "border-[1.5px] border-[var(--gold)] bg-[var(--bagua-active-bg)] shadow-[0_4px_18px_-6px_color-mix(in_oklab,var(--gold)_35%,transparent)]"
                  : "border-border bg-secondary/40 hover:bg-secondary"
              }`}
              style={{ animationDelay: `${idx * 80}ms` }}>
              {selected && (
                <>
                  <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[var(--gold)]/15 blur-xl" />
                  <span className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm border-2 border-[var(--vermillion)]/80 text-[var(--vermillion)] animate-stamp">
                    <span className="font-serif-cjk text-sm font-bold">{m.seal}</span>
                  </span>
                </>
              )}
              <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg] ${
                selected ? "bg-white text-[var(--gold)] shadow-sm" : "bg-background text-muted-foreground"
              }`}>{m.icon}</div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {m.label}
                {selected && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-breathe" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{m.desc}</p>
              <p className="mt-1 text-[10px] tracking-[0.18em] text-[var(--gold)]/75">{m.epithet} · {m.mantra}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-[var(--gold)]/20 bg-[var(--bagua-active-bg)]/35 px-3.5 py-3 animate-stagger">
        <p className="text-[10px] tracking-[0.14em] text-[var(--gold)]">
          {CAST_METHOD_GUIDES[method].label} · 注解
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/90">
          {CAST_METHOD_GUIDES[method].strength}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/80">
          {CAST_METHOD_GUIDES[method].whyNotFortune}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">{CAST_METHOD_GUIDES[method].whenToUse}</p>
      </div>

      <div className="relative mt-6 animate-stagger" style={{ animationDelay: "320ms" }}>
        <MethodSwitchFlash method={methodFlash} />
        <div key={method} className="ritual-panel-enter">
          {method === "coin"   && <CoinRitual yaoList={yaoList} setYaoList={setYaoList} onComplete={() => setShowComplete(true)} />}
          {method === "yarrow" && <YarrowRitual yaoList={yaoList} setYaoList={setYaoList} onComplete={() => setShowComplete(true)} />}
          {method === "meihua" && <MeihuaForm setYaoList={setYaoList} yaoList={yaoList} onComplete={() => setShowComplete(true)} />}
          {method === "direct" && <DirectForm setYaoList={setYaoList} yaoList={yaoList} onComplete={() => setShowComplete(true)} />}
        </div>
      </div>

      {yaoList.length === 6 && (
        <>
          <HexCompleteReveal show={showComplete} label={CAST_METHOD_META[method].completeLabel} />
          <div className="mt-5 text-center animate-yao-pop">
            <button onClick={onConfirm}
              className="group inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-2.5 text-sm font-medium text-background transition hover:opacity-90 hover:gap-3 animate-glow-pulse">
              下一步：观解读
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}

const MEIHUA_LINE = "bg-[#7a2f5b]";
const MEIHUA_LINE_CHANGING =
  "bg-[var(--gold)] shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_50%,transparent)]";

function YaoLineBar({
  yang,
  changing,
  solidW,
  brokenW,
}: {
  yang: 0 | 1;
  changing: boolean;
  solidW: string;
  brokenW: string;
}) {
  const cls = changing ? MEIHUA_LINE_CHANGING : MEIHUA_LINE;
  if (yang === 1) {
    return <div className={`h-[3px] rounded-sm ${cls} ${solidW}`} />;
  }
  return (
    <div className={`flex gap-[2px] ${brokenW}`}>
      <div className={`h-[3px] flex-1 rounded-sm ${cls}`} />
      <div className={`h-[3px] flex-1 rounded-sm ${cls}`} />
    </div>
  );
}

/** 三爻卦画（下卦 / 上卦） */
function TrigramGlyph({ bits }: { bits?: readonly [number, number, number] }) {
  if (!bits) {
    return <span className="text-[10px] text-muted-foreground">待定</span>;
  }
  return (
    <div className="flex flex-col-reverse items-center gap-[3px]" aria-hidden>
      {[...bits].reverse().map((bit, k) => (
        <YaoLineBar
          key={k}
          yang={bit as 0 | 1}
          changing={false}
          solidW="w-7"
          brokenW="w-7"
        />
      ))}
    </div>
  );
}

/** 六爻成卦预览（动爻高亮） */
function MiniHexagramGlyph({ yaoList }: { yaoList: CoinYao[] | null }) {
  if (!yaoList?.length) {
    return <span className="text-[10px] text-muted-foreground">待定</span>;
  }
  return (
    <div
      className="flex flex-col-reverse items-center gap-[1.5px]"
      role="img"
      aria-label="六爻成卦，动爻以金色标示"
    >
      {yaoList.map((y, i) => (
        <div key={i} className="flex items-center gap-[2px]">
          <YaoLineBar
            yang={y.yang}
            changing={y.changing}
            solidW="w-5"
            brokenW="w-5"
          />
          {y.changing ? (
            <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--gold)] animate-breathe" aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function YaoPreview({ yaoList }: { yaoList: CoinYao[] }) {
  return (
    <div className="mt-4 flex flex-col-reverse items-center gap-1.5">
      {yaoList.map((y, i) => (
        <div key={i} className="flex items-center gap-1.5 animate-yao-pop"
             style={{ animationDelay: `${i * 70}ms` }}>
          <span className="w-3 text-right text-[9px] text-muted-foreground/70">{i + 1}</span>
          {y.yang === 1
            ? <div className={`h-[6px] w-[56px] rounded-sm ${y.changing ? "bg-[var(--gold)] shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_55%,transparent)]" : "bg-foreground"}`} />
            : <>
                <div className={`h-[6px] w-[24px] rounded-sm ${y.changing ? "bg-[var(--gold)] shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_55%,transparent)]" : "bg-foreground"}`} />
                <div className={`h-[6px] w-[24px] rounded-sm ${y.changing ? "bg-[var(--gold)] shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_55%,transparent)]" : "bg-foreground"}`} />
              </>}
          {y.changing && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-breathe" />
          )}
        </div>
      ))}
    </div>
  );
}

function CoinRitual({ yaoList, setYaoList, onComplete }: {
  yaoList: CoinYao[];
  setYaoList: React.Dispatch<React.SetStateAction<CoinYao[]>>;
  onComplete?: () => void;
}) {
  const last = yaoList[yaoList.length - 1];
  const flipKey = yaoList.length;
  const done = yaoList.length === 6;
  const castIndex = yaoList.length;
  const copy = getCastCopy("coin", castIndex);
  const [phase, setPhase] = useState<CastPhase>("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const cast = () => {
    if (phase !== "idle") return;
    unlockRitualAudio();
    playRitualSound("coin-flip-spin");
    cleanupRef.current?.();
    cleanupRef.current = runCastSequence(setPhase, () => {
      const next = [...yaoList, tossCoins()];
      setYaoList(next);
      if (next.length === 6) onComplete?.();
    }, { withSeal: yaoList.length === 5 });
  };

  const prevFlip = useRef(0);
  useEffect(() => {
    if (flipKey > prevFlip.current && last) {
      playRitualSound("coin-land");
    }
    prevFlip.current = flipKey;
  }, [flipKey, last]);

  return (
    <RitualAltarFrame
      method="coin"
      activeStep={yaoList.length === 0 ? 0 : done ? 3 : 2}
      overlay={<RitualOverlay type="coin" phase={phase} castIndex={castIndex} />}
    >
      <p className="text-[11px] tracking-[0.3em] opacity-75">{done ? "卦成 · 收钱" : copy.hint}</p>
      <p className="mt-2 font-serif text-base font-medium">
        {done ? CAST_METHOD_META.coin.completeLabel : copy.title}
      </p>

      {/* coins as ancient square-holed copper */}
      <div className="relative my-5 flex justify-center gap-6" style={{ perspective: "700px" }}>
        {(last?.coins ?? ["正", "正", "正"]).map((c, i) => (
          <div key={`wrap-${flipKey}-${i}`} className="flex flex-col items-center gap-1.5">
            <div
              key={`${flipKey}-${i}`}
              className={`animate-coin-flip relative flex h-14 w-14 items-center justify-center rounded-full text-[10px] font-medium shadow-[0_3px_8px_-2px_rgba(99,56,6,0.35)] ${
                c === "正"
                  ? "border-[1.5px] border-[#B8860B] bg-[radial-gradient(circle_at_30%_30%,#FDE9C9,#E8B65A_60%,#A8732A)] text-[#3d1f00]"
                  : "border-[1.5px] border-[#7a7468] bg-[radial-gradient(circle_at_30%_30%,#E9E6DD,#B8B2A3_60%,#7a7468)] text-[#3a3630]"
              }`}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {/* outer rim */}
              <span className="absolute inset-[3px] rounded-full border border-black/15" />
              {/* center square hole */}
              <span className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 ${c === "正" ? "bg-[#3d1f00]" : "bg-[#2a2620]"}`} style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)" }} />
              {/* 4 corner glyphs to suggest 乾隆通宝 style */}
              <span className="absolute left-1.5 top-1 text-[8px] opacity-80">{c === "正" ? "乾" : "·"}</span>
              <span className="absolute right-1.5 top-1 text-[8px] opacity-80">{c === "正" ? "隆" : "·"}</span>
              <span className="absolute left-1.5 bottom-1 text-[8px] opacity-80">{c === "正" ? "通" : "·"}</span>
              <span className="absolute right-1.5 bottom-1 text-[8px] opacity-80">{c === "正" ? "宝" : "·"}</span>
            </div>
            <span className="text-[10px] tracking-widest text-[#8a5a1d]/80">{SANCAI[i]} · {c}</span>
          </div>
        ))}
      </div>
      {last && (
        <div className="relative inline-flex items-center gap-2 rounded-full border border-[var(--ritual-coin-accent)]/40 bg-[#FAEEDA]/60 px-3 py-1 text-[11px] text-[#633806]">
          <span>{last.coins.filter(c => c === "正").length}正 {last.coins.filter(c => c === "反").length}反</span>
          <span className="text-[var(--ritual-coin-accent)]">·</span>
          <span className="font-medium">{last.label}</span>
        </div>
      )}
      <YaoPreview yaoList={yaoList} />
      {!done && (
        <div className="relative mt-5">
          <button onClick={cast} disabled={phase !== "idle"}
            className="group relative overflow-hidden rounded-md bg-[#3a2410] px-7 py-2.5 text-sm font-medium tracking-widest text-[#FAEEDA] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-[#4a2e14] active:scale-95 disabled:opacity-60">
            <span className="absolute inset-0 -translate-x-full bg-foreground/10 transition-transform duration-700 group-hover:translate-x-full" />
            {copy.button}
          </button>
        </div>
      )}
      <div className="relative mt-3">
        <p className="text-[11px] tracking-widest text-[#8a5a1d]/80">已得 {yaoList.length} / 6 爻</p>
        <div className="mx-auto mt-1.5 h-[2px] w-32 overflow-hidden rounded-full bg-[var(--ritual-coin-accent)]/20">
          <div
            className="h-full bg-[var(--ritual-coin-accent)] transition-[width] duration-500 ease-out"
            style={{ width: `${(yaoList.length / 6) * 100}%` }}
          />
        </div>
      </div>
    </RitualAltarFrame>
  );
}

function YarrowRitual({ yaoList, setYaoList, onComplete }: {
  yaoList: CoinYao[];
  setYaoList: React.Dispatch<React.SetStateAction<CoinYao[]>>;
  onComplete?: () => void;
}) {
  const done = yaoList.length === 6;
  const totalChanges = yaoList.length * 3;
  void (totalChanges % 3);
  const castIndex = yaoList.length;
  const copy = getCastCopy("yarrow", castIndex);
  const [phase, setPhase] = useState<CastPhase>("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const cast = () => {
    if (phase !== "idle") return;
    unlockRitualAudio();
    cleanupRef.current?.();
    cleanupRef.current = runCastSequence(setPhase, () => {
      const next = [...yaoList, yarrowYao()];
      setYaoList(next);
      if (next.length === 6) onComplete?.();
    }, { withSeal: yaoList.length === 5 });
  };

  const prevYarrowLen = useRef(0);
  useEffect(() => {
    if (yaoList.length > prevYarrowLen.current && yaoList.length <= 6) {
      playRitualSound("yao-line");
    }
    prevYarrowLen.current = yaoList.length;
  }, [yaoList.length]);

  return (
    <RitualAltarFrame
      method="yarrow"
      activeStep={yaoList.length === 0 ? 0 : done ? 3 : 2}
      overlay={<RitualOverlay type="yarrow" phase={phase} castIndex={castIndex} />}
    >
      <p className="text-[11px] tracking-[0.3em] opacity-75">{done ? "卦成 · 收草" : copy.hint}</p>
      <p className="mt-1 font-serif text-base font-medium">
        {done ? CAST_METHOD_META.yarrow.completeLabel : copy.title}
      </p>

      {/* yarrow bundle visual */}
      <div className="relative mx-auto my-5 inline-flex items-end gap-[3px] rounded-lg border border-[var(--success)]/25 bg-white/40 px-4 py-3 shadow-inner">
        {Array.from({ length: 18 }).map((_, i) => {
          const used = i < totalChanges;
          return (
            <span
              key={i}
              className={`block w-[3px] rounded-full transition-[transform,opacity,box-shadow,border-color,background-color] duration-300 ${used ? "bg-[var(--success)]/30" : "bg-[#0f5c44] animate-float-y"}`}
              style={{
                height: `${24 + (i % 4) * 5}px`,
                animationDelay: `${i * 90}ms`,
                transform: used ? "rotate(8deg) translateY(2px)" : undefined,
              }}
            />
          );
        })}
      </div>

      {/* four-step sequence indicator */}
      <div className="relative mb-1 flex items-center justify-center gap-2 text-[10px] tracking-[0.3em] text-[#0f5c44]/70">
        {YARROW_STAGES.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[var(--success)]/40">→</span>}
            <span>{s}</span>
          </span>
        ))}
      </div>
      <YaoPreview yaoList={yaoList} />
      {yaoList.length > 0 && (
        <p className="relative mt-3 text-xs text-muted-foreground">第 {yaoList.length} 爻得：<span className="font-medium text-foreground">{yaoList[yaoList.length - 1].label}</span></p>
      )}
      {!done && (
        <div className="mt-5">
          <button onClick={cast} disabled={phase !== "idle"}
            className="group rounded-md bg-[#0f5c44] px-7 py-2.5 text-sm font-medium tracking-widest text-[#E8F1EA] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-[#147a59] active:scale-95 disabled:opacity-60">
            {copy.button}
          </button>
        </div>
      )}
      <div className="relative mt-3">
        <p className="text-[11px] tracking-widest text-[#0f5c44]/80">已行 {totalChanges} / 18 变</p>
        <div className="mx-auto mt-1.5 h-[2px] w-32 overflow-hidden rounded-full bg-[var(--success)]/20">
          <div className="h-full bg-[var(--success)] transition-[width] duration-500 ease-out" style={{ width: `${(totalChanges / 18) * 100}%` }} />
        </div>
      </div>
    </RitualAltarFrame>
  );
}

function MeihuaForm({ yaoList, setYaoList, onComplete }: {
  yaoList: CoinYao[];
  setYaoList: React.Dispatch<React.SetStateAction<CoinYao[]>>;
  onComplete?: () => void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [timeHint, setTimeHint] = useState<string | null>(null);
  const [phase, setPhase] = useState<CastPhase>("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const useTime = () => {
    playRitualSound("ui-select");
    const { a: na, b: nb, c: nc, summary } = meihuaFromDate(new Date());
    setA(String(na));
    setB(String(nb));
    setC(String(nc));
    setTimeHint(summary);
  };
  const useRandom = () => {
    playRitualSound("ui-tap");
    setA(String(Math.floor(Math.random() * 99) + 1));
    setB(String(Math.floor(Math.random() * 99) + 1));
    setC(String(Math.floor(Math.random() * 99) + 1));
    setTimeHint(null);
  };
  const submit = () => {
    const na = parseInt(a, 10), nb = parseInt(b, 10), nc = parseInt(c, 10);
    if (!na || !nb || !nc || phase !== "idle") return;
    unlockRitualAudio();
    cleanupRef.current?.();
    cleanupRef.current = runCastSequence(setPhase, () => {
      setYaoList(meihuaToYao(na, nb, nc));
      onComplete?.();
    }, { withSeal: true });
  };
  const na = parseInt(a, 10), nb = parseInt(b, 10), nc = parseInt(c, 10);
  const lowerIdx = na ? meihuaTrigramIndex(na) : null;
  const upperIdx = nb ? meihuaTrigramIndex(nb) : null;
  const dongIdx = nc ? meihuaChangingLine(nc) : null;
  const lowerTri = lowerIdx != null ? TRIGRAMS[lowerIdx] : null;
  const upperTri = upperIdx != null ? TRIGRAMS[upperIdx] : null;
  const filled = [na, nb, nc].filter(n => n && !Number.isNaN(n)).length;
  const meihuaReady = Boolean(na && nb && nc && !Number.isNaN(na) && !Number.isNaN(nb) && !Number.isNaN(nc));
  const previewYao = meihuaReady ? meihuaToYao(na, nb, nc) : null;
  const activeStep = yaoList.length === 6 ? 3 : meihuaReady ? 2 : filled > 0 ? 1 : 0;

  const prevMeihuaLen = useRef(0);
  useEffect(() => {
    if (yaoList.length === 6 && prevMeihuaLen.current < 6) {
      playRitualSound("meihua-chime");
    }
    prevMeihuaLen.current = yaoList.length;
  }, [yaoList.length]);

  return (
    <RitualAltarFrame
      method="meihua"
      activeStep={activeStep}
      align="left"
      overlay={<RitualOverlay type="meihua" phase={phase} />}
    >
      <p className="mb-3 text-center font-serif text-sm font-medium">梅花易数 · 以数起卦</p>

      {/* triple input as ritual slots */}
      <div className="relative grid grid-cols-3 gap-3">
        {[
          { v: a, set: setA, p: "下卦", hint: "本体 · 内", tri: lowerTri, num: na },
          { v: b, set: setB, p: "上卦", hint: "用神 · 外", tri: upperTri, num: nb },
          { v: c, set: setC, p: "动爻", hint: "机变所在", tri: null, num: dongIdx },
        ].map((f, i) => (
          <div key={i} className="rounded-lg border border-[var(--ritual-meihua-accent)]/30 bg-white/50 p-2.5 text-center transition hover:border-[var(--ritual-meihua-accent)]/60">
            <div className="mb-1 text-[10px] tracking-[0.25em] text-[#7a2f5b]/80">{f.p}</div>
            <label htmlFor={`meihua-${f.p}`} className="sr-only">{f.p}数字</label>
            <input
              id={`meihua-${f.p}`}
              name={`meihua-${f.p}`}
              type="number"
              inputMode="numeric"
              autoComplete="off"
              value={f.v}
              onChange={e => { f.set(e.target.value); setTimeHint(null); }}
              placeholder="—"
              className="input-field py-1.5 text-center font-serif text-base font-medium"
            />
            <div className="mt-1.5 text-[10px] text-muted-foreground">{f.hint}</div>
            <div
              className={`mt-2 flex h-10 flex-col items-center justify-center rounded bg-[#F7E8F0]/60 transition-opacity ${
                i < 2 ? (f.tri ? "opacity-100" : "opacity-30") : previewYao ? "opacity-100" : "opacity-30"
              }`}
            >
              {i < 2 ? (
                <TrigramGlyph bits={f.tri?.bits} />
              ) : (
                <MiniHexagramGlyph yaoList={previewYao} />
              )}
            </div>
            {i < 2 && f.tri ? (
              <div className="mt-1.5 text-xs font-medium text-[#7a2f5b]">{f.tri.name}</div>
            ) : null}
            {i === 2 && dongIdx ? (
              <div className="mt-1.5 text-xs font-medium text-[#7a2f5b]">
                第{YAO_POS[dongIdx - 1]}爻动
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={useTime} className="rounded-lg border border-[var(--ritual-meihua-accent)]/30 bg-white/60 px-3 py-1.5 text-[#7a2f5b] hover:bg-[#F7E8F0]">
          以当下时辰
        </button>
        <button type="button" onClick={useRandom} className="rounded-lg border border-[var(--ritual-meihua-accent)]/30 bg-white/60 px-3 py-1.5 text-[#7a2f5b] hover:bg-[#F7E8F0]">
          随机起念
        </button>
        <button onClick={submit} disabled={!na || !nb || !nc || phase !== "idle"}
          className="ml-auto rounded-md bg-[#7a2f5b] px-5 py-1.5 font-medium tracking-[0.28em] text-[#F7E8F0] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-[#923971] disabled:opacity-40">
          观象成卦
        </button>
      </div>
      {timeHint && (
        <p className="relative mt-3 rounded-lg border border-[var(--ritual-meihua-accent)]/25 bg-white/50 px-3 py-2 text-[11px] leading-relaxed text-[#7a2f5b]">
          <span className="font-medium">时辰取数 · </span>{timeHint}
        </p>
      )}
      <p className="relative mt-2 text-[10px] leading-relaxed text-muted-foreground">
        下卦 = 年支 + 月 + 日 · 上卦 = 年支 + 月 + 日 + 时辰 · 动爻另加「分」以便同一时辰内可区分
      </p>

      {yaoList.length === 6 && (
        <div className="relative mt-4 flex justify-center"><YaoPreview yaoList={yaoList} /></div>
      )}
    </RitualAltarFrame>
  );
}

function DirectForm({ yaoList, setYaoList, onComplete }: {
  yaoList: CoinYao[];
  setYaoList: React.Dispatch<React.SetStateAction<CoinYao[]>>;
  onComplete?: () => void;
}) {
  const [vals, setVals] = useState<string[]>(["", "", "", "", "", ""]);
  const [phase, setPhase] = useState<CastPhase>("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const setField = (i: number, raw: string) => {
    if (raw === "" || /^[6789]$/.test(raw)) {
      if (/^[6789]$/.test(raw)) playRitualSound("ink-stroke");
      setVals(prev => prev.map((p, idx) => (idx === i ? raw : p)));
    }
  };

  const parsed = vals.map(v => {
    const n = parseInt(v, 10);
    return [6, 7, 8, 9].includes(n) ? (n as 6 | 7 | 8 | 9) : null;
  });
  const filledCount = parsed.filter(v => v !== null).length;
  const activeStep = yaoList.length === 6 ? 3 : filledCount === 6 ? 2 : 0;

  const submit = () => {
    if (parsed.some(v => v === null) || phase !== "idle") return;
    unlockRitualAudio();
    const arr = (parsed as (6 | 7 | 8 | 9)[]).map(v => {
      const yang = (v % 2 === 1 ? 1 : 0) as 0 | 1;
      const changing = v === 6 || v === 9;
      const label = v === 6 ? "老阴 · 变" : v === 7 ? "少阳" : v === 8 ? "少阴" : "老阳 · 变";
      return { coins: [] as ("正"|"反")[], sum: v, yang, changing, label };
    });
    cleanupRef.current?.();
    cleanupRef.current = runCastSequence(setPhase, () => {
      setYaoList(arr);
      onComplete?.();
    }, { withSeal: true });
  };

  const yaoLabel = (v: string) => {
    const n = parseInt(v, 10);
    return n === 6 ? "老阴" : n === 7 ? "少阳" : n === 8 ? "少阴" : n === 9 ? "老阳" : "—";
  };
  const yaoBar = (v: string) => {
    const n = parseInt(v, 10);
    if (![6, 7, 8, 9].includes(n)) return <div className="h-1 w-10 rounded-sm bg-border" />;
    const yang = n % 2 === 1;
    const changing = n === 6 || n === 9;
    return yang
      ? <div className={`h-[5px] w-12 rounded-sm ${changing ? "bg-[var(--gold)] shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_55%,transparent)]" : "bg-foreground"}`} />
      : <div className="flex gap-1.5">
          <div className={`h-[5px] w-[20px] rounded-sm ${changing ? "bg-[var(--gold)] shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_55%,transparent)]" : "bg-foreground"}`} />
          <div className={`h-[5px] w-[20px] rounded-sm ${changing ? "bg-[var(--gold)] shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_55%,transparent)]" : "bg-foreground"}`} />
        </div>;
  };

  return (
    <RitualAltarFrame
      method="direct"
      activeStep={activeStep}
      align="left"
      overlay={<RitualOverlay type="direct" phase={phase} />}
    >
      <p className="mb-3 text-[11px] text-muted-foreground">每爻填 <span className="font-mono text-foreground">6</span>、<span className="font-mono text-foreground">7</span>、<span className="font-mono text-foreground">8</span>、<span className="font-mono text-foreground">9</span> 之一，或点选下方数字</p>

      {/* Legend pills — 点击可了解含义 */}
      <div className="mb-3 flex flex-wrap gap-1.5 text-[10px]">
        {([
          [6, "老阴 · 变", true, false],
          [7, "少阳", false, true],
          [8, "少阴", false, false],
          [9, "老阳 · 变", true, true],
        ] as const).map(([n, lbl, change, yang]) => (
          <span key={n} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
            change ? "border-[var(--gold)]/40 bg-[var(--bagua-active-bg)] text-foreground" : "border-border bg-background text-muted-foreground"
          }`}>
            <span className="font-mono font-medium">{n}</span>
            <span>{lbl}</span>
            <span className="ml-1 inline-flex">
              {yang ? <span className={`h-[3px] w-5 rounded-sm ${change ? "bg-[var(--gold)]" : "bg-foreground/70"}`} />
                    : <span className="flex gap-1"><span className={`h-[3px] w-2 rounded-sm ${change ? "bg-[var(--gold)]" : "bg-foreground/70"}`} /><span className={`h-[3px] w-2 rounded-sm ${change ? "bg-[var(--gold)]" : "bg-foreground/70"}`} /></span>}
            </span>
          </span>
        ))}
      </div>

      {/* Scroll-style slots, top = 上爻 */}
      <div className="flex flex-col-reverse gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
        {vals.map((v, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="w-10 shrink-0 text-right font-serif text-xs text-muted-foreground">{YAO_POS[i]}爻</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={v}
              onChange={e => setField(i, e.target.value)}
              placeholder="—"
              aria-label={`${YAO_POS[i]}爻，填 6、7、8 或 9`}
              className="input-field w-12 shrink-0 py-1.5 text-center font-mono text-sm"
            />
            <div className="flex shrink-0 gap-1">
              {([6, 7, 8, 9] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setField(i, String(n))}
                  className={`h-7 w-7 rounded-sm border text-xs font-mono transition ${
                    v === String(n)
                      ? "border-[var(--gold)] bg-[var(--bagua-active-bg)] font-medium text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-[var(--gold)]/50 hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="hidden w-[110px] shrink-0 justify-start sm:flex">{yaoBar(v)}</div>
            <span className="text-[11px] text-muted-foreground">{yaoLabel(v)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center">
        <span className="text-[11px] tracking-widest text-muted-foreground">
          已录 {parsed.filter(v => v !== null).length} / 6 爻
        </span>
        <button onClick={submit} disabled={parsed.some(v => v === null) || phase !== "idle"}
          className="ml-auto rounded-md bg-foreground px-5 py-1.5 text-xs font-medium tracking-widest text-background transition hover:opacity-90 disabled:opacity-40">
          落墨成卦
        </button>
      </div>
      {yaoList.length === 6 && (
        <div className="relative mt-4 flex justify-center"><YaoPreview yaoList={yaoList} /></div>
      )}
    </RitualAltarFrame>
  );
}

// ─── Step 1: question ───────────────────────────────────────────────────────
function QuestionStep(props: {
  category: CategoryId; setCategory: (c: CategoryId) => void;
  question: string; setQuestion: (q: string) => void;
  custom: string; setCustom: (s: string) => void;
  onNext: () => void;
}) {
  const { category, setCategory, question, setQuestion, custom, setCustom, onNext } = props;
  return (
    <>
      <GuideAside className="mb-5">
        问事在起卦之前——选一类心事，把真正重要的问题说清楚，文王才好为你观象。
      </GuideAside>
      <p className="mb-3 animate-stagger text-sm text-muted-foreground">你想问的是哪方面的事？</p>
      <div className="mb-5 grid grid-cols-4 gap-2">
        {CATEGORIES.map((c, idx) => {
          const active = c.id === category;
          return (
            <button key={c.id} onClick={() => { playRitualSound("ui-select"); setCategory(c.id); }}
              className={`relative rounded-md border p-2.5 text-xs transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 animate-stagger ${
                active ? "border-[var(--gold)] bg-[var(--bagua-active-bg)] font-medium text-foreground shadow-[0_3px_10px_-4px_color-mix(in_oklab,var(--gold)_40%,transparent)]"
                       : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
              }`}
              style={{ animationDelay: `${idx * 60}ms` }}>
              {active && <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--gold)] animate-breathe" />}
              {c.label}
            </button>
          );
        })}
      </div>
      <p className="mb-2.5 text-xs text-muted-foreground">选一个接近你情况的问题，或自己描述</p>
      <label htmlFor="custom-question" className="sr-only">自定义问题</label>
      <div className="mb-3 flex flex-col gap-1.5">
        {QUESTIONS[category].map((q, idx) => {
          const selected = q === question && !custom;
          return (
            <button key={q} onClick={() => { playRitualSound("ui-tap"); setQuestion(q); setCustom(""); }}
              className={`group rounded-md border px-3.5 py-2.5 text-left text-sm transition-[transform,border-color,background-color] duration-200 hover:translate-x-0.5 animate-stagger ${
                selected ? "border-[var(--gold)] bg-[var(--bagua-active-bg)] text-foreground"
                         : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}>
              {selected && <Check size={12} className="mr-1.5 inline text-[var(--gold)]" />}
              {q}
            </button>
          );
        })}
      </div>
      <input type="text" value={custom} onChange={e => setCustom(e.target.value)}
        id="custom-question"
        name="customQuestion"
        autoComplete="off"
        placeholder="或者用自己的话描述…"
        className="input-field" />
      <div className="mt-5 text-right">
        <button onClick={onNext}
          className="group inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-2.5 text-sm font-medium text-background transition hover:opacity-90 hover:gap-3">
          下一步：起卦观象
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>
    </>
  );
}

// ─── Step 3: AI result + save + follow-up ───────────────────────────────────
function ResultStep({ yaoList, category, question, castMethod, onAgain, onBackToCast }: {
  yaoList: CoinYao[];
  category: CategoryId;
  question: string;
  castMethod: Method;
  onAgain: () => void;
  onBackToCast: () => void;
}) {
  const yao = yaoList.map(y => y.yang);
  const ben = hexFromYao(yao);
  const changingIdx = yaoList.findIndex(y => y.changing); // first changing line for prompt
  const changingLine = changingIdx >= 0 ? changingIdx + 1 : 0;
  const changedYao = yao.map((y, i) => (yaoList[i].changing ? (y === 1 ? 0 : 1) : y));
  const hasChange = yaoList.some(y => y.changing);
  const bian = hasChange ? hexFromYao(changedYao) : null;
  const cat = CATEGORIES.find(c => c.id === category)!;

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [followUpSeed, setFollowUpSeed] = useState<string | null>(null);
  const [followUpPersona, setFollowUpPersona] = useState<FollowUpPersona>(() => loadFollowUpPersona());

  const handleFollowUpPersonaChange = (next: FollowUpPersona) => {
    setFollowUpPersona(next);
    saveFollowUpPersona(next);
  };

  const yaoPayload =
    yaoList.length === 6
      ? yaoList.map((y) => ({ yang: y.yang, changing: y.changing, label: y.label }))
      : undefined;

  const hexInvalid = ben.name === "?" || ben.char === "?";

  const { data, cloudFallback, error, isPending } = useReactQueryInterpret({
    category,
    question,
    benName: ben.name,
    bianName: bian?.name ?? null,
    benChar: ben.char,
    bianChar: bian?.char,
    changingLine,
    castMethod,
    yao: yaoPayload,
    enabled: !hexInvalid,
  });

  const followUpDisplay = useMemo(() => {
    const hints = buildFollowUpHints(question, category, followUpPersona);
    if (!data?.followUp) return hints;
    return { ...data.followUp, greeting: hints.greeting ?? data.followUp.greeting };
  }, [data?.followUp, question, category, followUpPersona]);

  if (hexInvalid) {
    return (
      <div className="text-center">
        <GuideStage
          title="卦象未成"
          hint="六爻数据异常，请返回重新起卦。"
          className="rounded-lg border border-destructive/25 bg-destructive/5 py-10"
        />
        <button type="button" onClick={onBackToCast} className="btn-gold mt-3 inline-block text-xs">
          返回起卦
        </button>
      </div>
    );
  }

  useEffect(() => {
    playRitualSound("wheel-turn");
    if (bian) {
      const t = window.setTimeout(() => playRitualSound("yao-line"), 220);
      return () => window.clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!data || savedId) return;
    const serverId = data.recordId ? String(data.recordId) : null;
    const near = loadHistory().find(
      (h) =>
        h.question === question &&
        h.category === category &&
        Math.abs(h.createdAt - Date.now()) < 5 * 60 * 1000,
    );
    if (serverId && near && near.id !== serverId) {
      rekeyHistoryRecord(near.id, serverId);
    }
    const id = serverId ?? near?.id ?? generateRandomId();
    saveHistoryRecord({
      id,
      createdAt: Date.now(),
      category,
      question,
      benName: ben.name,
      benChar: ben.char,
      bianName: bian?.name,
      bianChar: bian?.char,
      changingLine,
      yao: yaoPayload ?? [],
      interpretation: data.text,
      sections: data.sections,
      facts: data.facts ?? undefined,
      followUp: data.followUp,
    });
    setSavedId(id);
  }, [data, savedId, category, question, ben.name, ben.char, bian?.name, bian?.char, changingLine, yaoPayload, data]);

  const openFollowUp = (message?: string) => {
    setFollowUpSeed(message?.trim() || null);
    setChatOpen(true);
  };

  const shareCardData = useMemo<ShareCardData | null>(() => {
    if (!data) return null;
    return {
      benName: ben.name,
      benChar: ben.char,
      bianName: bian?.name ?? null,
      bianChar: bian?.char ?? null,
      category,
      question,
      changingLine,
      sections: data.sections,
      createdAt: Date.now(),
    };
  }, [data, ben.name, ben.char, bian?.name, bian?.char, category, question, changingLine]);

  const openArchive = () => {
    if (savedId) navigate({ to: "/history/$id", params: { id: savedId } });
    else navigate({ to: "/history" });
  };

  if (authLoading && !data && !error) {
    return (
      <GuideStage
        title="加载中"
        hint="正在准备解读…"
        className="rounded-lg border border-border bg-secondary/40"
      />
    );
  }

  return (
    <>
      {user && isOfflineGuest(user) && (
        <div className="mb-4 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-center text-xs text-muted-foreground animate-fade-in">
          已是游客身份 · 卦象保存在本设备，可在「历史」中查看
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 animate-stagger">
        <div className="flex items-center gap-5">
          <div className="text-center animate-yao-pop">
            <div className="text-4xl leading-none text-foreground animate-breathe">{ben.char}</div>
            <div className="mt-1 text-xs text-muted-foreground">{ben.name}卦</div>
          </div>
          {bian && (<>
            <div className="text-lg text-[var(--gold)] animate-float-y">→</div>
            <div className="text-center animate-yao-pop" style={{ animationDelay: "200ms" }}>
              <div className="text-4xl leading-none text-foreground animate-breathe" style={{ animationDelay: "1.2s" }}>{bian.char}</div>
              <div className="mt-1 text-xs text-muted-foreground">{bian.name}卦（变）</div>
            </div>
          </>)}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="mb-1">
            {cat.label}{changingLine ? ` · 第${YAO_POS[changingLine - 1]}爻动` : ""}
          </div>
          <div className="max-w-[220px] text-foreground">{question}</div>
        </div>
      </div>

      {cloudFallback && data && (
        <p className={`mb-3 ${SOFT_NOTICE_CLASS}`}>
          云端解读暂不可用，已改用本机引擎生成结果；联网后可获得完整云端记录与额度统计。
        </p>
      )}
      {isPending && (
        <GuideStage
          title="凝神解卦"
          hint={cloudFallback ? "本地解读生成中…" : "正在生成解读…"}
          className="rounded-lg border border-border bg-secondary/40"
        />
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>解读失败：{(error as Error).message}</p>
          {(error instanceof ApiError && error.status === 402) ||
          (error as Error).message.includes("额度") ? (
            <div className="mt-3 space-y-2">
              <MembershipRedeemCard compact />
              <Link
                to="/profile/membership"
                className="inline-block text-xs font-medium text-[var(--gold)] underline underline-offset-2"
              >
                会员页 · 单次付费与额度说明
              </Link>
            </div>
          ) : null}
        </div>
      )}
      {data && (
        <>
          <p className="mb-2 text-[10px] tracking-[0.16em] text-muted-foreground">正式解读 · 本地引擎</p>
          {data.facts ? (
            <div className="mb-4">
              <p className="mb-2 text-[10px] tracking-[0.16em] text-muted-foreground">卦象事实 · 语料直出</p>
              <HexagramFactsPanel facts={data.facts} category={category} />
            </div>
          ) : null}
          <p className="mb-2 text-[10px] tracking-[0.16em] text-muted-foreground">AI 解读 · 贴题分析</p>
          <InterpretationView text={data.text} sections={data.sections} />
          {data.aiFollowUpEnabled ? (
            <ZhipuTestPanel
              aiEnabled
              input={{
                category,
                question,
                benName: ben.name,
                bianName: bian?.name ?? null,
                changingLine,
                castMethod,
                yao: yaoPayload,
              }}
            />
          ) : null}

          {followUpDisplay.greeting || followUpDisplay.suggestions.length > 0 ? (
            <div className="mt-4 rounded-lg border border-border/80 bg-secondary/30 px-4 py-3">
              {followUpDisplay.greeting ? (
                <p className="text-[12px] leading-relaxed text-foreground/85">{followUpDisplay.greeting}</p>
              ) : null}
              {followUpDisplay.suggestions.length > 0 ? (
                <div className={`flex flex-wrap gap-1.5${followUpDisplay.greeting ? " mt-2.5" : ""}`}>
                  {followUpDisplay.suggestions.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => openFollowUp(chip)}
                      disabled={!data.aiFollowUpEnabled}
                      title={!data.aiFollowUpEnabled ? "云端大模型接入后可追问" : undefined}
                      className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-foreground/75 transition hover:border-[var(--gold)]/40 hover:text-foreground disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {data.aiFollowUpEnabled ? (
            <FollowUpPersonaSwitch
              className="mt-4"
              value={followUpPersona}
              onChange={handleFollowUpPersonaChange}
            />
          ) : null}

          <HexagramTipCard
            className="mt-4"
            hexagramName={ben.name}
            question={question}
          />
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onAgain}
          className="flex-1 min-w-[100px] rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-secondary">
          <RotateCw size={13} className="mr-1 inline" />再问一卦
        </button>
        <button
          onClick={() => openFollowUp()}
          disabled={!data || !data.aiFollowUpEnabled}
          title={
            data?.aiFollowUpEnabled
              ? `以「${followUpPersonaShortLabel(followUpPersona)}」语气追问，可在上方切换`
              : "云端大模型接入后可追问"
          }
          className="flex-1 min-w-[100px] rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-secondary disabled:opacity-50"
        >
          <MessageSquare size={13} className="mr-1 inline" />
          深入追问
          {data?.aiFollowUpEnabled ? (
            <span className="ml-1 text-[10px] text-[var(--gold)]">
              · {followUpPersonaShortLabel(followUpPersona)}
            </span>
          ) : null}
        </button>
        <ShareCardTriggerButton
          onClick={() => setShareOpen(true)}
          disabled={!data}
        />
        <button onClick={openArchive} disabled={!data || !savedId}
          className="flex-1 min-w-[100px] rounded-md bg-foreground px-3 py-2.5 text-center text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50">
          <Bookmark size={13} className="mr-1 inline" />
          {savedId ? "查看卦档" : "存档中…"}
        </button>
      </div>

      <ShareCardDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        data={shareCardData}
      />

      {chatOpen && data && (
        <FollowUpChatDialog
          open={chatOpen}
          onOpenChange={(open) => {
            setChatOpen(open);
            if (!open) setFollowUpSeed(null);
          }}
          aiEnabled={data.aiFollowUpEnabled ?? false}
          followUpHints={followUpDisplay}
          initialMessage={followUpSeed}
          autoSubmitInitial={!!followUpSeed && !!data.aiFollowUpEnabled}
          persona={followUpPersona}
          onPersonaChange={handleFollowUpPersonaChange}
          ctx={{
            category,
            question,
            benName: ben.name,
            bianName: bian?.name ?? null,
            changingLine,
            interpretation: data.text,
            castMethod,
            yao: yaoPayload,
            facts: data.facts,
          }}
        />
      )}
    </>
  );
}

// Tiny inline hook so we don't have to add yet another file
function useReactQueryInterpret(args: {
  category: CategoryId;
  question: string;
  benName: string;
  bianName: string | null;
  benChar?: string;
  bianChar?: string;
  changingLine: number;
  castMethod?: Method;
  yao?: { yang: 0 | 1; changing: boolean; label: string }[];
  enabled?: boolean;
}) {
  const { category, question, benName, bianName, benChar, bianChar, changingLine, castMethod, yao, enabled = true } = args;
  const m = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const localPayload = { category, question, benName, bianName, changingLine, castMethod, yao };
      const runLocal = async (cloudDown = false) => {
        const offlineOnly = !token || isOfflineGuestToken(token);
        if (offlineOnly) {
          assertOfflineGuestCanInterpret();
        }
        const result = await interpretReading({ data: localPayload });
        if (offlineOnly) {
          recordOfflineGuestUse();
        }
        return { ...result, __cloudFallback: cloudDown as boolean };
      };

      if (token && !isOfflineGuestToken(token)) {
        try {
          const cloud = await apiInterpretReading({
            category,
            question,
            benName,
            bianName,
            benChar,
            bianChar,
            changingLine,
            castMethod,
            yao,
          });
          return { ...cloud, __cloudFallback: false as boolean };
        } catch (e) {
          if (!isRecoverableApiFailure(e)) throw e;
          return runLocal(true);
        }
      }
      return runLocal(false);
    },
  });
  useEffect(() => {
    if (!enabled) return;
    if (!m.data && !m.isPending && !m.error) m.mutate();
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const raw = m.data;
  const data = raw
    ? (() => {
        const { __cloudFallback: _fb, ...rest } = raw as typeof raw & { __cloudFallback?: boolean };
        return rest;
      })()
    : undefined;

  return {
    data,
    cloudFallback: !!(raw && (raw as { __cloudFallback?: boolean }).__cloudFallback),
    error: m.error,
    isPending: enabled && (m.isPending || (!m.data && !m.error)),
  };
}
