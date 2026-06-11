import { ApiError, isOfflineGuestToken } from "@/lib/api";

/** 云端不可用时可降级走本地逻辑（不含额度/鉴权类错误） */
export function isRecoverableApiFailure(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (!(err instanceof ApiError)) return false;
  if (err.status === 402 || err.status === 401 || err.status === 403) return false;
  return err.status === 0 || err.status === 404 || err.status === 502 || err.status === 503 || err.status === 504;
}

export function isAuthExpired(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

export function formatApiErrorMessage(err: unknown, fallback = "请求失败"): string {
  if (err instanceof ApiError && err.message) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** 401 时 refresh 后重试一次；仍失败则抛出原错误 */
export async function withAuthRetry<T>(
  fn: () => Promise<T>,
  refresh: () => Promise<void>,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!isAuthExpired(e)) throw e;
    if (isOfflineGuestToken()) throw e;
    await refresh();
    return await fn();
  }
}

export const SOFT_NOTICE_CLASS =
  "rounded-lg border border-[var(--gold)]/25 bg-[var(--bagua-active-bg)]/40 px-3 py-2 text-xs text-muted-foreground";
