import { useEffect, useMemo } from "react";
import { InterpretationSectionCard } from "@/components/InterpretationSectionCard";
import { organizeInterpretSections, splitVerdictBody } from "@/lib/interpret-sections";
import { playRitualSound } from "@/lib/ritual-sounds";
import type { InterpretSection } from "@/lib/interpret.local";

type Props = {
  text: string;
  sections: InterpretSection[];
  animate?: boolean;
};

function sectionPlain(section: InterpretSection): string {
  if (section.lines?.length) {
    return section.lines.map((l) => (l.label ? `${l.label}：${l.text}` : l.text)).join(" ");
  }
  return section.analysis ?? section.body ?? "";
}

/** 结果页 AI 解读区：一句话定性 → 分维 → 断语 → 时间 / 行动 */
export function InterpretationView({ text, sections, animate = true }: Props) {
  const organized = useMemo(() => organizeInterpretSections(sections), [sections]);

  if (sections.length === 0) {
    return (
      <div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-4 text-[13px] leading-relaxed text-foreground/85">
        {text}
      </div>
    );
  }

  const headline = organized?.headline ?? organized?.overview ?? null;
  const dimensions = organized?.dimensions ?? [];
  const verdict = organized?.verdict ?? sections[sections.length - 1];
  const synopsis = organized?.synopsis ?? null;
  const timing = organized?.timing ?? null;
  const action = organized?.action ?? null;

  const { summaryText, punchlineText } = useMemo(() => {
    if (synopsis) {
      return {
        summaryText: sectionPlain(synopsis),
        punchlineText: sectionPlain(verdict),
      };
    }
    const raw = sectionPlain(verdict);
    const { summary, punchline } = splitVerdictBody(raw);
    return { summaryText: summary, punchlineText: punchline };
  }, [synopsis, verdict]);

  const verdictDelay = animate ? (dimensions.length + 1) * 80 + 40 : 0;

  useEffect(() => {
    if (!animate) return;
    const t = window.setTimeout(() => playRitualSound("interpret-verdict"), verdictDelay);
    return () => window.clearTimeout(t);
  }, [animate, verdictDelay]);

  const headlineText = headline ? sectionPlain(headline) : "";

  return (
    <div className="flex flex-col gap-4">
      {headlineText ? (
        <div
          className={`rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/8 px-4 py-3.5${animate ? " animate-fade-in" : ""}`}
        >
          <p className="mb-1.5 text-[10px] tracking-[0.16em] text-[var(--gold)]">一句话定性</p>
          <p className="font-serif-cjk text-[15px] font-medium leading-relaxed text-foreground">
            {headlineText}
          </p>
        </div>
      ) : null}

      {dimensions.length > 0 ? (
        <section aria-label="分维解读">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] tracking-[0.18em] text-muted-foreground">分维解读</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-2">
            {dimensions.map((s, i) => (
              <InterpretationSectionCard
                key={`${s.title}-${i}`}
                section={s}
                variant="dimension"
                staggerMs={animate ? (i + 1) * 80 : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {summaryText ? (
        <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3.5">
          <p className="mb-1.5 text-[10px] tracking-[0.16em] text-muted-foreground">纵览综括</p>
          <p className="text-[13px] leading-relaxed text-foreground/90">{summaryText}</p>
        </div>
      ) : null}

      <div
        className={`rounded-md bg-foreground px-4 py-3.5 text-center${animate ? " animate-yao-pop" : ""}`}
        style={animate ? { animationDelay: `${verdictDelay}ms` } : undefined}
      >
        <p className="mb-1 text-[10px] tracking-[0.16em] text-background/60">断语</p>
        <p className="font-serif-cjk text-sm font-medium leading-relaxed text-background">
          {punchlineText}
        </p>
      </div>

      {timing || action ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {timing ? (
            <div className="rounded-lg border border-border/80 bg-secondary/25 px-3.5 py-3">
              <p className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground">时间节点</p>
              <p className="text-[12px] leading-relaxed text-foreground/85">{sectionPlain(timing)}</p>
            </div>
          ) : null}
          {action ? (
            <div className="rounded-lg border border-border/80 bg-secondary/25 px-3.5 py-3">
              <p className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground">行动锚点</p>
              <p className="text-[12px] leading-relaxed text-foreground/85">{sectionPlain(action)}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
