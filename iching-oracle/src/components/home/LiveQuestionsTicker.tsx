import { useEffect, useMemo, useState } from "react";
import { DivineEntryLink } from "@/components/home/DivineEntryLink";
import { CATEGORIES, QUESTIONS, type CategoryId } from "@/lib/iching";

type PoolItem = { q: string; catLabel: string; category: CategoryId };

const POOL: PoolItem[] = (Object.entries(QUESTIONS) as [CategoryId, string[]][]).flatMap(
  ([category, qs]) =>
    qs.map((q) => ({
      q,
      category,
      catLabel: CATEGORIES.find((c) => c.id === category)!.label,
    })),
);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomNext(length: number, current: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

/** 此刻有人想问 — 全库问题乱序轮播 */
export function LiveQuestionsTicker() {
  const pool = useMemo(() => shuffle(POOL), []);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setPhase("out");
      timeoutId = setTimeout(() => {
        setIdx((i) => pickRandomNext(pool.length, i));
        setPhase("in");
      }, 340);
    }, 3800);
    return () => {
      clearInterval(id);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pool.length]);

  const item = pool[idx];

  return (
    <aside className="home-live" aria-label="他人此刻在问">
      <p className="home-live-label">此刻，有人正想问</p>
      <DivineEntryLink
        search={{ category: item.category, q: item.q, skipEntry: true }}
        className="home-live-quote"
        aria-label={`${item.catLabel}：${item.q}，点此问卜`}
      >
        <span className={`home-live-body ${phase === "in" ? "is-in" : "is-out"}`}>
          <span className="home-live-cat">{item.catLabel}</span>
          <span className="home-live-q font-serif-cjk" aria-live="polite">
            「{item.q}」
          </span>
        </span>
      </DivineEntryLink>
    </aside>
  );
}
