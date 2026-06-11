import { Check, Copy, Loader2, RefreshCw, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { apiReferralStatus, isOfflineGuestToken, type ReferralStatus } from "@/lib/api";
import {
  formatApiErrorMessage,
  isRecoverableApiFailure,
  SOFT_NOTICE_CLASS,
  withAuthRetry,
} from "@/lib/api-errors";
import { useAuth } from "@/lib/auth";
import { buildInviteUrl } from "@/lib/referral-pending";

type Props = {
  className?: string;
  /** 永久会员等无限额度时仍展示分享，但文案略不同 */
  unlimited?: boolean;
};

export function InviteFriendsCard({ className = "", unlimited = false }: Props) {
  const { refresh } = useAuth();
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    if (isOfflineGuestToken()) {
      setStatus(null);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const r = await withAuthRetry(() => apiReferralStatus(), refresh);
      setStatus(r.status);
    } catch (e) {
      setStatus(null);
      if (isRecoverableApiFailure(e)) {
        setNotice(formatApiErrorMessage(e, "邀请信息暂无法加载"));
      } else {
        setError(formatApiErrorMessage(e, "加载邀请信息失败"));
      }
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const copyLink = async () => {
    if (!status?.code) return;
    const url = buildInviteUrl(status.code);
    try {
      const { copyTextToClipboard } = await import("@/lib/clipboard");
      await copyTextToClipboard(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动长按复制链接");
    }
  };

  const per = status?.invitesPerReward ?? 2;
  const progress = status?.progressInCycle ?? 0;
  const until = status?.invitesUntilReward ?? per;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--bagua-active-bg)]/90 via-card/50 to-secondary/20 p-4 ${className}`}
    >
      <div className="flex items-start gap-2">
        <Users size={18} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-foreground">邀请好友</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {unlimited
              ? "分享链接给朋友，对方注册后即可一起问卜。"
              : `每邀请 ${per} 位好友完成注册，你可额外获得 ${status?.creditsPerReward ?? 1} 次免费解读（计入当前额度）。`}
          </p>
        </div>
      </div>

      {isOfflineGuestToken() ? (
        <p className="mt-4 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
          离线游客无法生成邀请链接。请先
          <Link to="/login" search={{ register: true }} className="mx-1 text-[var(--gold)] hover:underline">
            注册账号
          </Link>
          或连接网络后使用云端游客。
        </p>
      ) : notice ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className={SOFT_NOTICE_CLASS}>{notice}</p>
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary/60"
          >
            <RefreshCw size={12} aria-hidden />
            重试
          </button>
        </div>
      ) : loading ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> 加载邀请进度…
        </p>
      ) : error ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-xs text-destructive">{error}</p>
          {!isOfflineGuestToken() && (
            <button
              type="button"
              onClick={() => void loadStatus()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary/60"
            >
              <RefreshCw size={12} aria-hidden />
              重试
            </button>
          )}
        </div>
      ) : status ? (
        <>
          {!unlimited && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>本轮进度</span>
                <span className="font-medium text-foreground">
                  {progress} / {per} 人
                  {until > 0 && until < per ? ` · 还差 ${until} 人` : until === per && progress === 0 && status.totalInvites > 0 ? " · 可开启下一轮" : until === per ? ` · 再邀 ${per} 人得奖励` : ""}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: per }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i < progress ? "bg-[var(--gold)]" : "bg-border"
                    }`}
                  />
                ))}
              </div>
              {status.totalInvites > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  已累计邀请 {status.totalInvites} 人
                  {status.rewardsGranted > 0
                    ? ` · 已通过邀请获得 ${status.totalCreditsFromReferrals} 次额外解读`
                    : ""}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1 rounded-lg border border-border bg-background/70 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">你的邀请码</p>
              <p className="truncate font-mono text-sm tracking-wider text-foreground">{status.code}</p>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="btn-gold inline-flex shrink-0 items-center justify-center gap-1.5 px-4 py-2.5 text-sm"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "已复制链接" : "复制邀请链接"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
