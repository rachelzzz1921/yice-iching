#!/usr/bin/env node
/**
 * 易测通路冒烟测试（需 backend 在 3001 运行）
 * 运行: node scripts/smoke-pathways.mjs
 */
const BASE = process.env.API_BASE || "http://127.0.0.1:3001";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "yice123";

let failed = 0;

function ok(name, cond, detail = "") {
  if (cond) {
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
    return true;
  }
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  failed++;
  return false;
}

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\n易测通路冒烟 @ ${BASE}\n`);

  const health = await req("GET", "/health");
  ok("health", health.status === 200);

  const guest = await req("POST", "/auth/guest", {});
  ok("guest login", guest.status === 200 && guest.data.token);
  const guestToken = guest.data.token;

  const offlineMe = await req("GET", "/auth/me", null, "offline-guest:fake-id");
  ok("offline token rejected", offlineMe.status === 401);

  const interp = await req(
    "POST",
    "/divination/interpret",
    {
      category: "career",
      question: "通路测试",
      benName: "乾",
      bianName: "坤",
      benChar: "乾",
      bianChar: "坤",
      changingLine: 1,
      castMethod: "coin",
    },
    guestToken,
  );
  ok("interpret", interp.status === 200 && interp.data.sections?.length > 0);

  const history = await req("GET", "/divination/history?page=1&limit=5", null, guestToken);
  ok("history list", history.status === 200);

  const membership = await req("GET", "/membership/status", null, guestToken);
  ok("membership", membership.status === 200);

  const email = `smoke_${Date.now()}@yice.test`;
  const reg = await req("POST", "/auth/register", { email, password: "test1234", nickname: "冒烟" });
  ok("register", reg.status === 200 && reg.data.token);
  const userToken = reg.data.token;

  const me = await req("GET", "/auth/me", null, userToken);
  ok("me", me.status === 200 && me.data.user?.email === email);

  const adminLogin = await req("POST", "/admin/login", { password: ADMIN_PASSWORD });
  ok("admin login", adminLogin.status === 200 && adminLogin.data.token);
  const adminToken = adminLogin.data.token;

  const codes = await req("GET", "/admin/redemption-codes?page=1&limit=5", null, adminToken);
  ok("admin codes", codes.status === 200);

  const exp = await req("GET", "/admin/redemption-codes/export", null, adminToken);
  ok("admin export", exp.status === 200 && Array.isArray(exp.data.codes));

  const imp = await req(
    "POST",
    "/admin/redemption-codes/import",
    {
      rows: [
        {
          code: `YICE-SMOKE-${Date.now()}`,
          kind: "credits",
          maxRedemptions: 3,
          creditAmount: 1,
          note: "smoke-pathways",
          __line: 2,
        },
      ],
    },
    adminToken,
  );
  ok("admin import", imp.status === 200 && imp.data.created >= 1, imp.data?.message);

  const badRoute = await req("GET", "/history");
  ok("unknown route 404 json", badRoute.status === 404 && typeof badRoute.data.error === "string");

  console.log(failed ? `\n${failed} 项失败\n` : "\n全部通过\n");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
