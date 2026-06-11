import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Compass,
  Crown,
  Home,
  ScrollText,
  User,
} from "lucide-react";

export type SiteMenuItemConfig = {
  id: string;
  to: string;
  label: string;
  /** 收起态菜单按钮短名 */
  shortLabel: string;
  icon: LucideIcon;
  /** 菜单内占满一行 */
  span?: 2;
};

/** 站点菜单：紧凑平铺，账号区在 SiteUtilityNav 动态注入 */
export const SITE_MENU_ITEMS: SiteMenuItemConfig[] = [
  { id: "home", to: "/", label: "首页", shortLabel: "首页", icon: Home },
  { id: "explore", to: "/explore", label: "沿路一览", shortLabel: "一览", icon: Compass },
  { id: "history", to: "/history", label: "历史卦象", shortLabel: "历史", icon: ScrollText },
  { id: "learn", to: "/learn", label: "十问入门", shortLabel: "十问", icon: BookOpen },
  { id: "membership", to: "/profile/membership", label: "会员兑换", shortLabel: "兑换", icon: Crown },
  { id: "profile", to: "/profile", label: "我的", shortLabel: "我的", icon: User },
];

export function siteNavActive(path: string, to: string) {
  if (to === "/") return path === "/";
  if (to === "/explore") return path === "/explore";
  if (to === "/divine") return path === "/divine";
  return path === to || path.startsWith(`${to}/`);
}

export function siteMenuItemByPath(path: string): SiteMenuItemConfig | undefined {
  const hit = SITE_MENU_ITEMS.find((item) => siteNavActive(path, item.to));
  if (hit) return hit;
  if (path === "/login") {
    return { id: "login", to: "/login", label: "登录", shortLabel: "登录", icon: User };
  }
  return undefined;
}

export function siteMenuTriggerLabel(path: string) {
  const item = siteMenuItemByPath(path);
  if (item) return `菜单 · ${item.shortLabel}`;
  return "菜单";
}
