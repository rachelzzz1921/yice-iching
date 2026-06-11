import { Loader2, Ticket } from "lucide-react";
import { useState } from "react";
import { formatApiErrorMessage, withAuthRetry } from "@/lib/api-errors";
import { useAuth } from "@/lib/auth";
import { apiRedeemCode, isOfflineGuestToken, type MembershipStatus } from "@/lib/api";

type Props = {
  className?: string;
  compact?: boolean;
  onRedeemed?: (status: MembershipStatus) => void;
};

export function MembershipRedeemCard({ className = "", compact = false, onRedeemed }: Props) {
  const { refresh } = useAuth();
  const offline = isOfflineGuestToken();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRedeem = async () => {
    if (!code.trim()) return;
    if (offline) {
      setError("请先注册或登录账号后再兑换");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await withAuthRetry(() => apiRedeemCode(code.trim()), refresh);
      setCode("");
      setSuccess(
        res.status.unlimited
          ? "兑换成功，已开通永久会员"
          : `兑换成功，当前还可解读 ${res.status.remaining ?? 0} 次`,
      );
      onRedeemed?.(res.status);
      await refresh();
    } catch (e) {
      setError(formatApiErrorMessage(e, "兑换失败"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="redeem"
      className={`overflow-hidden rounded-xl border border-[var(--gold)]/35 bg-[var(--bagua-active-bg)]/45 p-4 ${className}`}
      aria-labelledby="membership-redeem-title"
    >
      <div className="flex items-start gap-2">
        <Ticket size={17} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="membership-redeem-title" className="text-sm font-medium text-foreground">
            会员兑换码
          </h2>
          {!compact ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              输入内测或活动兑换码，可开通永久会员或增加解读次数。
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-2 text-xs text-[var(--success)]" role="status">
          {success}
        </p>
      ) : null}

      <div className={`flex gap-2 ${compact ? "mt-2" : "mt-3"}`}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="YICE-LIFE-2026"
          autoComplete="off"
          spellCheck={false}
          className="input-field flex-1 border-[var(--gold)]/20 bg-background/80 py-2.5 text-sm uppercase tracking-[0.12em] placeholder:tracking-normal"
        />
        <button
          type="button"
          disabled={busy || !code.trim()}
          onClick={() => void handleRedeem()}
          className="btn-gold shrink-0 px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : "兑换"}
        </button>
      </div>
    </section>
  );
}
