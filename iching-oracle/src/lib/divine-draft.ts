import type { CategoryId, CoinYao } from "@/lib/iching";
import type { CastMethod } from "@/lib/profile";

const STORAGE_KEY = "iching:divine-draft";

export type DivineDraft = {
  yaoList: CoinYao[];
  method: CastMethod;
  category: CategoryId;
  question: string;
  updatedAt: number;
};

export function saveDivineDraft(draft: DivineDraft): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function loadDivineDraft(): DivineDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DivineDraft;
    if (!Array.isArray(parsed.yaoList) || parsed.yaoList.length !== 6) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDivineDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** 草稿是否与当前问事一致（避免错卦） */
export function draftMatchesSession(
  draft: DivineDraft,
  category: CategoryId,
  question: string,
  method: CastMethod,
): boolean {
  return (
    draft.category === category &&
    draft.question === question &&
    draft.method === method &&
    draft.yaoList.length === 6
  );
}
