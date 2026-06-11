import { useEffect, useRef, useState } from "react";
import type { PayOrder } from "@/lib/api";
import { invokeWechatJsapiPay, pollPayOrderUntilPaid, qrCodeImageUrl } from "@/lib/wechat-pay";
import { isWechatBrowser } from "@/lib/wechat-env";

type Props = {
  order: PayOrder;
  onPaid: () => void | Promise<void>;
  onCancel?: () => void;
  title?: string;
};

export function WechatPayPanel({ order, onPaid, onCancel, title = "微信支付" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paidRef = useRef(false);

  const markPaid = async () => {
    if (paidRef.current) return;
    paidRef.current = true;
    await onPaid();
  };

  useEffect(() => {
    if (order.mock || order.channel !== "jsapi" || !order.jsapi) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError("");
      try {
        await invokeWechatJsapiPay(order.jsapi!);
        await pollPayOrderUntilPaid(order.order_no);
        if (!cancelled) await markPaid();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "支付失败");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [order, onPaid]);

  useEffect(() => {
    if (order.mock || order.channel === "jsapi" || !order.code_url) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        await pollPayOrderUntilPaid(order.order_no, { maxAttempts: 1 });
        if (!cancelled) await markPaid();
      } catch {
        /* 继续轮询 */
      }
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [order, onPaid]);

  if (order.mock) return null;

  if (order.channel === "jsapi") {
    return (
      <div className="mt-3 rounded-lg border border-border bg-background/80 px-4 py-3 text-center">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {busy ? "正在调起微信支付…" : error || "若未自动弹出，请点右上角在浏览器中打开重试"}
        </p>
        {error ? (
          <button type="button" className="mt-2 text-xs text-[var(--gold)] underline" onClick={onCancel}>
            关闭
          </button>
        ) : null}
      </div>
    );
  }

  if (!order.code_url) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/80 px-4 py-4 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isWechatBrowser()
          ? "请使用另一台设备扫码，或点右上角「在浏览器打开」"
          : "请用微信扫一扫完成支付"}
      </p>
      <img
        src={qrCodeImageUrl(order.code_url)}
        alt="微信支付二维码"
        className="mx-auto mt-3 h-[240px] w-[240px] rounded-md border border-border bg-white p-2"
      />
      <p className="mt-2 text-sm tabular-nums text-foreground">¥{order.priceYuan ?? (order.amount_cents / 100).toFixed(2)}</p>
      {onCancel ? (
        <button type="button" className="mt-3 text-xs text-muted-foreground underline" onClick={onCancel}>
          取消
        </button>
      ) : null}
    </div>
  );
}
