const OPENID_KEY = "iching:wechatOpenid";

/** 是否在微信内置浏览器 */
export function isWechatBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

export function getWechatOpenid(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(OPENID_KEY);
}

export function setWechatOpenid(openid: string | null) {
  if (typeof window === "undefined") return;
  if (openid) window.localStorage.setItem(OPENID_KEY, openid);
  else window.localStorage.removeItem(OPENID_KEY);
}

/** 从 OAuth 回跳 URL 吸收 openid */
export function absorbWechatOpenidFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const u = new URL(window.location.href);
  const openid = u.searchParams.get("wechat_openid");
  if (!openid) return false;
  setWechatOpenid(openid);
  u.searchParams.delete("wechat_openid");
  u.searchParams.delete("wechat_oauth");
  window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  return true;
}

export function resolvePayChannel(): "jsapi" | "native" {
  return isWechatBrowser() ? "jsapi" : "native";
}

/** 微信内且无 openid 时跳转 OAuth */
export function redirectWechatOAuthIfNeeded(returnUrl?: string) {
  if (!isWechatBrowser() || getWechatOpenid()) return false;
  const ret = returnUrl || window.location.pathname + window.location.search;
  const url = `/api/wechat/oauth/authorize?returnUrl=${encodeURIComponent(ret)}`;
  window.location.assign(url);
  return true;
}
