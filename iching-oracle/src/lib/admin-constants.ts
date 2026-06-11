import { CATEGORIES } from "@/lib/iching";

export const ADMIN_TABS = [
  { id: "overview", label: "概览" },
  { id: "users", label: "用户" },
  { id: "divinations", label: "起卦" },
  { id: "codes", label: "兑换码" },
  { id: "payments", label: "订单" },
  { id: "system", label: "系统" },
] as const;

export type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

/** 各 Tab 运营说明（实用向，非装饰文案） */
export const ADMIN_TAB_META: Record<AdminTabId, { title: string; hint: string }> = {
  overview: { title: "数据概览", hint: "用户、起卦量与问事分类分布" },
  users: { title: "用户管理", hint: "搜索邮箱/昵称，改套餐与额外次数" },
  divinations: { title: "起卦记录", hint: "按用户/分类筛选，可查看解读与追问" },
  codes: { title: "兑换码", hint: "表格管理发放记录，支持筛选与导出" },
  payments: { title: "付费订单", hint: "按状态与订单号/用户检索" },
  system: { title: "系统状态", hint: "数据库、AI、支付与结构同步" },
};

export const REDEMPTION_KINDS = [
  { id: "lifetime", label: "永久会员", hint: "无限解读 · 游客自动升级" },
  { id: "member", label: "会员", hint: "同永久权益（plan=member）" },
  { id: "credits", label: "额外次数", hint: "增加 N 次解读额度，不升级身份" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);

export const USER_PLANS = ["free", "member", "premium", "lifetime"] as const;

export const PLAN_LABELS: Record<string, string> = {
  free: "免费",
  member: "会员",
  premium: "高级",
  lifetime: "永久会员",
  guest: "游客",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "待支付",
  paid: "已支付",
  expired: "已过期",
  cancelled: "已取消",
};
