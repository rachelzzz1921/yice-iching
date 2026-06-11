import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth, isOfflineGuest } from "@/lib/auth";
import { isGuestUser } from "@/lib/api";
import { formatApiErrorMessage, isRecoverableApiFailure } from "@/lib/api-errors";

type Props = {
  onSuccess?: () => void;
  className?: string;
  compact?: boolean;
  initialEmail?: string;
  initialPassword?: string;
  initialNickname?: string;
  hint?: string;
  returnTo?: string;
};

export function GuestUpgradeForm({
  onSuccess,
  className = "",
  compact = false,
  initialEmail = "",
  initialPassword = "",
  initialNickname = "",
  hint,
  returnTo = "/profile",
}: Props) {
  const { upgradeAccount, register, loginAsGuest, user } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const offline = isOfflineGuest(user);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);
  useEffect(() => {
    if (initialPassword) setPassword(initialPassword);
  }, [initialPassword]);
  useEffect(() => {
    if (initialNickname) setNickname(initialNickname);
  }, [initialNickname]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      if (offline) {
        await register(email.trim(), password, nickname.trim() || undefined);
      } else {
        if (!user) await loginAsGuest();
        await upgradeAccount(email.trim(), password, nickname.trim() || undefined);
      }
      setDone(true);
      onSuccess?.();
    } catch (err) {
      if (isRecoverableApiFailure(err)) {
        setError(
          offline
            ? "无法连接服务器，请检查网络后重试注册"
            : "无法连接服务器，请检查网络后重试绑定",
        );
      } else {
        setError(formatApiErrorMessage(err, "保存失败，请重试"));
      }
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <div className={`rounded-lg border border-[var(--gold)]/30 bg-[var(--bagua-active-bg)] p-4 text-center ${className}`}>
        <p className="text-sm font-medium text-foreground">已绑定邮箱，卦象已云端保存</p>
        <p className="mt-1 text-xs text-muted-foreground">换设备用同一邮箱登录即可继续查看。</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-[var(--gold)]/30 bg-[var(--bagua-active-bg)]/60 p-4 ${className}`}>
      {hint && (
        <div
          className="mb-3 rounded-md border border-[var(--gold)]/45 bg-background/60 px-3 py-2 text-xs leading-relaxed text-foreground"
          role="status"
        >
          {hint}
        </div>
      )}
      {!compact && (
        <>
          <p className="font-serif-cjk text-sm font-medium text-foreground">
            {offline ? "注册正式账号" : "绑定邮箱"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {offline
              ? "填写邮箱与密码即可完成注册，本机已有卦象会一并上传保存。"
              : "绑定后历史卦象完整保留，可在任意设备登录。"}
          </p>
        </>
      )}
      {compact && (
        <p className="mb-3 text-xs text-muted-foreground">
          {offline ? "注册后云端保存全部卦象" : "绑定邮箱，保留全部卦象历史"}
        </p>
      )}
      <form onSubmit={submit} className={`flex flex-col gap-3 ${compact ? "" : "mt-4"}`}>
        <div>
          <label htmlFor="upgrade-email" className="mb-1 block text-[11px] text-muted-foreground">
            邮箱
          </label>
          <input
            id="upgrade-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="upgrade-password" className="mb-1 block text-[11px] text-muted-foreground">
            设置密码（至少 6 位）
          </label>
          <input
            id="upgrade-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="upgrade-nickname" className="mb-1 block text-[11px] text-muted-foreground">
            昵称（可选）
          </label>
          <input
            id="upgrade-nickname"
            name="nickname"
            autoComplete="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="input-field w-full py-2 text-sm"
          />
        </div>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-gold w-full py-2.5 text-sm">
          {pending ? "保存中…" : offline ? "注册并保存卦象" : "绑定邮箱并保存"}
        </button>
        {user && isGuestUser(user) && !offline ? (
          <Link
            to="/login"
            search={{ signin: true, return: returnTo }}
            className="text-center text-xs text-muted-foreground hover:text-foreground"
          >
            已有账号？去登录
          </Link>
        ) : null}
      </form>
    </div>
  );
}
