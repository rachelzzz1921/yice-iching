import { useEffect } from "react";
import { absorbWechatOpenidFromUrl } from "@/lib/wechat-env";
import { apiBindWechatOpenid } from "@/lib/api";
import { getWechatOpenid } from "@/lib/wechat-env";
import { useAuth } from "@/lib/auth";

/** 吸收 OAuth 回跳的 openid，并可选绑定到登录用户 */
export function WechatOAuthBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    absorbWechatOpenidFromUrl();
  }, []);

  useEffect(() => {
    const openid = getWechatOpenid();
    if (!user || !openid) return;
    void apiBindWechatOpenid(openid).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
