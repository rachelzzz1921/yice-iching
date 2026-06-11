import type { CategoryId, HistoryRecord } from "@/lib/iching";
import { generateRandomId } from "@/lib/random-id";

/** 空字符串时回退 /api，避免请求落到前端路由变成 404 Not Found */
export const API_BASE =
  (typeof import.meta.env.VITE_API_URL === "string" && import.meta.env.VITE_API_URL.trim()) ||
  "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("iching:token");
}

export { getToken };

export const OFFLINE_GUEST_TOKEN_PREFIX = "offline-guest:";

export function isOfflineGuestToken(token?: string | null): boolean {
  const t = token ?? getToken();
  return !!t?.startsWith(OFFLINE_GUEST_TOKEN_PREFIX);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("iching:token", token);
  else window.localStorage.removeItem("iching:token");
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.auth !== false) {
    const token = getToken();
    // 离线游客 token 不能发给后端（会 401），对应请求应走本机逻辑
    if (token && !isOfflineGuestToken(token)) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("无法连接服务器，请检查网络或确认后端已启动", 0);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : {};
  if (!res.ok) {
    const jsonError = typeof data.error === "string" ? data.error.trim() : "";
    const msg =
      jsonError ||
      (res.status === 503 || res.status === 502
        ? "服务暂时不可用，请稍后重试"
        : res.status === 500
          ? import.meta.env.DEV
            ? "服务器错误，请稍后重试（本地开发请确认 Postgres 已启动：docker compose up -d postgres）"
            : "服务器错误，请稍后重试"
          : res.status === 404
            ? contentType.includes("text/html")
              ? "接口未找到：请确认后端已启动并通过 /api 访问"
              : "接口不存在，请刷新页面或确认后端已更新"
            : res.statusText === "Not Found"
              ? "接口不存在，请刷新页面或确认后端已更新"
              : res.statusText) ||
      "请求失败";
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

const GUEST_DEVICE_KEY = "iching:guestDeviceId";

export function getGuestDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(GUEST_DEVICE_KEY);
  if (!id) {
    id = generateRandomId();
    window.localStorage.setItem(GUEST_DEVICE_KEY, id);
  }
  return id;
}

export function setGuestDeviceId(deviceId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_DEVICE_KEY, deviceId);
}

export function clearGuestDeviceId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_DEVICE_KEY);
}

export type AuthUser = {
  id: number;
  email: string;
  nickname: string;
  created_at?: string;
  is_guest?: boolean;
};

export function isGuestUser(user: AuthUser | null | undefined): boolean {
  return !!user?.is_guest || (user?.email?.endsWith("@guest.local") ?? false);
}

export type ReferralStatus = {
  code: string;
  invitesPerReward: number;
  creditsPerReward: number;
  totalInvites: number;
  progressInCycle: number;
  invitesUntilReward: number;
  rewardsGranted: number;
  totalCreditsFromReferrals: number;
};

export async function apiReferralStatus() {
  return request<{ status: ReferralStatus }>("/referral/status");
}

export async function apiRegister(
  email: string,
  password: string,
  nickname?: string,
  referralCode?: string,
) {
  return request<{ token: string; user: AuthUser; referral?: { ok: boolean } }>(
    "/auth/register",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password, nickname, referralCode }),
    },
  );
}

export async function apiLogin(email: string, password: string) {
  return request<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGuestLogin(deviceId?: string) {
  return request<{ token: string; user: AuthUser; deviceId: string }>("/auth/guest", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ deviceId: deviceId || getGuestDeviceId() }),
  });
}

export async function apiUpgradeAccount(
  email: string,
  password: string,
  nickname?: string,
  referralCode?: string,
) {
  return request<{ token: string; user: AuthUser; referral?: { ok: boolean } }>("/auth/upgrade", {
    method: "POST",
    body: JSON.stringify({ email, password, nickname, referralCode }),
  });
}

export async function apiMe() {
  return request<{ user: AuthUser & { plan?: string; default_method?: string; ritual_guide?: boolean } }>(
    "/auth/me",
  );
}

export type InterpretInput = {
  category: CategoryId;
  question: string;
  benName: string;
  bianName?: string | null;
  changingLine: number;
  benChar?: string;
  bianChar?: string;
  castMethod?: "coin" | "yarrow" | "meihua" | "direct";
  yao?: { yang: 0 | 1; changing: boolean; label: string }[];
};

export type InterpretFollowUpPayload = {
  greeting: string | null;
  suggestions: string[];
  profileKey?: string;
  talkingPoints?: string[];
};

export type InterpretFactsPayload = {
  benGua: {
    id: number;
    name: string;
    char: string;
    lower: string;
    upper: string;
    lowerWuxing: string;
    upperWuxing: string;
    guaci: string | null;
    xiangci: string | null;
  };
  changingLine: {
    position: number;
    yinyang: "阳" | "阴" | null;
    yaoci: string | null;
    yaoxiang: string | null;
  } | null;
  bianGua: {
    id: number;
    name: string;
    char: string;
    lower: string;
    upper: string;
    guaci: string | null;
  } | null;
  meihua?: unknown;
};

export type InterpretResult = {
  text: string;
  sections: { title: string; body: string }[];
  recordId?: number;
  fromCache?: boolean;
  followUp?: InterpretFollowUpPayload | null;
  facts?: InterpretFactsPayload | null;
  aiFollowUpEnabled?: boolean;
};

export async function apiInterpretReading(input: InterpretInput): Promise<InterpretResult> {
  return request("/divination/interpret", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiFollowUpChat(body: {
  category: CategoryId;
  question: string;
  benName: string;
  bianName: string | null;
  changingLine: number;
  interpretation: string;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  facts?: InterpretFactsPayload | null;
  castMethod?: InterpretInput["castMethod"];
  yao?: InterpretInput["yao"];
  persona?: "analyst" | "master";
}) {
  return request<{ reply: string }>("/divination/follow-up", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiHistoryList(page = 1, limit = 50) {
  return request<{ records: HistoryRecord[]; total: number; page: number }>(
    `/divination/history?page=${page}&limit=${limit}`,
  );
}

export async function apiHistoryGet(id: string) {
  return request<HistoryRecord>(`/divination/history/${id}`);
}

export async function apiHistoryDelete(id: string) {
  return request<{ success: boolean }>(`/divination/history/${id}`, { method: "DELETE" });
}

export async function apiSyncLocalHistory(records: HistoryRecord[]) {
  return request<{ success: boolean; imported: number; skipped: number; total: number }>(
    "/divination/history/sync",
    {
      method: "POST",
      body: JSON.stringify({ records }),
    },
  );
}

export type UserProfile = AuthUser & {
  plan?: string;
  default_method?: string;
  ritual_guide?: boolean;
  bonus_credits?: number;
  stats?: { total: number; this_month: number };
};

export type MembershipStatus = {
  plan: string;
  isGuest: boolean;
  unlimited: boolean;
  used: number;
  freeLimit: number | null;
  bonusCredits: number;
  remaining: number | null;
  canInterpret: boolean;
  canFollowUp: boolean;
  singlePayPriceCents: number;
  lifetimeMembershipPriceCents: number;
  wechatPayEnabled: boolean;
};

export async function apiMembershipStatus() {
  return request<MembershipStatus>("/membership/status");
}

export async function apiRedeemCode(code: string) {
  return request<{ status: MembershipStatus; user: UserProfile }>("/membership/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export type JsapiPayParams = {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
};

export type PayOrder = {
  id: number;
  order_no: string;
  amount_cents: number;
  credits: number;
  status: string;
  provider?: string;
  product?: string;
  mock?: boolean;
  message?: string;
  priceYuan?: string;
  code_url?: string | null;
  channel?: "native" | "jsapi";
  jsapi?: JsapiPayParams | null;
};

export type PayCreateInput = {
  product?: "credit" | "lifetime";
  channel?: "native" | "jsapi";
  openid?: string | null;
};

export async function apiCreatePayOrder(input: PayCreateInput = {}) {
  return request<PayOrder>("/membership/pay/create", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiSyncPayOrder(orderNo: string) {
  return request<{ order: PayOrder; status: MembershipStatus }>(
    `/membership/pay/order/${encodeURIComponent(orderNo)}`,
  );
}

export async function apiBindWechatOpenid(openid: string) {
  return request<{ success: boolean }>("/wechat/openid/bind", {
    method: "POST",
    body: JSON.stringify({ openid }),
  });
}

export type TipOrderInput = {
  amountCents: number;
  currencyLabel?: string;
  hexagramName?: string;
  question?: string;
  channel?: "native" | "jsapi";
  openid?: string | null;
};

export async function apiCreateTipOrder(input: TipOrderInput) {
  return request<PayOrder & { currencyLabel?: string }>("/membership/tip/create", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiMockCompletePay(orderNo: string) {
  return request<{ status: MembershipStatus }>("/membership/pay/mock-complete", {
    method: "POST",
    body: JSON.stringify({ orderNo }),
  });
}

export async function apiUserProfile() {
  return request<UserProfile>("/user/profile");
}

export async function apiUpdatePreferences(prefs: {
  nickname?: string;
  defaultMethod?: string;
  ritualGuide?: boolean;
}) {
  return request<{ success: boolean }>("/user/preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
}
