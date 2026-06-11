import {
  apiBindWechatOpenid,
  type PayCreateInput,
  type PayOrder,
  type TipOrderInput,
} from "@/lib/api";
import {
  getWechatOpenid,
  isWechatBrowser,
  redirectWechatOAuthIfNeeded,
  resolvePayChannel,
} from "@/lib/wechat-env";

export function buildWechatPayPayload(): Pick<PayCreateInput, "channel" | "openid"> {
  return {
    channel: resolvePayChannel(),
    openid: getWechatOpenid(),
  };
}

/** 微信内支付前确保有 openid；缺失则跳转授权并返回 false */
export function ensureWechatPayReady(): boolean {
  if (!isWechatBrowser()) return true;
  if (getWechatOpenid()) return true;
  redirectWechatOAuthIfNeeded();
  return false;
}

export async function afterPayOrderCreated(order: PayOrder) {
  const openid = getWechatOpenid();
  if (openid) {
    void apiBindWechatOpenid(openid).catch(() => {});
  }
  return order;
}

export function withWechatTipInput(
  input: Omit<TipOrderInput, "channel" | "openid">,
): TipOrderInput {
  return { ...input, ...buildWechatPayPayload() };
}

export function withWechatPayInput(
  input: Omit<PayCreateInput, "channel" | "openid"> = {},
): PayCreateInput {
  return { ...input, ...buildWechatPayPayload() };
}
