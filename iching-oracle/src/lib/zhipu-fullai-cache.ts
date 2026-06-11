import { createHash } from "node:crypto";
import type { InterpretInput, InterpretResult } from "@/lib/interpret.local";

type CacheEntry = { result: InterpretResult; expiresAt: number };

const TTL_MS = Number(process.env.ZHIPU_FULL_AI_CACHE_TTL_MS) || 60 * 60 * 1000;
const MAX_ENTRIES = 48;

const cache = new Map<string, CacheEntry>();

function stableKey(input: InterpretInput): string {
  const raw = JSON.stringify({
    c: input.category,
    q: input.question.trim().slice(0, 300),
    ben: input.benName,
    bian: input.bianName ?? "",
    line: input.changingLine,
    method: input.castMethod ?? "",
  });
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export function getCachedFullAiInterpret(input: InterpretInput): InterpretResult | null {
  const hit = cache.get(stableKey(input));
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(stableKey(input));
    return null;
  }
  return hit.result;
}

export function setCachedFullAiInterpret(input: InterpretInput, result: InterpretResult): void {
  const key = stableKey(input);
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
  if (cache.size <= MAX_ENTRIES) return;
  const oldest = cache.keys().next().value;
  if (oldest) cache.delete(oldest);
}
