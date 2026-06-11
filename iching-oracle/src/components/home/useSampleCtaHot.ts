import { useCallback, useEffect, useRef, useState } from "react";

export const CTA_HOT_MS = 2200;

export function sampleCtaClass(ctaHot: boolean, idle: "gold" | "muted" = "muted") {
  const idleClass =
    idle === "gold"
      ? "gap-0.5 border-transparent px-0 py-0 text-[10px] text-[var(--gold)] hover:gap-1"
      : "gap-0.5 border-transparent px-0 py-0 text-[10px] text-muted-foreground hover:gap-1 hover:text-[var(--gold)]";
  return `inline-flex shrink-0 items-center rounded-md border font-medium transition-all duration-300 ease-out ${
    ctaHot
      ? "animate-glow-pulse scale-110 gap-1 border-[var(--gold)]/60 bg-[var(--bagua-active-bg)] px-2.5 py-1 text-xs text-[var(--gold)] shadow-[0_0_16px_color-mix(in_oklab,var(--gold)_40%,transparent)]"
      : idleClass
  }`;
}

/** 示例/故事卡 CTA：滚入视口时高亮「测这个」，与 OthersStoriesPager 一致 */
export function useSampleCtaHot(isLast = false) {
  const [ctaHot, setCtaHot] = useState(false);
  const footRef = useRef<HTMLDivElement>(null);
  const hotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hotActive = useRef(false);
  const wasVisible = useRef(false);

  const highlightCta = useCallback(() => {
    if (hotActive.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    hotActive.current = true;
    setCtaHot(true);
    if (hotTimer.current) clearTimeout(hotTimer.current);
    hotTimer.current = setTimeout(() => {
      hotActive.current = false;
      setCtaHot(false);
    }, CTA_HOT_MS);
  }, []);

  useEffect(
    () => () => {
      if (hotTimer.current) clearTimeout(hotTimer.current);
    },
    [],
  );

  useEffect(() => {
    const el = footRef.current;
    if (!el) return;

    const root = el.closest(".home-deck-page") as Element | null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= (isLast ? 0.12 : 0.28) && !wasVisible.current) {
          wasVisible.current = true;
          highlightCta();
        } else if (!entry.isIntersecting) {
          wasVisible.current = false;
        }
      },
      {
        root,
        threshold: isLast ? [0, 0.12, 0.35, 0.6] : [0, 0.28, 0.55],
        rootMargin: isLast ? "0px 0px 8px 0px" : "0px 0px -8% 0px",
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [highlightCta, isLast]);

  return { footRef, ctaHot, highlightCta };
}
