import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, Sparkles, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { GuardedDivineLink } from "@/components/home/DivineEntryLink";
import { MembershipRedeemCard } from "@/components/MembershipRedeemCard";
import { PageShell } from "@/components/SiteNav";
import { GuestUpgradeForm } from "@/components/GuestUpgradeForm";
import { InviteFriendsCard } from "@/components/InviteFriendsCard";
import {
  formatApiErrorMessage,
  isRecoverableApiFailure,
  SOFT_NOTICE_CLASS,
  withAuthRetry,
} from "@/lib/api-errors";
import { useAuth } from "@/lib/auth";
import { WechatPayPanel } from "@/components/WechatPayPanel";
import {
  apiCreatePayOrder,
  apiMembershipStatus,
  apiMockCompletePay,
  isGuestUser,
  isOfflineGuestToken,
  type MembershipStatus,
  type PayOrder,
} from "@/lib/api";
import {
  afterPayOrderCreated,
  ensureWechatPayReady,
  withWechatPayInput,
} from "@/lib/wechat-pay-flow";
import { isWechatBrowser } from "@/lib/wechat-env";
import { OFFLINE_GUEST_FREE_LIMIT, offlineGuestRemaining } from "@/lib/guest-quota";

export const Route = createFileRoute("/profile/membership")({
  component: MembershipPage,
});

const PERKS = [
  { label: "无限次起卦与云端 AI 深解", memberOnly: true },
  { label: "追问对话更长上下文", memberOnly: true },
  { label: "卦象导出与分享卡片", memberOnly: false },
  { label: "优先接入新起卦方式", memberOnly: true },
] as const;

function guestQuotaBreakdown(status: MembershipStatus) {
  const freeLimit = status.freeLimit ?? OFFLINE_GUEST_FREE_LIMIT;
  const bonus = status.bonusCredits ?? 0;
  const total = freeLimit + bonus;
  const used = status.used ?? 0;
  const remaining = status.remaining ?? Math.max(0, total - used);
  const freeUsed = Math.min(used, freeLimit);
  const bonusUsed = Math.max(0, used - freeLimit);
  return { freeLimit, bonus, total, used, remaining, freeUsed, bonusUsed };
}

function MembershipStatusCard({
  status,
  guest,
  offline,
}: {
  status: MembershipStatus | null;
  guest: boolean;
  offline: boolean;
}) {
  if (offline) {
    const left = offlineGuestRemaining();
    return (
      <div className="rounded-xl border border-border bg-secondary/35 px-4 py-4">
        <p className="text-xs text-muted-foreground">当前身份 · 离线游客（仅本机）</p>
        <p className="mt-2 font-serif-cjk text-2xl font-medium tabular-nums text-foreground">
          {left}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ {OFFLINE_GUEST_FREE_LIMIT} 次</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">登录游客账号后可同步兑换码、付费与云端存档。</p>
      </div>
    );
  }

  if (!status) return null;

  if (status.unlimited) {
    return (
      <div className="rounded-xl border border-[var(--gold)]/40 bg-[var(--bagua-active-bg)]/55 px-4 py-4">
        <div className="flex items-center gap-2 text-[var(--gold)]">
          <Crown size={16} aria-hidden />
          <span className="text-xs tracking-[0.12em]">永久会员</span>
        </div>
        <p className="mt-2 font-serif-cjk text-lg font-medium text-foreground">无限次解读</p>
        <p className="mt-1 text-xs text-muted-foreground">累计解读 {status.used} 次 · 追问与 AI 功能已全开</p>
      </div>
    );
  }

  const q = guestQuotaBreakdown(status);
  const pct = q.total > 0 ? Math.min(100, Math.round((q.used / q.total) * 100)) : 0;

  return (
    <div className="rounded-xl border border-border bg-secondary/35 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{guest ? "当前身份 · 游客" : "当前账号"}</p>
          <p className="mt-1 font-serif-cjk text-2xl font-medium tabular-nums text-foreground">
            还可解读 {q.remaining} 次
          </p>
        </div>
        {!status.canInterpret && (
          <span className="shrink-0 rounded-full border border-destructive/35 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
            额度已用完
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>已用 {q.used} 次</span>
          <span>总额度 {q.total} 次</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-[var(--gold)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <dl className="mt-3 grid gap-1.5 text-[11px] text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>游客免费</dt>
          <dd className="text-foreground/85">
            {q.freeLimit} 次 · 已用 {q.freeUsed}
            {q.freeUsed >= q.freeLimit ? "（已用尽）" : ` · 剩 ${q.freeLimit - q.freeUsed}`}
          </dd>
        </div>
        {q.bonus > 0 && (
          <div className="flex justify-between gap-2">
            <dt>加购 / 邀请 / 兑换次数</dt>
            <dd className="text-foreground/85">
              {q.bonus} 次 · 已用 {q.bonusUsed}
              {q.bonusUsed >= q.bonus ? "（已用尽）" : ` · 剩 ${q.bonus - q.bonusUsed}`}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function MembershipPage() {
  const { user, refresh } = useAuth();
  const offline = isOfflineGuestToken();
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingOrderNo, setPendingOrderNo] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<PayOrder | null>(null);

  const loadStatus = async () => {
    if (offline) {
      setStatus(null);
      setLoading(false);
      setError("");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    try {
      const s = await withAuthRetry(() => apiMembershipStatus(), refresh);
      setStatus(s);
    } catch (e) {
      if (isRecoverableApiFailure(e)) {
        setNotice("会员信息暂无法同步，请稍后重试");
      } else {
        setError(formatApiErrorMessage(e, "加载会员状态失败"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [offline]);

  const handlePay = async (product: "credit" | "lifetime") => {
    if (offline) {
      setNotice("离线游客需先注册账号后才能购买");
      return;
    }
    if (!ensureWechatPayReady()) return;
    setBusy(product);
    setError("");
    setNotice("");
    setSuccess("");
    setActiveOrder(null);
    setPendingOrderNo(null);
    try {
      const order = await withAuthRetry(
        () => apiCreatePayOrder(withWechatPayInput({ product })),
        refresh,
      );
      await afterPayOrderCreated(order);
      if (order.mock) {
        setPendingOrderNo(order.order_no);
        setSuccess("订单已创建，请点「模拟支付成功」完成测试");
      } else {
        setActiveOrder(order);
        setSuccess(
          product === "lifetime"
            ? isWechatBrowser()
              ? "请在微信内完成永久会员支付"
              : "请扫码完成永久会员支付"
            : isWechatBrowser()
              ? "请在微信内完成支付"
              : "请扫码完成支付",
        );
      }
    } catch (e) {
      setError(formatApiErrorMessage(e, "创建订单失败"));
    } finally {
      setBusy("");
    }
  };

  const handleOrderPaid = async () => {
    setActiveOrder(null);
    setPendingOrderNo(null);
    try {
      const s = await withAuthRetry(() => apiMembershipStatus(), refresh);
      setStatus(s);
      await refresh();
      setSuccess(
        s.unlimited
          ? "支付成功，你已开通永久会员"
          : `支付成功，还可解读 ${s.remaining ?? 0} 次`,
      );
    } catch (e) {
      setError(formatApiErrorMessage(e, "支付结果同步失败"));
    }
  };

  const handleMockPay = async () => {
    if (!pendingOrderNo) return;
    if (offline) return;
    setBusy("mock");
    setError("");
    setNotice("");
    try {
      const res = await withAuthRetry(() => apiMockCompletePay(pendingOrderNo), refresh);
      setStatus(res.status);
      setPendingOrderNo(null);
      setSuccess(
        res.status.unlimited
          ? "支付成功，你已开通永久会员"
          : `支付成功，还可解读 ${res.status.remaining ?? 0} 次`,
      );
      await refresh();
    } catch (e) {
      setError(formatApiErrorMessage(e, "支付确认失败"));
    } finally {
      setBusy("");
    }
  };

  const priceYuan = status ? (status.singlePayPriceCents / 100).toFixed(2) : "1.00";
  const lifetimeYuan = status
    ? (status.lifetimeMembershipPriceCents / 100).toFixed(2)
    : "9.90";
  const guest = isGuestUser(user);
  const showUpgradeActions = !offline && !status?.unlimited;

  return (
    <PageShell>
      <div className="px-6 py-7 sm:px-8">
        <Link
          to="/profile"
          className="mb-5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> 返回我的
        </Link>

        <header className="mb-5">
          <h1 className="font-serif-cjk text-xl font-medium text-foreground">会员与额度</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            游客先享 {OFFLINE_GUEST_FREE_LIMIT} 次免费解读；用完可 ¥1/次购买，或 ¥9.9 开通永久会员。
          </p>
        </header>

        {notice && <p className={`mb-4 ${SOFT_NOTICE_CLASS}`}>{notice}</p>}
        {error && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
            {success}
          </p>
        )}

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">加载中…</p>
        ) : (
          <>
            <MembershipStatusCard status={status} guest={guest} offline={offline} />

            {!offline && !status?.unlimited ? (
              <MembershipRedeemCard
                className="mt-4"
                onRedeemed={(s) => {
                  setStatus(s);
                  setSuccess(
                    s.unlimited
                      ? "兑换成功，你已开通永久会员"
                      : `兑换成功，当前还可解读 ${s.remaining ?? 0} 次`,
                  );
                }}
              />
            ) : null}

            {offline && (
              <GuestUpgradeForm
                compact
                className="mt-4"
                returnTo="/profile/membership"
                onSuccess={() => refresh()}
              />
            )}

            {showUpgradeActions && (
              <section className="mt-6 space-y-3" aria-labelledby="membership-actions">
                <h2 id="membership-actions" className="text-xs font-medium tracking-[0.14em] text-muted-foreground">
                  继续问卜
                </h2>

                <div className="rounded-xl border border-[var(--gold)]/35 bg-[var(--bagua-active-bg)]/40 p-4">
                  <div className="flex items-start gap-2">
                    <Crown size={17} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden />
                    <div>
                      <h3 className="text-sm font-medium text-foreground">永久会员 · ¥{lifetimeYuan}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {status?.wechatPayEnabled
                          ? isWechatBrowser()
                            ? "微信内一键支付，开通后无限次解读。"
                            : "微信扫码支付，开通后无限次解读。"
                          : "微信支付配置中；当前可用模拟支付测试。"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy === "lifetime"}
                    onClick={() => void handlePay("lifetime")}
                    className="btn-gold mt-3 w-full py-2.5 text-sm disabled:opacity-50"
                  >
                    {busy === "lifetime" ? "创建订单…" : "开通永久会员"}
                  </button>
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="flex items-start gap-2">
                    <Wallet size={17} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <h3 className="text-sm font-medium text-foreground">单次解读 · ¥{priceYuan}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {status?.wechatPayEnabled
                          ? "购买 1 次解读额度，用完再买或升级永久会员。"
                          : "微信支付配置中；当前可用模拟支付测试流程。"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === "credit"}
                      onClick={() => void handlePay("credit")}
                      className="rounded-md border border-border bg-secondary/60 px-4 py-2 text-sm text-foreground disabled:opacity-50"
                    >
                      {busy === "credit" ? "创建订单…" : status?.wechatPayEnabled ? "微信支付" : "创建订单"}
                    </button>
                    {pendingOrderNo && (
                      <button
                        type="button"
                        disabled={busy === "mock"}
                        onClick={handleMockPay}
                        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
                      >
                        {busy === "mock" ? "确认中…" : "模拟支付成功"}
                      </button>
                    )}
                  </div>
                </div>

                {activeOrder ? (
                  <WechatPayPanel
                    order={activeOrder}
                    title={activeOrder.product === "lifetime" ? "开通永久会员" : "购买解读次数"}
                    onPaid={() => handleOrderPaid()}
                    onCancel={() => setActiveOrder(null)}
                  />
                ) : null}

                <InviteFriendsCard unlimited={false} />
              </section>
            )}

            {!offline && status?.unlimited && (
              <InviteFriendsCard className="mt-6" unlimited />
            )}

            <section className="mt-8" aria-labelledby="membership-perks">
              <h2 id="membership-perks" className="text-xs font-medium tracking-[0.14em] text-muted-foreground">
                {status?.unlimited ? "你已享有的权益" : "开通永久会员后可享"}
              </h2>
              <ul className="mt-3 space-y-2">
                {PERKS.map((p) => {
                  const unlocked = status?.unlimited || !p.memberOnly;
                  return (
                    <li
                      key={p.label}
                      className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm ${
                        unlocked
                          ? "border-[var(--gold)]/25 bg-[var(--bagua-active-bg)]/40 text-foreground"
                          : "border-border/80 bg-secondary/25 text-muted-foreground"
                      }`}
                    >
                      <Sparkles
                        size={13}
                        className={unlocked ? "text-[var(--gold)]" : "text-muted-foreground/50"}
                        aria-hidden
                      />
                      <span className="flex-1">{p.label}</span>
                      <span
                        className={`shrink-0 text-[10px] ${
                          unlocked ? "text-[var(--gold)]" : "text-muted-foreground"
                        }`}
                      >
                        {unlocked ? "已开通" : "会员专享"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <GuardedDivineLink
            returnPath="/profile/membership"
            className="flex-1 rounded-md bg-foreground py-2.5 text-center text-sm font-medium text-background hover:opacity-90"
          >
            {status?.canInterpret === false ? "额度已用完" : "去起一卦"}
          </GuardedDivineLink>
          <Link
            to="/history"
            className="flex-1 rounded-lg border border-border py-2.5 text-center text-sm text-muted-foreground hover:bg-secondary"
          >
            查看卦档
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
