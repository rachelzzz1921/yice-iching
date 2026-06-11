/** 离线游客本地次数（与后端 GUEST_FREE_LIMIT 对齐） */
export const OFFLINE_GUEST_FREE_LIMIT = 5;

const USES_KEY = "iching:offlineGuestUses";

export function getOfflineGuestUses(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(USES_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function recordOfflineGuestUse() {
  if (typeof window === "undefined") return;
  const next = getOfflineGuestUses() + 1;
  window.localStorage.setItem(USES_KEY, String(next));
}

export function offlineGuestRemaining(): number {
  return Math.max(0, OFFLINE_GUEST_FREE_LIMIT - getOfflineGuestUses());
}

export function assertOfflineGuestCanInterpret() {
  if (offlineGuestRemaining() <= 0) {
    throw new Error(
      `离线游客免费额度已用完（${OFFLINE_GUEST_FREE_LIMIT} 次）。请登录后购买单次解读或兑换永久会员。`,
    );
  }
}
