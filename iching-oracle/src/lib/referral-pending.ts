const STORAGE_KEY = "iching:referralCode";

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  return code.length >= 6 ? code.slice(0, 16) : null;
}

export function savePendingReferralCode(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized || typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, normalized);
}

export function getPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeReferralCode(window.localStorage.getItem(STORAGE_KEY));
}

export function clearPendingReferralCode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** 从当前 URL 或 search 字符串读取 ?ref= 并写入本地 */
export function captureReferralFromLocation(search?: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(search ?? window.location.search);
  const ref = params.get("ref") ?? params.get("invite");
  if (ref) savePendingReferralCode(ref);
}

export function buildInviteUrl(code: string): string {
  if (typeof window === "undefined") return `/?ref=${encodeURIComponent(code)}`;
  const url = new URL(window.location.origin);
  url.pathname = "/";
  url.searchParams.set("ref", code);
  return url.toString();
}
