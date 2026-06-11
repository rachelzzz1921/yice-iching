import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthEntryChoice } from "@/components/AuthEntryChoice";
import { GuardedDivineLink } from "@/components/home/DivineEntryLink";
import { LoginSaveCallout } from "@/components/LoginSaveCallout";
import { PageShell } from "@/components/SiteNav";
import { useAuth } from "@/lib/auth";
import { ApiError, getToken, isGuestUser } from "@/lib/api";
import { GuestUpgradeForm } from "@/components/GuestUpgradeForm";
import { clearRegisterDraft, loadRegisterDraft } from "@/lib/register-draft";
import { getPendingReferralCode } from "@/lib/referral-pending";
import { confirmAuthEntry, hasAuthEntryConfirmed, isSameReturnLocation } from "@/lib/auth-entry";

export type LoginMode = "choose" | "account" | "guest";

function safeReturnHref(raw: string): string {
  const decoded = decodeURIComponent(raw || "/divine");
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/divine";
  return decoded;
}

function parseLoginMode(raw: unknown, opts: { signin?: boolean; register?: boolean; upgrade?: boolean }): LoginMode {
  if (opts.signin || opts.register || opts.upgrade) return "account";
  if (raw === "account" || raw === "guest" || raw === "choose") return raw;
  return "choose";
}

function RedirectAfterAuth({ href }: { href: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (isSameReturnLocation(href)) return;
    void navigate({ href, replace: true }).catch(() => {
      window.location.assign(href);
    });
  }, [href, navigate]);
  return (
    <PageShell>
      <div className="p-10 text-center text-sm text-muted-foreground">正在进入…</div>
    </PageShell>
  );
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => {
    const upgrade = s.upgrade === true || s.upgrade === "true" || s.upgrade === "1";
    const register = s.register === true || s.register === "true" || s.register === "1";
    const signin = s.signin === true || s.signin === "true" || s.signin === "1";
    return {
      return: typeof s.return === "string" ? s.return : "/divine",
      ...(upgrade ? { upgrade: true as const } : {}),
      ...(register ? { register: true as const } : {}),
      ...(signin ? { signin: true as const } : {}),
      mode: parseLoginMode(s.mode, { signin, register, upgrade }),
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const {
    return: returnUrl,
    upgrade,
    register: registerSearch,
    signin: signinSearch,
    mode: modeSearch,
  } = Route.useSearch();
  const navigate = useNavigate();
  const { login, register, loginAsGuest, user, loading } = useAuth();

  const [view, setView] = useState<"choose" | "account">(
    modeSearch === "account" ? "account" : "choose",
  );
  const [mode, setMode] = useState<"login" | "register">(
    signinSearch ? "login" : "register",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [guestError, setGuestError] = useState("");
  const [guestNotice, setGuestNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [guestPending, setGuestPending] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [upgradeHint, setUpgradeHint] = useState("");
  const [registerHint, setRegisterHint] = useState("");

  useEffect(() => {
    if (modeSearch === "account") setView("account");
    if (modeSearch === "choose") setView("choose");
  }, [modeSearch]);

  useEffect(() => {
    if (!registerSearch) return;
    const draft = loadRegisterDraft();
    if (!draft) return;
    setView("account");
    setMode("register");
    if (draft.email) setEmail(draft.email);
    if (draft.password) setPassword(draft.password);
    if (draft.nickname) setNickname(draft.nickname);
    if (draft.hint) setRegisterHint(draft.hint);
    clearRegisterDraft();
  }, [registerSearch]);

  const returnHref = safeReturnHref(returnUrl);
  const shouldShowUpgrade = upgrade || showUpgradePanel;
  const invitedByFriend = !!getPendingReferralCode();

  const goAfterAuth = async () => {
    if (isSameReturnLocation(returnHref)) return;
    try {
      await navigate({ href: returnHref, replace: true });
    } catch {
      window.location.assign(returnHref);
    }
  };

  useEffect(() => {
    if (loading || modeSearch !== "guest") return;
    if (user && hasAuthEntryConfirmed()) return;
    let cancelled = false;
    (async () => {
      setGuestPending(true);
      try {
        if (!user) await loginAsGuest();
        else confirmAuthEntry();
        if (!cancelled) await goAfterAuth();
      } catch {
        if (!cancelled) setGuestError("游客进入失败，请重试或改用账号登录");
      } finally {
        if (!cancelled) setGuestPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, modeSearch, loginAsGuest, returnHref]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && getToken()) {
    return (
      <PageShell>
        <div className="p-10 text-center text-sm text-muted-foreground">正在恢复登录状态…</div>
      </PageShell>
    );
  }

  if (!loading && user && !isGuestUser(user)) {
    return <RedirectAfterAuth href={returnHref} />;
  }

  if (
    !loading &&
    user &&
    isGuestUser(user) &&
    !shouldShowUpgrade &&
    !registerSearch &&
    !signinSearch
  ) {
    return <RedirectAfterAuth href={returnHref} />;
  }

  if (!loading && modeSearch === "guest" && !user) {
    return (
      <PageShell>
        <div className="p-10 text-center text-sm text-muted-foreground">
          {guestPending ? "正在进入游客模式…" : "准备进入…"}
          {guestError ? (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {guestError}
            </p>
          ) : null}
        </div>
      </PageShell>
    );
  }

  if (!loading && user && isGuestUser(user) && shouldShowUpgrade && !registerSearch) {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm px-6 py-10 sm:px-8">
          <LoginSaveCallout className="mb-6" />
          <h1 className="font-serif-cjk text-xl font-medium text-foreground">注册并保留卦象</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            你当前是游客，绑定邮箱后本机卦象会同步到云端。
          </p>
          <GuestUpgradeForm
            className="mt-6"
            initialEmail={email}
            initialPassword={password}
            initialNickname={nickname}
            hint={upgradeHint}
            onSuccess={() => {
              void goAfterAuth();
            }}
          />
          <div className="mt-6 flex flex-col gap-2">
            <GuardedDivineLink returnPath={returnHref} className="btn-gold w-full py-2.5 text-center text-sm">
              稍后再说，继续问卜
            </GuardedDivineLink>
            <Link
              to="/"
              className="w-full rounded-lg border border-border bg-secondary/40 py-2.5 text-center text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              返回首页
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGuestNotice("");
    setPending(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === "login") {
        await login(normalizedEmail, password);
      } else {
        await register(normalizedEmail, password, nickname.trim() || undefined);
      }
      await goAfterAuth();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "操作失败，请重试";
      if (mode === "login" && message.includes("用户不存在")) {
        setMode("register");
        setRegisterHint(
          "该邮箱在服务器上尚未注册（若在 localhost 开发环境注册过，需在此重新注册一次）。请填写下方信息完成注册，本机卦象会一并保存。",
        );
        setError("");
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  };

  if (view === "choose") {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm px-6 py-10 sm:px-8">
          <AuthEntryChoice returnHref={returnHref} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-sm px-6 py-10 sm:px-8">
        <button
          type="button"
          onClick={() => setView("choose")}
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden />
          换一种进入方式
        </button>

        <LoginSaveCallout className="mb-6" />

        <h1 className="font-serif-cjk text-xl font-medium text-foreground">
          {mode === "register" ? "注册并保存卦象" : "登录"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {invitedByFriend && mode === "register"
            ? "好友邀请你加入。注册后卦象云端保存，对方将获得额外解读机会。"
            : mode === "register"
              ? "推荐新用户注册：一次绑定，起卦记录长期保存、换机可查。"
              : "使用已注册邮箱登录，继续你的问卜记录。"}
        </p>

        {registerHint && (
          <div className="mt-4 flex flex-col items-center" role="status">
            <div className="w-full rounded-md border border-[var(--gold)]/45 bg-[var(--bagua-active-bg)]/60 px-3 py-2 text-xs leading-relaxed text-foreground">
              {registerHint}
            </div>
            <ArrowDown size={16} className="mt-1.5 text-[var(--gold)]" aria-hidden />
          </div>
        )}

        <div className="mt-5 flex rounded-lg border border-border bg-secondary/30 p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`flex-1 rounded-md py-2 transition ${
              mode === "register"
                ? "bg-background font-medium text-foreground"
                : "text-muted-foreground"
            }`}
          >
            注册（推荐）
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 rounded-md py-2 transition ${
              mode === "login"
                ? "bg-background font-medium text-foreground"
                : "text-muted-foreground"
            }`}
          >
            登录
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          {mode === "register" && (
            <div>
              <label htmlFor="nickname" className="mb-1 block text-xs text-muted-foreground">
                昵称（可选）
              </label>
              <input
                id="nickname"
                name="nickname"
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input-field w-full"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-muted-foreground">
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs text-muted-foreground">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={pending || guestPending} className="btn-gold w-full py-2.5 text-sm">
            {pending ? "请稍候…" : mode === "login" ? "登录并继续" : "注册并保存"}
          </button>
        </form>

        {guestNotice && (
          <p className="mt-3 text-center text-xs text-[var(--gold)]" role="status">
            {guestNotice}
          </p>
        )}

        {user && isGuestUser(user) && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            已是游客？
            <Link
              to="/login"
              search={{ upgrade: true, return: returnHref }}
              className="ml-1 text-[var(--gold)] hover:underline"
            >
              注册绑定邮箱
            </Link>
          </p>
        )}

        <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">
          返回首页
        </Link>
      </div>
    </PageShell>
  );
}
