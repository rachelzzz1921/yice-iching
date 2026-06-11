import { ApiError } from "@/lib/api";
import type { RedemptionCodeStatus } from "@/lib/admin-api";

export function redemptionStatusClass(status: RedemptionCodeStatus): string {
  if (status === "active") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (status === "disabled") return "border-border bg-secondary/60 text-muted-foreground";
  return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
}

export function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDay(day: string) {
  try {
    return new Date(day).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  } catch {
    return day;
  }
}

export function formatAdminError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 0) return "无法连接服务器，请检查网络或确认后端已启动";
    if (err.status === 401 || err.status === 403) return "登录已过期，请重新输入密码";
    if (err.status === 503) return "服务未就绪，请检查后端配置";
    if (err.status === 404) {
      return (
        err.message && err.message !== "Not Found"
          ? err.message
          : "接口未找到：请重启后端（cd backend && npm run dev），刷新本页后再试"
      );
    }
    return `请求失败（${err.status}）`;
  }
  if (err instanceof Error && err.message) return err.message;
  return "加载失败，请稍后重试";
}

export function isAdminAuthError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}
