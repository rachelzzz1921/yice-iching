import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { isSameReturnLocation } from "@/lib/auth-entry";
import { LoginSaveCallout } from "@/components/LoginSaveCallout";

type Props = {
  returnHref: string;
  /** 仅展示选项，不显示顶部说明卡 */
  compact?: boolean;
  className?: string;
};

export function AuthEntryChoice({ returnHref, compact = false, className = "" }: Props) {
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [guestPending, setGuestPending] = useState(false);
  const [guestNotice, setGuestNotice] = useState("");
  const [guestError, setGuestError] = useState("");

  const goAfterEntry = async (mode: "cloud" | "offline") => {
    if (isSameReturnLocation(returnHref)) return;
    try {
      await navigate({ href: returnHref, replace: true });
    } catch {
      window.location.assign(returnHref);
    }
    if (mode === "offline") {
      setGuestNotice("已进入游客模式（本机保存）。联网后可注册同步到云端。");
    }
  };

  const enterAsGuest = async () => {
    setGuestError("");
    setGuestNotice("");
    setGuestPending(true);
    try {
      const mode = await loginAsGuest();
      if (isSameReturnLocation(returnHref)) {
        if (mode === "offline") {
          setGuestNotice("已进入游客模式（本机保存）。联网后可注册同步到云端。");
        }
        // 已在目标页（如 /divine）：强制刷新路由，让父级退出「选择进入方式」门控
        try {
          await navigate({ href: returnHref, replace: true });
        } catch {
          window.location.assign(returnHref);
        }
        return;
      }
      await goAfterEntry(mode);
    } catch (err) {
      const message = err instanceof Error ? err.message : "游客进入失败";
      setGuestError(message);
    } finally {
      setGuestPending(false);
    }
  };

  return (
    <div className={className}>
      {!compact ? <LoginSaveCallout className="mb-6" /> : null}

      <header className="text-center">
        <p className="font-ritual-cjk text-[10px] tracking-[0.45em] text-[var(--gold)]">入内之前</p>
        <h1 className="mt-2 font-serif-cjk text-xl font-medium text-foreground">选择进入方式</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          内测需先登录或游客试用，以便保存问卜记录与解读额度。
        </p>
      </header>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => void enterAsGuest()}
          disabled={guestPending}
          className="auth-entry-card auth-entry-card--guest text-left disabled:opacity-60"
        >
          <span className="auth-entry-card-icon" aria-hidden>
            <UserRound size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">游客试用</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              无需邮箱，立即起卦；记录保存在本浏览器（联网后可注册同步）。
            </span>
          </span>
          <span className="shrink-0 text-xs text-[var(--gold)]">
            {guestPending ? "进入中…" : "进入 →"}
          </span>
        </button>

        <Link
          to="/login"
          search={{ mode: "account", return: returnHref }}
          className="auth-entry-card auth-entry-card--account"
        >
          <span className="auth-entry-card-icon" aria-hidden>
            <LogIn size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">账号登录 / 注册</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              邮箱注册后云端保存卦象，可换机继续、兑换会员与付费加次。
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">下一步 →</span>
        </Link>
      </div>

      {guestNotice ? (
        <p className="mt-3 text-center text-xs text-[var(--gold)]" role="status">
          {guestNotice}
        </p>
      ) : null}
      {guestError ? (
        <p className="mt-2 text-center text-xs text-destructive" role="alert">
          {guestError}
        </p>
      ) : null}

      <Link
        to="/"
        className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground"
      >
        返回首页
      </Link>
    </div>
  );
}
