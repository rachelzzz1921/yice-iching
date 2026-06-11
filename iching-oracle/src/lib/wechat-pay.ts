import { apiSyncPayOrder } from "@/lib/api";
import type { JsapiPayParams, PayOrder } from "@/lib/api";

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (
        name: string,
        params: Record<string, string>,
        cb: (res: { err_msg?: string }) => void,
      ) => void;
    };
  }
}

function waitWeixinBridge(): Promise<void> {
  return new Promise((resolve) => {
    if (window.WeixinJSBridge) {
      resolve();
      return;
    }
    document.addEventListener("WeixinJSBridgeReady", () => resolve(), { once: true });
    setTimeout(resolve, 3000);
  });
}

export async function invokeWechatJsapiPay(params: JsapiPayParams): Promise<void> {
  await waitWeixinBridge();
  if (!window.WeixinJSBridge) {
    throw new Error("请在微信内打开以完成支付");
  }
  return new Promise((resolve, reject) => {
    window.WeixinJSBridge!.invoke(
      "getBrandWCPayRequest",
      {
        appId: params.appId,
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType,
        paySign: params.paySign,
      },
      (res) => {
        const msg = res.err_msg || "";
        if (msg === "get_brand_wcpay_request:ok") resolve();
        else if (msg === "get_brand_wcpay_request:cancel") reject(new Error("你已取消支付"));
        else reject(new Error(msg || "微信支付失败"));
      },
    );
  });
}

export async function pollPayOrderUntilPaid(
  orderNo: string,
  opts: { maxAttempts?: number; intervalMs?: number } = {},
): Promise<PayOrder> {
  const max = opts.maxAttempts ?? 40;
  const interval = opts.intervalMs ?? 2000;
  for (let i = 0; i < max; i++) {
    const { order } = await apiSyncPayOrder(orderNo);
    if (order.status === "paid") return order;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("支付结果确认超时，请稍后在会员页刷新查看");
}

export function qrCodeImageUrl(codeUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(codeUrl)}`;
}
