import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiGuestLogin,
  apiLogin,
  apiMe,
  apiRegister,
  apiUpgradeAccount,
  clearGuestDeviceId,
  getGuestDeviceId,
  getToken,
  isOfflineGuestToken,
  OFFLINE_GUEST_TOKEN_PREFIX,
  setGuestDeviceId,
  setToken,
  type AuthUser,
  ApiError,
} from "@/lib/api";
import { isRecoverableApiFailure } from "@/lib/api-errors";
import { syncLocalHistoryToServer } from "@/lib/history-sync";
import {
  clearPendingReferralCode,
  getPendingReferralCode,
} from "@/lib/referral-pending";
import {
  clearAuthEntry,
  confirmAuthEntry,
  hasAuthEntryConfirmed,
  needsAuthEntryChoice,
} from "@/lib/auth-entry";

export type GuestSessionMode = "cloud" | "offline";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  guestMode: GuestSessionMode | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<void>;
  /** 进入游客态；失败时自动降级离线，不抛错 */
  loginAsGuest: () => Promise<GuestSessionMode>;
  upgradeAccount: (email: string, password: string, nickname?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const AUTH_USER_CACHE_KEY = "iching:authUserCache";

function readCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = window.localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!raw) {
      raw = window.sessionStorage.getItem(AUTH_USER_CACHE_KEY);
      if (raw) {
        window.localStorage.setItem(AUTH_USER_CACHE_KEY, raw);
        window.sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
      }
    }
    if (!raw) return null;
    const u = JSON.parse(raw) as AuthUser;
    return u?.email ? u : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(AUTH_USER_CACHE_KEY);
    window.sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
    return;
  }
  try {
    window.localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
    window.sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
  } catch {
    /* ignore quota */
  }
}

function markSessionRestored(user: AuthUser) {
  if (!hasAuthEntryConfirmed()) confirmAuthEntry();
  writeCachedUser(user);
}

function offlineGuestUser(): AuthUser {
  const deviceId = getGuestDeviceId();
  return {
    id: 0,
    email: `guest_${deviceId}@guest.local`,
    nickname: "游客",
    is_guest: true,
  };
}

export function isOfflineGuest(user: AuthUser | null | undefined): boolean {
  return isOfflineGuestToken() || (!!user?.is_guest && user.id === 0);
}

function tokenWasGuestSession(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { isGuest?: boolean };
    return json.isGuest === true;
  } catch {
    return false;
  }
}

async function establishGuestSession(): Promise<{
  mode: GuestSessionMode;
  user: AuthUser;
}> {
  try {
    const { token, user: u, deviceId } = await apiGuestLogin();
    setGuestDeviceId(deviceId);
    setToken(token);
    const user = { ...u, is_guest: true as const };
    void syncLocalHistoryToServer().catch(() => {});
    return { mode: "cloud", user };
  } catch {
    const deviceId = getGuestDeviceId();
    setToken(`${OFFLINE_GUEST_TOKEN_PREFIX}${deviceId}`);
    return { mode: "offline", user: offlineGuestUser() };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = typeof window !== "undefined" ? getToken() : null;
    return token ? readCachedUser() : null;
  });
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState<GuestSessionMode | null>(() => {
    if (typeof window === "undefined") return null;
    if (isOfflineGuestToken()) return "offline";
    const cached = readCachedUser();
    return cached?.is_guest ? "cloud" : null;
  });

  const refresh = useCallback(async () => {
    if (isOfflineGuestToken()) {
      try {
        const { mode, user: u } = await establishGuestSession();
        setGuestMode(mode);
        setUser(u);
        return;
      } catch {
        setGuestMode("offline");
        setUser(offlineGuestUser());
        return;
      }
    }

    const token = getToken();
    if (!token) {
      setUser(null);
      setGuestMode(null);
      return;
    }

    try {
      const { user: u } = await apiMe();
      setUser(u);
      setGuestMode(u.is_guest ? "cloud" : null);
      markSessionRestored(u);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        if (tokenWasGuestSession(token)) {
          const recovered = await establishGuestSession().catch(() => null);
          if (recovered) {
            setGuestMode(recovered.mode);
            setUser(recovered.user);
            markSessionRestored(recovered.user);
            return;
          }
        }
        setToken(null);
        setUser(null);
        setGuestMode(null);
        writeCachedUser(null);
        return;
      }
      if (isRecoverableApiFailure(e)) {
        if (isOfflineGuestToken() || tokenWasGuestSession(token)) {
          setGuestMode("offline");
          const offlineUser = offlineGuestUser();
          setUser(offlineUser);
          markSessionRestored(offlineUser);
          return;
        }
        const cached = readCachedUser();
        if (cached) {
          setUser(cached);
          setGuestMode(cached.is_guest ? (isOfflineGuestToken() ? "offline" : "cloud") : null);
          markSessionRestored(cached);
        }
        return;
      }
      setUser(null);
      setGuestMode(null);
      writeCachedUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await apiLogin(email, password);
    setToken(token);
    setUser(u);
    setGuestMode(null);
    writeCachedUser(u);
    confirmAuthEntry();
    void syncLocalHistoryToServer().catch(() => {});
  }, []);

  const register = useCallback(async (email: string, password: string, nickname?: string) => {
    const referralCode = getPendingReferralCode() ?? undefined;
    const { token, user: u } = await apiRegister(email, password, nickname, referralCode);
    if (referralCode) clearPendingReferralCode();
    clearGuestDeviceId();
    setToken(token);
    setUser(u);
    setGuestMode(null);
    writeCachedUser(u);
    confirmAuthEntry();
    void syncLocalHistoryToServer().catch(() => {});
  }, []);

  const loginAsGuest = useCallback(async () => {
    const { mode, user: u } = await establishGuestSession();
    setGuestMode(mode);
    setUser(u);
    writeCachedUser(u);
    confirmAuthEntry();
    return mode;
  }, []);

  const upgradeAccount = useCallback(async (email: string, password: string, nickname?: string) => {
    if (isOfflineGuestToken()) {
      await register(email, password, nickname);
      return;
    }
    const referralCode = getPendingReferralCode() ?? undefined;
    const { token, user: u } = await apiUpgradeAccount(email, password, nickname, referralCode);
    if (referralCode) clearPendingReferralCode();
    clearGuestDeviceId();
    setToken(token);
    setUser(u);
    setGuestMode(null);
    writeCachedUser(u);
    confirmAuthEntry();
    void syncLocalHistoryToServer().catch(() => {});
  }, [register]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setGuestMode(null);
    writeCachedUser(null);
    clearAuthEntry();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      guestMode,
      login,
      register,
      loginAsGuest,
      upgradeAccount,
      logout,
      refresh,
    }),
    [user, loading, guestMode, login, register, loginAsGuest, upgradeAccount, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function buildAuthLoginHref(returnPath: string, redirectTo = "/login") {
  const returnUrl = encodeURIComponent(returnPath);
  return `${redirectTo}?return=${returnUrl}&mode=choose`;
}

/** 仅需已登录（游客/会员）；不强制「入内方式」选择，用于历史/档案等 */
export function useRequireUser(redirectTo = "/login") {
  const auth = useAuth();
  useEffect(() => {
    if (!auth.loading && !auth.user && typeof window !== "undefined") {
      const returnPath = window.location.pathname + window.location.search;
      window.location.href = buildAuthLoginHref(returnPath, redirectTo);
    }
  }, [auth.loading, auth.user, redirectTo]);
  return auth;
}

export function useRequireAuth(redirectTo = "/login") {
  const auth = useAuth();
  useEffect(() => {
    if (
      !auth.loading &&
      (!auth.user || needsAuthEntryChoice(!!auth.user)) &&
      typeof window !== "undefined"
    ) {
      const returnPath = window.location.pathname + window.location.search;
      window.location.href = buildAuthLoginHref(returnPath, redirectTo);
    }
  }, [auth.loading, auth.user, redirectTo]);
  return auth;
}
