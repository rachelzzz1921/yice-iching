import { useEffect } from "react";
import { InterpretationLines } from "@/components/InterpretationLines";
import { playRitualSound } from "@/lib/ritual-sounds";
import { resolveSectionLines } from "@/lib/interpret-format";
import type { InterpretSection, InterpretSectionKind } from "@/lib/interpret.local";

type Props = {
  section: InterpretSection;
  variant: Extract<InterpretSectionKind, "overview" | "dimension">;
  staggerMs?: number;
};

function displaySectionTitle(title: string): string {
  return title === "下一步" ? "长期来看" : title;
}

/** 解读段落：总览含原文；分维仅展示结构化正文 */
export function InterpretationSectionCard({ section, variant, staggerMs = 0 }: Props) {
  const classic = section.classic?.trim();
  const lines = resolveSectionLines(section);

  useEffect(() => {
    if (staggerMs == null) return;
    const t = window.setTimeout(() => playRitualSound("interpret-section"), staggerMs);
    return () => window.clearTimeout(t);
  }, [staggerMs]);

  return (
    <article
      className={`rounded-lg border border-border bg-secondary/40 px-4 py-3.5${staggerMs != null ? " animate-stagger" : ""}`}
      style={staggerMs != null ? { animationDelay: `${staggerMs}ms` } : undefined}
    >
      <h3 className="mb-2.5 font-serif-cjk text-sm font-medium text-foreground">
        {displaySectionTitle(section.title)}
      </h3>

      {variant === "overview" && classic ? (
        <details className="group mb-3 rounded-md border border-border/50 bg-background/40">
          <summary className="cursor-pointer list-none px-3 py-2 text-[11px] tracking-wider text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">展开卦辞原文</span>
            <span className="hidden group-open:inline">收起卦辞原文</span>
          </summary>
          <div className="border-t border-border/50 px-3 pb-3 pt-2">
            <p className="whitespace-pre-wrap font-serif-cjk text-[11px] leading-[1.75] text-muted-foreground/85">
              {classic}
            </p>
          </div>
        </details>
      ) : null}

      <InterpretationLines lines={lines} variant={variant} />
    </article>
  );
}
