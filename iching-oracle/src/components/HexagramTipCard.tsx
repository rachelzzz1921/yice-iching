import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { WechatPayPanel } from "@/components/WechatPayPanel";
import { apiCreateTipOrder, apiMockCompletePay, type PayOrder } from "@/lib/api";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { isOfflineGuest, useAuth } from "@/lib/auth";
import {
  afterPayOrderCreated,
  ensureWechatPayReady,
  withWechatTipInput,
} from "@/lib/wechat-pay-flow";
import {
  formatYuan,
  TIP_TIERS,
  tierForCustomYuan,
  yuanToCents,
  type TipTier,
} from "@/lib/tip-tiers";

type Props = {
  hexagramName: string;
  question?: string;
  className?: string;
};

export function HexagramTipCard({ hexagramName, question, className = "" }: Props) {
  const { user, refresh, guestMode } = useAuth();
  const offline = isOfflineGuest(user);
  const [busy, setBusy] = useState<string | null>(null);
  const [customYuan, setCustomYuan] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pendingOrderNo, setPendingOrderNo] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<PayOrder | null>(null);
  const [thanks, setThanks] = useState(false);

  const payTip = async (tier: TipTier) => {
    if (!user || offline) return;
    if (!ensureWechatPayReady()) return;
    setBusy(tier.id);
    setError("");
    setNotice("");
    setActiveOrder(null);
    setPendingOrderNo(null);
    try {
      const order = await apiCreateTipOrder(
        withWechatTipInput({
          amountCents: yuanToCents(tier.amountYuan),
          currencyLabel: tier.currencyLabel,
          hexagramName,
          question,
        }),
      );
      await afterPayOrderCreated(order);
      if (order.mock) {
        setPendingOrderNo(order.order_no);
        setNotice(`已备好${tier.currencyLabel}（¥${formatYuan(tier.amountYuan)}），点「完成打赏」即可。`);
      } else {
        setActiveOrder(order);
        setNotice(`请完成${tier.currencyLabel}支付（¥${formatYuan(tier.amountYuan)}）`);
      }
    } catch (e) {
      setError(formatApiErrorMessage(e, "创建打赏订单失败"));
    } finally {
      setBusy(null);
    }
  };

  const payCustom = async () => {
    if (!user || offline) return;
    if (!ensureWechatPayReady()) return;
    const yuan = Number.parseFloat(customYuan);
    if (!Number.isFinite(yuan) || yuan < 0.01) {
      setError("请输入有效金额（最低 0.01 元）");
      return;
    }
    const meta = tierForCustomYuan(yuan);
    setBusy("custom");
    setError("");
    setNotice("");
    setActiveOrder(null);
    setPendingOrderNo(null);
    try {
      const order = await apiCreateTipOrder(
        withWechatTipInput({
          amountCents: yuanToCents(yuan),
          currencyLabel: meta.currencyLabel,
          hexagramName,
          question,
        }),
      );
      await afterPayOrderCreated(order);
      if (order.mock) {
        setPendingOrderNo(order.order_no);
        setNotice(`已备好${meta.currencyLabel}（¥${formatYuan(yuan)}），点「完成打赏」即可。`);
      } else {
        setActiveOrder(order);
        setNotice(`请完成${meta.currencyLabel}支付（¥${formatYuan(yuan)}）`);
      }
    } catch (e) {
      setError(formatApiErrorMessage(e, "创建打赏订单失败"));
    } finally {
      setBusy(null);
    }
  };

  const completeMock = async () => {
    if (!pendingOrderNo) return;
    setBusy("mock");
    setError("");
    try {
      await apiMockCompletePay(pendingOrderNo);
      setPendingOrderNo(null);
      setNotice("");
      setThanks(true);
      await refresh();
    } catch (e) {
      setError(formatApiErrorMessage(e, "打赏确认失败"));
    } finally {
      setBusy(null);
    }
  };

  if (thanks) {
    return (
      <div
        className={`rounded-lg border border-[var(--gold)]/35 bg-[var(--bagua-active-bg)]/50 px-4 py-4 text-center ${className}`}
      >
        <p className="font-serif-cjk text-sm text-[var(--gold)]">谢君美意，卦象有应，心意已收。</p>
        <p className="mt-1 text-[11px] text-muted-foreground">愿此卦指引，助你前路更明。</p>
      </div>
    );
  }

  return (
    <section
      className={`rounded-lg border border-border/80 bg-secondary/25 px-4 py-4 ${className}`}
      aria-label="卦象打赏"
    >
      <div className="flex items-start gap-2">
        <Heart size={16} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">赏卦谢象</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            若此卦于你有用、解读于你有启，可择古币略表寸心——非买卦，是谢镜。
          </p>
        </div>
      </div>

      {!user || offline ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {offline
            ? "离线游客暂无法打赏；注册账号后可谢卦。"
            : "登录后可打赏。"}
          <Link to="/login" search={{ return: "/divine", mode: "account" }} className="ml-1 text-[var(--gold)] hover:underline">
            去登录
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TIP_TIERS.map((tier) => (
              <button
                key={tier.id}
                type="button"
                disabled={!!busy || !!pendingOrderNo}
                onClick={() => void payTip(tier)}
                className="group rounded-md border border-border bg-background/70 px-2.5 py-2.5 text-left transition hover:border-[var(--gold)]/45 hover:bg-[var(--bagua-active-bg)]/40 disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--gold)]/30 bg-[var(--bagua-active-bg)] font-serif-cjk text-sm text-[var(--gold)]">
                    {tier.currencyGlyph}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    ¥{formatYuan(tier.amountYuan)}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-foreground/90">{tier.currencyLabel}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{tier.hint}</p>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-md border border-dashed border-border/80 bg-background/40 px-3 py-2.5">
            <p className="text-[10px] tracking-wide text-muted-foreground">问大事 · 自定金额（上不封顶）</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">¥</span>
              <input
                type="number"
                inputMode="decimal"
                min={0.01}
                step={0.01}
                placeholder="如 28.88"
                value={customYuan}
                onChange={(e) => setCustomYuan(e.target.value)}
                className="input-field w-28 py-1.5 text-sm tabular-nums"
              />
              <button
                type="button"
                disabled={!!busy || !!pendingOrderNo || !customYuan.trim()}
                onClick={() => void payCustom()}
                className="rounded-md border border-[var(--gold)]/40 bg-[var(--bagua-active-bg)]/60 px-3 py-1.5 text-xs text-[var(--gold)] transition hover:bg-[var(--bagua-active-bg)] disabled:opacity-50"
              >
                {busy === "custom" ? "准备中…" : "随心打赏"}
              </button>
            </div>
            {customYuan && Number.parseFloat(customYuan) >= 0.01 ? (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                将记为「{tierForCustomYuan(Number.parseFloat(customYuan)).currencyLabel}」
              </p>
            ) : null}
          </div>

          {pendingOrderNo ? (
            <button
              type="button"
              disabled={busy === "mock"}
              onClick={() => void completeMock()}
              className="mt-3 w-full rounded-md bg-[var(--gold)]/90 py-2 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {busy === "mock" ? "确认中…" : "完成打赏（模拟支付）"}
            </button>
          ) : null}

          {activeOrder ? (
            <WechatPayPanel
              order={activeOrder}
              title="卦象打赏"
              onPaid={async () => {
                setActiveOrder(null);
                setThanks(true);
                await refresh();
              }}
              onCancel={() => setActiveOrder(null)}
            />
          ) : null}
        </>
      )}

      {notice ? (
        <p className="mt-2 text-[11px] text-[var(--gold)]" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[11px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {guestMode === "cloud" && user?.is_guest ? (
        <p className="mt-2 text-[10px] text-muted-foreground">游客账号打赏记录将随注册一并保留。</p>
      ) : null}
    </section>
  );
}
