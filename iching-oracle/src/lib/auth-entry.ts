const AUTH_ENTRY_KEY = "iching:authEntryConfirmed";
const AUTH_TOKEN_KEY = "iching:token";
/** 旧版仅存 session，首次读取时迁移到 localStorage */
const LEGACY_AUTH_ENTRY_KEY = "iching:authEntryConfirmed";

/** localStorage 不可用时（隐私模式/配额）的进程内兜底 */
let memoryAuthEntryConfirmed = false;

function readPersistedAuthEntry(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(AUTH_ENTRY_KEY) === "1") return true;
    // 迁移旧 session 标记
    const legacy = window.sessionStorage.getItem(LEGACY_AUTH_ENTRY_KEY);
    if (legacy === "1") {
      window.localStorage.setItem(AUTH_ENTRY_KEY, "1");
      window.sessionStorage.removeItem(LEGACY_AUTH_ENTRY_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function hasPersistedLoginToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return false;
  }
}

/** 用户已明确选择「游客」或「账号」入内（跨会话保持） */
export function hasAuthEntryConfirmed(): boolean {
  if (memoryAuthEntryConfirmed) return true;
  return readPersistedAuthEntry();
}

export function confirmAuthEntry() {
  memoryAuthEntryConfirmed = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_ENTRY_KEY, "1");
    window.sessionStorage.removeItem(LEGACY_AUTH_ENTRY_KEY);
  } catch {
    /* 仅内存标记 */
  }
}

export function clearAuthEntry() {
  memoryAuthEntryConfirmed = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_ENTRY_KEY);
    window.sessionStorage.removeItem(LEGACY_AUTH_ENTRY_KEY);
  } catch {
    /* ignore */
  }
}

/** 未确认入内方式时需先走选择页；已有有效登录 token 则视为已确认 */
export function needsAuthEntryChoice(_hasUser?: boolean): boolean {
  if (hasAuthEntryConfirmed()) return false;
  if (hasPersistedLoginToken()) return false;
  return true;
}

type DivineSearch = Record<string, unknown>;

/** 组装问卜页路径（含 search），用作 return */
export function buildDivineHref(search?: DivineSearch): string {
  if (!search || Object.keys(search).length === 0) return "/divine";
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(search)) {
    if (val === undefined || val === null || val === "") continue;
    if (key === "return") continue;
    params.set(key, String(val));
  }
  const qs = params.toString();
  return qs ? `/divine?${qs}` : "/divine";
}

export function buildLoginChooseHref(returnPath: string) {
  return {
    to: "/login" as const,
    search: { return: returnPath, mode: "choose" as const },
  };
}

/** 当前地址是否与 return 目标一致（已在目标页则无需再跳转） */
export function isSameReturnLocation(returnPath: string): boolean {
  if (typeof window === "undefined") return false;
  const current = `${window.location.pathname}${window.location.search}`;
  const target = returnPath.trim();
  return current === target || window.location.pathname === target.split("?")[0];
}

