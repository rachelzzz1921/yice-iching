import { ApiError, API_BASE } from "@/lib/api";

const ADMIN_TOKEN_KEY = "iching:adminToken";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  else window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("无法连接服务器，请检查网络或确认后端已启动", 0);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : {};
  if (!res.ok) {
    const jsonError = typeof data.error === "string" ? data.error.trim() : "";
    let fallback =
      res.status === 500
        ? "服务器错误（常见原因：数据库未连接）"
        : res.statusText || "请求失败";
    if (res.status === 404) {
      fallback =
        jsonError ||
        (contentType.includes("text/html")
          ? "接口未找到：请重启后端（cd backend && npm run dev），并确认通过 /api 代理访问"
          : "接口未找到：请确认后端已启动（端口 3001）且为最新代码");
    }
    throw new ApiError(jsonError || fallback, res.status);
  }
  return data as T;
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function adminLogin(password: string) {
  return adminRequest<{ token: string; expiresIn: string }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export type AdminOverview = {
  users: { total: number; guests: number; registered: number; new_7d: number };
  divinations: { total: number; month: number; today: number };
  categories30d: { category: string; count: number }[];
  scope?: { source: string; note: string };
};

export async function adminFetchOverview() {
  return adminRequest<AdminOverview>("/admin/overview");
}

export type AdminTrends = {
  divinations: { day: string; count: number }[];
  users: { day: string; count: number }[];
};

export async function adminFetchTrends() {
  return adminRequest<AdminTrends>("/admin/trends");
}

export type AdminHealth = {
  ok: boolean;
  database: boolean;
  databaseError?: string | null;
  redis: boolean | null;
  redisEnabled: boolean;
  adminPasswordConfigured: boolean;
  zhipuConfigured: boolean;
  wechatPayEnabled?: boolean;
  allowMockPay?: boolean;
  membershipReady?: boolean;
  corsOrigin: string | null;
  uptimeSec: number;
};

export async function adminFetchHealth() {
  return adminRequest<AdminHealth>("/admin/health");
}

export async function adminStartDatabase() {
  return adminRequest<{ success: boolean; database: boolean; message: string; log?: string | null }>(
    "/admin/database/start",
    { method: "POST" },
  );
}

export type AdminUserRow = {
  id: number;
  email: string;
  nickname: string | null;
  plan: string;
  is_guest: boolean;
  bonus_credits?: number;
  created_at: string;
  divination_count: number;
};

export type AdminUsersQuery = {
  page?: number;
  limit?: number;
  q?: string;
  guest?: "true" | "false" | "";
  plan?: string;
};

export async function adminFetchUsers(query: AdminUsersQuery = {}) {
  return adminRequest<{ users: AdminUserRow[]; total: number; page: number; limit: number }>(
    `/admin/users${qs({
      page: query.page,
      limit: query.limit,
      q: query.q,
      guest: query.guest,
      plan: query.plan,
    })}`,
  );
}

export type AdminUserDetail = {
  user: AdminUserRow & { default_method?: string; ritual_guide?: boolean; bonus_credits: number };
  stats: { total: number; month: number };
  recentDivinations: AdminDivinationRow[];
};

export async function adminFetchUser(id: number) {
  return adminRequest<AdminUserDetail>(`/admin/users/${id}`);
}

export async function adminUpdateUser(
  id: number,
  body: { plan?: string; nickname?: string | null; bonus_credits?: number },
) {
  return adminRequest<{ user: AdminUserRow & { bonus_credits?: number } }>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type AdminDivinationRow = {
  id: number;
  userId: number;
  userEmail: string;
  userNickname: string | null;
  isGuest: boolean;
  category: string;
  question: string;
  benName?: string;
  bianName?: string;
  changingLine: number;
  createdAt: string;
  interpretationPreview?: string;
  hasFullInterpretation?: boolean;
};

export type AdminDivinationDetail = AdminDivinationRow & {
  interpretation: string;
  sections: { title: string; body: string }[];
  followUpMessages?: { role: string; content: string }[];
};

export type AdminDivinationsQuery = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  userId?: number;
};

export async function adminFetchDivinations(query: AdminDivinationsQuery = {}) {
  return adminRequest<{
    records: AdminDivinationRow[];
    total: number;
    page: number;
    limit: number;
  }>(
    `/admin/divinations${qs({
      page: query.page,
      limit: query.limit,
      q: query.q,
      category: query.category,
      userId: query.userId,
    })}`,
  );
}

export async function adminFetchDivination(id: number) {
  return adminRequest<AdminDivinationDetail>(`/admin/divinations/${id}`);
}

export async function adminDeleteDivination(id: number) {
  return adminRequest<{ success: boolean; id: number }>(`/admin/divinations/${id}`, {
    method: "DELETE",
  });
}

export type RedemptionCodeStatus = "active" | "disabled" | "expired";

export type AdminRedemptionCode = {
  id: number;
  code: string;
  kind: "lifetime" | "member" | "credits";
  kindLabel: string;
  creditAmount: number;
  maxRedemptions: number;
  redemptionCount: number;
  /** 运营展示：56 / 500 */
  usageDisplay: string;
  remaining: number;
  exhausted: boolean;
  enabled: boolean;
  status: RedemptionCodeStatus;
  statusLabel: string;
  note: string | null;
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
};

export async function adminFetchRedemptionCodes(params?: {
  page?: number;
  limit?: number;
  q?: string;
  kind?: string;
  status?: string;
}) {
  return adminRequest<{
    codes: AdminRedemptionCode[];
    total: number;
    page: number;
    limit: number;
    tablesMissing?: boolean;
    error?: string;
  }>(
    `/admin/redemption-codes${qs({
      page: params?.page,
      limit: params?.limit,
      q: params?.q,
      kind: params?.kind,
      status: params?.status,
    })}`,
  );
}

export async function adminCreateRedemptionCode(body: {
  code?: string;
  kind?: string;
  maxRedemptions?: number;
  creditAmount?: number;
  note?: string;
  expiresAt?: string | null;
  prefix?: string;
}) {
  return adminRequest<{ code: AdminRedemptionCode }>("/admin/redemption-codes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminSeedRedemptionCodes() {
  return adminRequest<{
    seeded: boolean;
    message: string;
    codes: AdminRedemptionCode[];
  }>("/admin/redemption-codes/seed", { method: "POST" });
}

export type AdminRedemptionUse = {
  id: number;
  redeemedAt: string;
  userId: number;
  email: string;
  nickname: string | null;
  plan: string;
  isGuest: boolean;
};

export async function adminFetchRedemptionCode(id: number) {
  return adminRequest<{ code: AdminRedemptionCode; uses: AdminRedemptionUse[] }>(
    `/admin/redemption-codes/${id}`,
  );
}

export async function adminUpdateRedemptionCode(
  id: number,
  body: { note?: string | null; expiresAt?: string | null; enabled?: boolean },
) {
  return adminRequest<{ code: AdminRedemptionCode }>(`/admin/redemption-codes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function adminExportRedemptionCodes(params?: {
  q?: string;
  kind?: string;
  status?: string;
}) {
  return adminRequest<{
    codes: AdminRedemptionCode[];
    total: number;
    truncated: boolean;
    exportMax: number;
    tablesMissing?: boolean;
  }>(
    `/admin/redemption-codes/export${qs({
      q: params?.q,
      kind: params?.kind,
      status: params?.status,
    })}`,
  );
}

export type AdminRedemptionImportResult = {
  created: number;
  skipped: number;
  failed: number;
  message: string;
  createdCodes: AdminRedemptionCode[];
  skippedItems: { line: number; code: string; reason: string }[];
  failedItems: { line: number; code: string; error: string }[];
};

export async function adminImportRedemptionCodes(
  rows: {
    code?: string;
    kind: string;
    maxRedemptions: number;
    creditAmount?: number;
    note?: string;
    expiresAt?: string | null;
    enabled?: string | boolean;
    prefix?: string;
    __line?: number;
  }[],
) {
  return adminRequest<AdminRedemptionImportResult>("/admin/redemption-codes/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export type AdminPaymentOrder = {
  id: number;
  orderNo: string;
  amountCents: number;
  credits: number;
  status: string;
  provider: string;
  providerTradeNo: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  userId: number;
  userEmail: string;
  userNickname: string | null;
  isGuest: boolean;
};

export async function adminFetchPayments(params?: {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
}) {
  return adminRequest<{
    orders: AdminPaymentOrder[];
    total: number;
    page: number;
    limit: number;
    tablesMissing?: boolean;
  }>(
    `/admin/payments${qs({
      page: params?.page,
      limit: params?.limit,
      status: params?.status,
      q: params?.q,
    })}`,
  );
}

export async function adminRunDatabaseMigrate() {
  return adminRequest<{ success: boolean; message: string }>("/admin/database/migrate", {
    method: "POST",
  });
}

export type AdminSetupDatabaseResult = {
  success: boolean;
  message: string;
  migrated: boolean;
  seeded: boolean;
  total: number;
  codes: AdminRedemptionCode[];
};

export async function adminSetupDatabase(): Promise<AdminSetupDatabaseResult> {
  try {
    return await adminRequest<AdminSetupDatabaseResult>("/admin/database/setup", {
      method: "POST",
    });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
    await adminRunDatabaseMigrate();
    const seed = await adminSeedRedemptionCodes();
    const list = await adminFetchRedemptionCodes({ page: 1, limit: 100 });
    return {
      success: true,
      migrated: true,
      seeded: seed.seeded,
      message: `数据库已同步（兼容路径）；${seed.message}`,
      total: list.total,
      codes: list.codes,
    };
  }
}
