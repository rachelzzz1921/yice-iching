import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { EXPLORE_PAGES } from "@/components/home/homePages";
import { useDevice } from "@/hooks/use-device";
import { playRitualSound, unlockRitualAudio } from "@/lib/ritual-sounds";

type Props = {
  page: number;
  onPageChange: (index: number) => void;
  pages: ReactNode[];
};

type TouchGesture = {
  y0: number;
  x0: number;
  mode: "none" | "scroll" | "page";
};

const FLIP_THRESHOLD = 56;
const AXIS_LOCK_PX = 10;

function pageScrollMetrics(el: HTMLElement | null) {
  if (!el) return { canUp: false, canDown: false, overflow: false };
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 2) return { canUp: false, canDown: false, overflow: false };
  return {
    canUp: el.scrollTop > 2,
    canDown: el.scrollTop < max - 2,
    overflow: true,
  };
}

function formatDeckHint(
  scrollHint: "more" | "flip-next" | "flip-prev" | null,
  desktop: boolean,
) {
  if (scrollHint === "more") {
    return desktop ? "滚轮滚动本页内容" : "本页继续下滑阅读";
  }
  if (scrollHint === "flip-next") {
    return desktop ? "已到底 · 继续向下翻页" : "已到底 · 再滑翻下一页";
  }
  if (scrollHint === "flip-prev") {
    return desktop ? "已到顶 · 继续向上翻页" : "已到顶 · 再滑回上一页";
  }
  return desktop ? "↑↓ ←→ 翻页 · 滚轮在边缘翻页" : "上滑 / 下滑翻页";
}

export function HomeDeck({ page, onPageChange, pages }: Props) {
  const { isMobile, isDesktop } = useDevice();
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  const [scrollHint, setScrollHint] = useState<"more" | "flip-next" | "flip-prev" | null>(null);
  const lock = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchRef = useRef<TouchGesture>({ y0: 0, x0: 0, mode: "none" });
  const total = pages.length;

  const activePageEl = useCallback(() => pageRefs.current[page] ?? null, [page]);

  const updateScrollHint = useCallback(() => {
    const el = activePageEl();
    const { canUp, canDown, overflow } = pageScrollMetrics(el);
    if (el) {
      el.classList.toggle("has-scroll-room", overflow);
      el.classList.toggle("at-scroll-bottom", overflow && !canDown);
    }
    if (!overflow) {
      setScrollHint(null);
      return;
    }
    if (canDown) setScrollHint("more");
    else if (page < total - 1) setScrollHint("flip-next");
    else if (canUp) setScrollHint("flip-prev");
    else setScrollHint(null);
  }, [activePageEl, page, total]);

  useEffect(() => {
    updateScrollHint();
    const el = activePageEl();
    if (el) el.scrollTop = 0;
    if (!el) return;
    const onScroll = () => updateScrollHint();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activePageEl, page, updateScrollHint]);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= total || next === page || lock.current) return;
      lock.current = true;
      unlockRitualAudio();
      playRitualSound("ui-step");
      setDir(next > page ? "next" : "prev");
      onPageChange(next);
      window.setTimeout(() => {
        lock.current = false;
        setDir(null);
      }, 560);
    },
    [onPageChange, page, total],
  );

  const next = useCallback(() => go(page + 1), [go, page]);
  const prev = useCallback(() => go(page - 1), [go, page]);

  useEffect(() => {
    if (!isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, isDesktop, next, prev, total]);

  useEffect(() => {
    if (!isMobile) return;
    const root = viewportRef.current;
    if (!root) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      touchRef.current = { y0: t.clientY, x0: t.clientX, mode: "none" };
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const g = touchRef.current;
      if (!t || g.mode !== "none") return;

      const dy = t.clientY - g.y0;
      const dx = t.clientX - g.x0;
      if (Math.abs(dy) < AXIS_LOCK_PX && Math.abs(dx) < AXIS_LOCK_PX) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        g.mode = "scroll";
        return;
      }

      const metrics = pageScrollMetrics(activePageEl());
      if (dy > 0 && metrics.canUp) g.mode = "scroll";
      else if (dy < 0 && metrics.canDown) g.mode = "scroll";
      else g.mode = "page";
    };

    const onTouchEnd = (e: TouchEvent) => {
      const g = touchRef.current;
      const t = e.changedTouches[0];
      if (!t || g.mode !== "page") {
        touchRef.current = { y0: 0, x0: 0, mode: "none" };
        return;
      }

      const dy = t.clientY - g.y0;
      touchRef.current = { y0: 0, x0: 0, mode: "none" };
      if (Math.abs(dy) < FLIP_THRESHOLD) return;

      if (dy < 0) next();
      else prev();
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
    };
  }, [activePageEl, isMobile, next, prev]);

  useEffect(() => {
    if (!isDesktop) return;
    const el = activePageEl();
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const metrics = pageScrollMetrics(el);
      if (e.deltaY > 0 && metrics.canDown) return;
      if (e.deltaY < 0 && metrics.canUp) return;
      if (e.deltaY > 0 && page < total - 1) {
        e.preventDefault();
        next();
      } else if (e.deltaY < 0 && page > 0) {
        e.preventDefault();
        prev();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [activePageEl, isDesktop, next, page, prev, total]);

  const hintText = formatDeckHint(scrollHint, isDesktop);
  const pageLabel = EXPLORE_PAGES[page]?.label ?? "";

  return (
    <div className="home-deck relative flex min-h-0 flex-1 flex-col">
      <div ref={viewportRef} className="home-deck-viewport relative min-h-0 flex-1 overflow-hidden">
        <button
          type="button"
          className="home-deck-side home-deck-side--prev"
          onClick={prev}
          disabled={page === 0}
          aria-label={`上一页${page > 0 ? `：${EXPLORE_PAGES[page - 1]?.label}` : ""}`}
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="home-deck-side home-deck-side--next"
          onClick={next}
          disabled={page >= total - 1}
          aria-label={`下一页${page < total - 1 ? `：${EXPLORE_PAGES[page + 1]?.label}` : ""}`}
        >
          <ChevronRight size={18} aria-hidden />
        </button>

        <div
          className={`home-deck-track ${dir === "next" ? "is-next" : dir === "prev" ? "is-prev" : ""}`}
          style={{ transform: `translate3d(0, -${page * 100}%, 0)` }}
        >
          {pages.map((content, i) => (
            <div
              key={EXPLORE_PAGES[i]?.id ?? i}
              ref={(node) => {
                pageRefs.current[i] = node;
              }}
              className={`home-deck-page ${i === page ? "is-active" : ""}`}
              aria-hidden={i !== page}
            >
              {content}
            </div>
          ))}
        </div>
      </div>

      <div className="home-deck-controls flex shrink-0 items-center justify-between border-t border-border/70 bg-card/80 px-3 py-2 sm:px-5">
        <button
          type="button"
          onClick={prev}
          disabled={page === 0}
          className="home-deck-control-btn inline-flex min-h-[2.25rem] items-center gap-0.5 rounded-sm border border-border px-2 py-1.5 text-[10px] text-muted-foreground transition hover:border-[var(--gold)]/40 hover:text-foreground disabled:opacity-30 sm:gap-1 sm:px-2.5 sm:text-[11px]"
        >
          <ChevronUp size={14} />
          <span className="hidden min-[380px]:inline">上一页</span>
          <span className="min-[380px]:hidden">上页</span>
        </button>
        <div className="home-deck-hint-wrap min-w-0 flex-1 px-2 text-center">
          <p className="home-deck-hint leading-snug">{hintText}</p>
          {isDesktop && pageLabel ? (
            <p className="home-deck-hint-sub mt-0.5 truncate text-[10px] tracking-[0.12em] text-muted-foreground">
              当前 · {pageLabel}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={page >= total - 1}
          className="home-deck-control-btn inline-flex min-h-[2.25rem] items-center gap-0.5 rounded-sm border border-border px-2 py-1.5 text-[10px] text-muted-foreground transition hover:border-[var(--gold)]/40 hover:text-foreground disabled:opacity-30 sm:gap-1 sm:px-2.5 sm:text-[11px]"
        >
          <span className="hidden min-[380px]:inline">下一页</span>
          <span className="min-[380px]:hidden">下页</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}
