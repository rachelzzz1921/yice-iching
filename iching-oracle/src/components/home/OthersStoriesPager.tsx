import { DivineEntryLink } from "@/components/home/DivineEntryLink";
import { ArrowRight, Quote } from "lucide-react";
import { GuideAside } from "@/components/GuideCallout";
import { STORIES } from "@/components/home/storiesData";
import { sampleCtaClass, useSampleCtaHot } from "@/components/home/useSampleCtaHot";
import { playRitualSound, unlockRitualAudio } from "@/lib/ritual-sounds";

function StoryCard({
  s,
  isLast,
}: {
  s: (typeof STORIES)[number];
  isLast?: boolean;
}) {
  const { footRef, ctaHot } = useSampleCtaHot(isLast);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card/95">
      <div className="border-b border-border/70 bg-secondary/30 px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>{s.who}</span>
              <span>·</span>
              <span>{s.age}</span>
              <span>·</span>
              <span>{s.when}</span>
            </div>
            <p className="mt-1.5 font-serif-cjk text-base text-foreground sm:text-lg">「{s.question}？」</p>
          </div>
          <Quote size={14} className="shrink-0 text-[var(--gold)]/30" aria-hidden />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          <span className="rounded-sm border border-[var(--gold)]/30 bg-[var(--bagua-active-bg)] px-1.5 py-0.5 text-[var(--gold)]">{s.cat}</span>
          <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-muted-foreground">{s.method}</span>
          <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-serif-cjk">{s.hex}</span>
        </div>
      </div>
      <div className="space-y-3 px-4 py-3 text-sm leading-relaxed sm:px-5">
        <p className="text-foreground/90"><span className="text-[10px] tracking-widest text-muted-foreground">处境 · </span>{s.context}</p>
        <p className="text-muted-foreground"><span className="text-[10px] tracking-widest text-muted-foreground">卡点 · </span>{s.stuck}</p>
        <div className="rounded-sm border border-border/80 bg-secondary/25 px-3 py-2.5">
          <p className="text-[10px] tracking-[0.15em] text-[var(--gold)]">解读要点</p>
          <ul className="mt-1.5 space-y-1.5 text-xs sm:text-sm">
            {s.reading.slice(0, 2).map((r) => (
              <li key={r.dim}><span className="font-medium text-foreground/90">{r.dim}：</span>{r.text}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-foreground/80"><span className="text-muted-foreground">后续 · </span>{s.outcome}</p>
      </div>
      <div
        ref={footRef}
        className="story-card-foot border-t border-border/70 bg-secondary/20 px-4 py-3 sm:px-5"
      >
        <p className="font-serif-cjk text-xs italic text-foreground/75">「{s.quote}」</p>
        <span className="inline-flex">
          <DivineEntryLink
            search={{ category: s.category, q: s.question, skipEntry: true }}
            onClick={() => {
              unlockRitualAudio();
              playRitualSound("ui-select");
            }}
            className={sampleCtaClass(ctaHot)}
          >
            测这个问题！
            <ArrowRight size={ctaHot ? 13 : 11} aria-hidden />
          </DivineEntryLink>
        </span>
      </div>
    </article>
  );
}

export function OthersStoriesPager() {
  return (
    <div className="home-page-body flex min-h-min flex-col home-page-pad">
      <GuideAside className="mb-4 shrink-0 text-xs">
        他人也曾卡在同样的岔口——以下为匿名先例，卦象因人而异，仅供参考。
      </GuideAside>
      <div className="shrink-0 text-center">
        <p className="section-label">Others Asked</p>
        <h2 className="mt-1 font-serif-cjk text-lg font-medium text-foreground">他们问过什么，又找到了什么</h2>
        <p className="mx-auto mt-1 text-[10px] tracking-[0.2em] text-muted-foreground sm:text-[11px]">
          来自真实案例
        </p>
      </div>
      <div className="home-page-scroll-inner relative mt-4 space-y-4 pb-4">
        {STORIES.map((s, i) => (
          <StoryCard
            key={s.question}
            s={s}
            isLast={i === STORIES.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
