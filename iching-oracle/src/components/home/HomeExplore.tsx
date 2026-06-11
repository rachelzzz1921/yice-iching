import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { DivineEntryLink } from "@/components/home/DivineEntryLink";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Compass,
  ChevronRight,
} from "lucide-react";
import { HomeMethodCards } from "@/components/home/HomeMethodCards";
import { IncenseSmoke } from "@/components/RitualEffects";
import { BaguaWheel } from "@/components/BaguaWheel";
import { GuideAside } from "@/components/GuideCallout";
import { HomeDeck } from "@/components/home/HomeDeck";
import {
  EXPLORE_PAGE_INDEX,
  EXPLORE_PAGES,
} from "@/components/home/homePages";
import { ExploreNavProvider } from "@/components/home/DivineEntryLink";
import { HomeFollowNav } from "@/components/home/HomeFollowNav";
import { OthersStoriesPager } from "@/components/home/OthersStoriesPager";
import { SampleReadingPage } from "@/components/home/SampleReadingPage";
import { PaperDecor } from "@/components/home/PaperDecor";
import { CATEGORIES, QUESTIONS, type CategoryId } from "@/lib/iching";
import { buildExploreSearch, EXPLORE_PATH } from "@/lib/navigation";
import { playRitualSound } from "@/lib/ritual-sounds";

const STEPS = [
  {
    n: "壹",
    title: "明确所问",
    desc: "选一类心事，把模糊焦虑化成清晰一问。",
    page: EXPLORE_PAGE_INDEX.questions,
    hint: "前往 · 问事",
  },
  {
    n: "贰",
    title: "起卦观象",
    desc: "默念所问，四式任选，六爻渐成。",
    page: EXPLORE_PAGE_INDEX.methods,
    hint: "前往 · 起卦",
  },
  {
    n: "叁",
    title: "大师解读",
    desc: "分维度解读，可持续追问，卦象存档。",
    page: EXPLORE_PAGE_INDEX.reading,
    hint: "前往 · 解读",
  },
] as const;

function QuestionTeaserPage({ initialCategory }: { initialCategory?: CategoryId }) {
  const [active, setActive] = useState<CategoryId>(initialCategory ?? "career");
  const questions = QUESTIONS[active].slice(0, 4);

  useEffect(() => {
    if (initialCategory) setActive(initialCategory);
  }, [initialCategory]);

  return (
    <div className="home-page-body relative flex min-h-min flex-col home-page-pad">
      <PaperDecor variant="quiet" />
      <GuideAside className="relative mb-4 shrink-0 text-xs">
        下面这些话只是帮你起头的锚点，不必措辞完美。先点一类心事，再选最戳中你的一句；觉得贴切就「测这个」，起卦时还能改成自己的话。
      </GuideAside>
      <div className="relative shrink-0 text-center">
        <p className="section-label">Question Framework</p>
        <h2 className="mt-1 font-serif-cjk text-lg font-medium text-foreground">你的心事，卦能听懂</h2>
      </div>
      <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              playRitualSound("ui-select");
              setActive(c.id);
            }}
            className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
              active === c.id ? "border-[var(--gold)] bg-[var(--bagua-active-bg)] text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ul key={active} className="home-question-list relative mt-3 space-y-1.5 lg:space-y-0 animate-fade-in">
        {questions.map((q) => (
          <li key={q} className="group flex items-center justify-between rounded-lg border border-border bg-card/90 px-3 py-2.5">
            <span className="text-sm">{q}</span>
            <DivineEntryLink
              search={{ category: active, q, skipEntry: true }}
              className="touch-reveal text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-[var(--gold)]"
            >
              测这个 <ChevronRight size={11} className="inline" />
            </DivineEntryLink>
          </li>
        ))}
        <li className="group flex items-center justify-between rounded-lg border border-dashed border-[var(--gold)]/35 bg-[var(--bagua-active-bg)]/50 px-3 py-2.5">
          <span className="text-sm text-foreground/90">也可以问任何你想问的事</span>
          <DivineEntryLink
            search={{ category: active, skipEntry: true }}
            className="shrink-0 text-[10px] text-[var(--gold)] opacity-90 group-hover:opacity-100"
          >
            写我的问题 <ChevronRight size={11} className="inline" />
          </DivineEntryLink>
        </li>
      </ul>
      <div className="relative mt-3 shrink-0 text-center">
        <DivineEntryLink search={{ category: active, skipEntry: true }} className="btn-gold inline-flex items-center gap-1.5 text-xs">
          我有类似的问题 <ArrowRight size={13} />
        </DivineEntryLink>
      </div>
    </div>
  );
}

export function HomeExplore({
  initialCategory,
  initialPage,
}: { initialCategory?: CategoryId; initialPage?: number } = {}) {
  const navigate = useNavigate();
  const defaultPage = initialCategory ? EXPLORE_PAGE_INDEX.questions : 0;
  const [page, setPageRaw] = useState(() => initialPage ?? defaultPage);

  const setPage = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(EXPLORE_PAGES.length - 1, next));
      setPageRaw(clamped);
      void navigate({
        to: EXPLORE_PATH,
        search: buildExploreSearch({ page: clamped, category: initialCategory }),
        replace: true,
      });
    },
    [navigate, initialCategory],
  );

  useEffect(() => {
    if (initialPage != null) setPageRaw(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (!initialCategory) return;
    const p = EXPLORE_PAGE_INDEX.questions;
    setPageRaw(p);
    void navigate({
      to: EXPLORE_PATH,
      search: buildExploreSearch({ page: p, category: initialCategory }),
      replace: true,
    });
  }, [initialCategory, navigate]);

  const pages = useMemo(
    () => [
      /* 0 入内 */
      <div key="intro" className="home-page-body home-page-body--hero is-vcenter relative flex min-h-full flex-col items-center home-page-pad text-center">
        <PaperDecor variant="quiet" />
        <div className="home-hero-stack relative w-full max-w-md">
          <p className="section-label">Along the Way</p>
          <h2 className="mt-2 font-serif-cjk text-xl font-medium leading-snug sm:text-2xl">
            心事悬着，就该起一卦
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            选一类问事、得齐六爻，几分钟拿到贴你处境的解读；想先摸清流程或看样例，点下面次要入口即可。
          </p>
          <DivineEntryLink
            className="btn-gold btn-gold-hero relative mt-6 inline-flex w-full max-w-xs items-center justify-center gap-2 sm:max-w-none sm:w-auto"
            onClick={() => playRitualSound("ui-select")}
          >
            <span>即刻起卦</span>
            <ArrowRight size={15} className="btn-gold-arrow" aria-hidden />
          </DivineEntryLink>
          <p className="mt-2.5 text-[10px] tracking-[0.14em] text-muted-foreground">
            免费体验完整解读 · 无需注册即可开始
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={() => {
                playRitualSound("ui-step");
                setPage(EXPLORE_PAGE_INDEX.ritual);
              }}
              className="btn-ghost-gold text-xs"
            >
              先认流程
            </button>
            <button
              type="button"
              onClick={() => {
                playRitualSound("ui-step");
                setPage(EXPLORE_PAGE_INDEX.reading);
              }}
              className="text-[11px] tracking-[0.14em] text-muted-foreground transition hover:text-[var(--gold)]"
            >
              看样例解读
            </button>
            <Link
              to="/"
              className="text-[11px] tracking-[0.14em] text-muted-foreground transition hover:text-[var(--gold)]"
            >
              回首页
            </Link>
          </div>
          <p className="mx-auto mt-5 max-w-xs text-[10px] leading-relaxed text-muted-foreground/90">
            解读后的
            <Link
              to="/profile/membership"
              className="mx-0.5 text-[var(--gold)]/85 underline-offset-2 transition hover:text-[var(--gold)] hover:underline"
            >
              深解与追问
            </Link>
            可开通会员无限使用；单次购买也能继续问透。
          </p>
        </div>
      </div>,

      /* 1 流程 */
      <div key="ritual" className="home-page-body relative flex min-h-min flex-col home-page-pad">
        <PaperDecor />
        <div className="text-center">
          <p className="section-label">The Ritual</p>
          <h2 className="mt-1 font-serif-cjk text-lg font-medium">三步，完成一次问卜</h2>
          <p className="mt-1 text-xs text-muted-foreground">向右依次了解：问事 → 起卦 → 解读，也可点任一步直达</p>
        </div>
        <div className="mt-5 space-y-2.5">
          {STEPS.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => setPage(s.page)}
              className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card/90 p-3.5 text-left transition hover:border-[var(--gold)]/45 hover:bg-[var(--bagua-active-bg)] hover:shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--gold)]/35 font-ritual-cjk text-base text-[var(--gold)]">
                {s.n}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-foreground">{s.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
                <p className="mt-1 text-[10px] tracking-wider text-[var(--gold)] opacity-0 transition group-hover:opacity-100">
                  {s.hint}
                </p>
              </div>
              <ChevronRight
                size={16}
                className="shrink-0 text-muted-foreground/60 transition group-hover:translate-x-0.5 group-hover:text-[var(--gold)]"
                aria-hidden
              />
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><BookOpen size={12} className="text-[var(--gold)]" />卦辞参照</span>
          <span className="flex items-center gap-1"><Compass size={12} className="text-[var(--gold)]" />变卦同析</span>
          <span className="flex items-center gap-1"><Sparkles size={12} className="text-[var(--gold)]" />AI 深解</span>
        </div>
      </div>,

      <QuestionTeaserPage key="questions" initialCategory={initialCategory} />,

      <HomeMethodCards key="methods" />,

      <SampleReadingPage key="reading" />,

      <OthersStoriesPager key="stories" />,

      <div key="bagua" className="home-page-body flex min-h-min flex-col home-page-pad">
        <div className="mb-3 text-center">
          <p className="section-label">Xiantian Bagua</p>
          <h2 className="mt-1 font-serif-cjk text-base font-medium">先天八卦 · 交互方位</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            认一认底层符号——点选八卦，看它如何接入「问事 → 起卦 → 解读」主线。
          </p>
        </div>
        <div className="min-h-[min(52vh,22rem)]">
          <BaguaWheel
            onGoQuestions={() => setPage(EXPLORE_PAGE_INDEX.questions)}
            onGoStart={() => setPage(EXPLORE_PAGE_INDEX.start)}
          />
        </div>
      </div>,

      <div key="start" className="home-page-body is-vcenter relative flex min-h-full flex-col items-center home-page-pad text-center">
        <PaperDecor variant="hero" />
        <IncenseSmoke count={3} />
        <p className="relative font-ritual-cjk text-xl tracking-[0.15em] sm:text-2xl">今日宜问</p>
        <p className="relative mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-sm">
          那个反复出现在你心里的问题——
          <br />
          不如此刻，交给卦象来答
        </p>
        <DivineEntryLink
          className="relative mt-6 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-lg border-2 border-[var(--gold)] bg-background px-6 py-2.5 text-sm tracking-[0.12em] transition hover:bg-[var(--bagua-active-bg)] sm:max-w-none sm:w-auto sm:px-8 sm:tracking-[0.15em]"
        >
          开始问卜
          <ArrowRight size={14} className="text-[var(--gold)]" />
        </DivineEntryLink>
        <p className="relative mt-3 text-[10px] tracking-[0.2em] text-muted-foreground">
          入内前请选择游客试用或账号登录
        </p>
      </div>,
    ],
    [initialCategory, setPage],
  );

  return (
    <ExploreNavProvider page={page} category={initialCategory}>
      <HomeFollowNav page={page} onPageChange={setPage} />
      <HomeDeck page={page} onPageChange={setPage} pages={pages} />
    </ExploreNavProvider>
  );
}
