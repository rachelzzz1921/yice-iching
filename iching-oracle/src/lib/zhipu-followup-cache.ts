import { createHash } from "node:crypto";
import type { FollowUpPersona } from "@/lib/follow-up-persona";
import type { CategoryId } from "@/lib/iching";

type FollowUpCacheInput = {
  category: CategoryId;
  benName: string;
  bianName?: string | null;
  changingLine: number;
  userMessage: string;
  persona?: FollowUpPersona;
  history: { role: string; content: string }[];
};

type CacheEntry = { reply: string; expiresAt: number };

const TTL_MS = Number(process.env.ZHIPU_FOLLOWUP_CACHE_TTL_MS) || 30 * 60 * 1000;
const MAX_ENTRIES = 64;

const cache = new Map<string, CacheEntry>();

function stableKey(input: FollowUpCacheInput): string {
  const historySig = input.history
    .slice(-4)
    .map((m) => `${m.role}:${m.content.trim().slice(0, 120)}`)
    .join("|");
  const raw = JSON.stringify({
    c: input.category,
    ben: input.benName,
    bian: input.bianName ?? "",
    line: input.changingLine,
    p: input.persona ?? "master",
    q: input.userMessage.trim().slice(0, 300),
    h: historySig,
  });
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export function getCachedFollowUpReply(input: FollowUpCacheInput): string | null {
  const hit = cache.get(stableKey(input));
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(stableKey(input));
    return null;
  }
  return hit.reply;
}

export function setCachedFollowUpReply(input: FollowUpCacheInput, reply: string): void {
  const key = stableKey(input);
  cache.set(key, { reply, expiresAt: Date.now() + TTL_MS });
  if (cache.size <= MAX_ENTRIES) return;
  const oldest = cache.keys().next().value;
  if (oldest) cache.delete(oldest);
}
