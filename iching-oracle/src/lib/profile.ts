import { loadHistory, type CategoryId } from "@/lib/iching";

export type CastMethod = "coin" | "yarrow" | "meihua" | "direct";

export const METHOD_LABELS: Record<CastMethod, string> = {
  coin: "铜钱摇卦",
  yarrow: "蓍草数",
  meihua: "梅花易数",
  direct: "直接输入",
};

export type ProfileSettings = {
  displayName: string;
  defaultMethod: CastMethod;
  ritualGuide: boolean;
  openHistory: boolean;
  joinedAt: number;
};

const PROFILE_KEY = "iching:profile";

const DEFAULT_PROFILE: ProfileSettings = {
  displayName: "木子同学",
  defaultMethod: "coin",
  ritualGuide: true,
  openHistory: false,
  joinedAt: new Date("2025-03-01").getTime(),
};

export function loadProfile(): ProfileSettings {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<ProfileSettings>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(patch: Partial<ProfileSettings>) {
  if (typeof window === "undefined") return;
  const next = { ...loadProfile(), ...patch };
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
}

export function profileStats() {
  const items = loadHistory();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonth = items.filter((r) => r.createdAt >= monthStart).length;
  return {
    total: items.length,
    thisMonth,
    saved: items.length,
  };
}

export function formatJoined(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

export function isValidMethod(v: unknown): v is CastMethod {
  return v === "coin" || v === "yarrow" || v === "meihua" || v === "direct";
}

export function isValidCategory(v: unknown): v is CategoryId {
  return v === "career" || v === "family" || v === "relationship" || v === "fate" || v === "health";
}
