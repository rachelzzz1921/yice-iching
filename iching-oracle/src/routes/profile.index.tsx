import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  History,
  Sparkles,
  Crown,
  Compass,
  Pencil,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { PageShell } from "@/components/SiteNav";
import {
  formatJoined,
  METHOD_LABELS,
  loadProfile,
  profileStats,
  saveProfile,
  type CastMethod,
} from "@/lib/profile";
import {
  formatApiErrorMessage,
  isRecoverableApiFailure,
  SOFT_NOTICE_CLASS,
  withAuthRetry,
} from "@/lib/api-errors";
import { useAuth, useRequireAuth } from "@/lib/auth";
import {
  apiMembershipStatus,
  apiUpdatePreferences,
  apiUserProfile,
  ApiError,
  isGuestUser,
  isOfflineGuestToken,
} from "@/lib/api";
import { GuestUpgradeForm } from "@/components/GuestUpgradeForm";
import { GuardedDivineLink } from "@/components/home/DivineEntryLink";
import { MembershipRedeemCard } from "@/components/MembershipRedeemCard";
import { OFFLINE_GUEST_FREE_LIMIT, offlineGuestRemaining } from "@/lib/guest-quota";
import {
  followUpPersonaShortLabel,
  FOLLOWUP_PERSONA_META,
} from "@/components/FollowUpPersonaSwitch";
import {
  FOLLOWUP_PERSONA_ORDER,
  loadFollowUpPersona,
  saveFollowUpPersona,
  type FollowUpPersona,
} from "@/lib/follow-up-persona";
import { isSoundEnabled, setSoundEnabled } from "@/lib/ritual-sounds";

export const Route = createFileRoute("/profile/")({ component: ProfilePage });

const METHOD_OPTIONS: CastMethod[] = ["coin", "yarrow", "meihua", "direct"];

function ProfilePage() {
  const auth = useRequireAuth();
  const { refresh } = auth;
  const [stats, setStats] = useState({ total: 0, this_month: 0, saved: 0 });
  const [defaultMethod, setDefaultMethod] = useState<CastMethod>("coin");
  const [ritualGuide, setRitualGuide] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [pickingMethod, setPickingMethod] = useState(false);
  const [followUpPersona, setFollowUpPersona] = useState<FollowUpPersona>(() => loadFollowUpPersona());
  const [pickingPersona, setPickingPersona] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [guestRemaining, setGuestRemaining] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    if (isOfflineGuestToken()) {
      const localStats = profileStats();
      const p = loadProfile();
      setStats({ total: localStats.total, this_month: localStats.thisMonth, saved: localStats.saved });
      setDefaultMethod(p.defaultMethod);
      setRitualGuide(p.ritualGuide);
      setNameDraft(p.displayName || auth.user!.nickname);
      setGuestRemaining(offlineGuestRemaining());
      return;
    }
    const applyLocal = () => {
      const localStats = profileStats();
      const p = loadProfile();
      setStats({ total: localStats.total, this_month: localStats.thisMonth, saved: localStats.saved });
      setDefaultMethod(p.defaultMethod);
      setRitualGuide(p.ritualGuide);
      setNameDraft(p.displayName || auth.user!.nickname);
    };
    void withAuthRetry(() => apiUserProfile(), refresh)
      .then((p) => {
        setStats({
          total: p.stats?.total ?? 0,
          this_month: p.stats?.this_month ?? 0,
          saved: p.stats?.total ?? 0,
        });
        if (p.default_method && METHOD_OPTIONS.includes(p.default_method as CastMethod)) {
          setDefaultMethod(p.default_method as CastMethod);
        }
        if (p.ritual_guide !== undefined) setRitualGuide(p.ritual_guide);
        setNameDraft(p.nickname || auth.user!.nickname);
      })
      .catch((e) => {
        applyLocal();
        if (isRecoverableApiFailure(e)) {
          setNotice("云端暂不可用，已显示本机资料");
        }
      });
    if (isGuestUser(auth.user)) {
      apiMembershipStatus()
        .then((s) => {
          if (!s.unlimited && s.remaining != null) setGuestRemaining(s.remaining);
        })
        .catch(() => {});
    }
  }, [auth.loading, auth.user, refresh]);

  if (auth.loading || !auth.user) {
    return (
      <PageShell>
        <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
      </PageShell>
    );
  }

  const profile = auth.user;
  const guest = isGuestUser(profile);
  const offlineGuest = isOfflineGuestToken();
  const joinedAt = profile.created_at
    ? new Date(profile.created_at).getTime()
    : loadProfile().joinedAt;

  const commitName = async () => {
    const name = nameDraft.trim() || "易测访客";
    if (isOfflineGuestToken()) {
      saveProfile({ displayName: name });
      setEditingName(false);
      return;
    }
    setNotice("");
    try {
      await withAuthRetry(() => apiUpdatePreferences({ nickname: name }), auth.refresh);
      saveProfile({ displayName: name });
      await auth.refresh();
      setEditingName(false);
    } catch (e) {
      if (isRecoverableApiFailure(e)) {
        saveProfile({ displayName: name });
        setEditingName(false);
        setNotice("昵称已保存在本机，联网后将同步到云端");
        return;
      }
      setError(formatApiErrorMessage(e, "保存失败"));
    }
  };

  const patchPrefs = async (patch: { defaultMethod?: CastMethod; ritualGuide?: boolean }) => {
    if (isOfflineGuestToken()) {
      saveProfile({
        defaultMethod: patch.defaultMethod,
        ritualGuide: patch.ritualGuide,
      });
      if (patch.defaultMethod) setDefaultMethod(patch.defaultMethod);
      if (patch.ritualGuide !== undefined) setRitualGuide(patch.ritualGuide);
      return;
    }
    setNotice("");
    try {
      await withAuthRetry(
        () =>
          apiUpdatePreferences({
            defaultMethod: patch.defaultMethod,
            ritualGuide: patch.ritualGuide,
          }),
        auth.refresh,
      );
      saveProfile({
        defaultMethod: patch.defaultMethod,
        ritualGuide: patch.ritualGuide,
      });
      if (patch.defaultMethod) setDefaultMethod(patch.defaultMethod);
      if (patch.ritualGuide !== undefined) setRitualGuide(patch.ritualGuide);
    } catch (e) {
      if (isRecoverableApiFailure(e)) {
        saveProfile({
          defaultMethod: patch.defaultMethod,
          ritualGuide: patch.ritualGuide,
        });
        if (patch.defaultMethod) setDefaultMethod(patch.defaultMethod);
        if (patch.ritualGuide !== undefined) setRitualGuide(patch.ritualGuide);
        setNotice("偏好已保存在本机，联网后将同步");
        return;
      }
      setError(formatApiErrorMessage(e, "保存失败"));
    }
  };

  const initial = (profile.nickname || profile.email).slice(0, 1) || "易";
  const displayName = profile.nickname || profile.email.split("@")[0];

  return (
    <PageShell>
      <div className="profile-page px-5 py-6 sm:px-8 sm:py-8">
        <header className="mb-5">
          <BrandMark variant="compact" className="text-left" />
          <p className="mt-3 font-ritual-cjk text-[10px] tracking-[0.45em] text-[var(--gold)]">我的</p>
          <h1 className="mt-1 font-serif-cjk text-xl font-medium text-foreground">问事档案</h1>
        </header>

        {!offlineGuest ? (
          <MembershipRedeemCard className="mb-5" compact />
        ) : null}

        {/* 身份区 */}
        <section className="profile-hero relative overflow-hidden rounded-2xl border border-[var(--gold)]/25 bg-gradient-to-br from-[var(--bagua-active-bg)] via-card to-secondary/30 px-4 py-4 sm:px-5 sm:py-5">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--gold)]/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex gap-4">
            <div className="profile-avatar-ring flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card font-serif-cjk text-xl text-[var(--gold)] shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex flex-wrap gap-2">
                  <label htmlFor="display-name" className="sr-only">
                    昵称
                  </label>
                  <input
                    id="display-name"
                    name="displayName"
                    autoComplete="nickname"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="input-field min-w-0 flex-1 py-1.5 text-sm"
                  />
                  <button type="button" onClick={commitName} className="btn-gold px-3 py-1.5 text-xs">
                    保存
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(profile.nickname || profile.email);
                    setEditingName(true);
                  }}
                  className="group flex items-center gap-1.5 text-left"
                >
                  <span className="font-serif-cjk text-lg font-medium text-foreground">{displayName}</span>
                  <Pencil
                    size={12}
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100"
                    aria-hidden
                  />
                </button>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] tracking-wide ${
                    guest
                      ? "border border-[var(--gold)]/35 bg-[var(--gold)]/10 text-[var(--gold)]"
                      : "border border-border bg-secondary/60 text-muted-foreground"
                  }`}
                >
                  {guest ? (offlineGuest ? "离线游客" : "游客") : "正式会员"}
                </span>
                <span className="text-[11px] text-muted-foreground">加入于 {formatJoined(joinedAt)}</span>
              </div>
              {guest && guestRemaining !== null && (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  剩余 <span className="font-medium text-foreground">{guestRemaining}</span> 次解读额度
                  {offlineGuest ? ` · 本机免费 ${OFFLINE_GUEST_FREE_LIMIT} 次` : ""}
                </p>
              )}
              {notice && <p className={`mt-2 ${SOFT_NOTICE_CLASS}`}>{notice}</p>}
              {error && (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>

          {guest && (
            <div className="relative mt-4">
              {offlineGuest && (
                <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground/90">
                  卦象暂存本设备 · 绑定邮箱后可跨设备同步
                </p>
              )}
              <GuestUpgradeForm
                compact
                className="profile-upgrade-card !border-[var(--gold)]/20 !bg-card/80 !p-3.5 backdrop-blur-sm"
                returnTo="/profile"
                onSuccess={() => auth.refresh()}
              />
            </div>
          )}
        </section>

        {/* 数据概览 */}
        <section className="mt-5" aria-label="测卦统计">
          <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted-foreground">测卦足迹</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard value={stats.total} label="累计测卦" />
            <StatCard value={stats.this_month} label="本月起卦" />
            <StatCard value={stats.saved} label="存档卦象" />
          </div>
        </section>

        {/* 偏好设置 */}
        <section className="mt-6" aria-label="偏好设置">
          <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted-foreground">偏好与仪式</p>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-sm">
            <SettingPicker
              label="默认起卦方式"
              value={METHOD_LABELS[defaultMethod]}
              open={pickingMethod}
              onToggle={() => setPickingMethod((v) => !v)}
            >
              {METHOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    patchPrefs({ defaultMethod: m });
                    setPickingMethod(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    defaultMethod === m
                      ? "bg-[var(--bagua-active-bg)] font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </SettingPicker>

            <SettingPicker
              label="解读风格"
              value={followUpPersonaShortLabel(followUpPersona)}
              open={pickingPersona}
              onToggle={() => setPickingPersona((v) => !v)}
            >
              {FOLLOWUP_PERSONA_ORDER.map((key) => {
                const meta = FOLLOWUP_PERSONA_META[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFollowUpPersona(key);
                      saveFollowUpPersona(key);
                      setPickingPersona(false);
                    }}
                    className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      followUpPersona === key
                        ? "bg-[var(--bagua-active-bg)] font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <span>{meta.label}</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                      {meta.hint}
                    </span>
                  </button>
                );
              })}
            </SettingPicker>

            <ToggleRow label="仪式引导" on={ritualGuide} onToggle={() => patchPrefs({ ritualGuide: !ritualGuide })} />
            <ToggleRow
              label="古风音效"
              hint="起卦与动画时的琴音、钱声等"
              on={soundOn}
              onToggle={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
            />
            <ToggleRow label="历史公开" on={false} onToggle={() => {}} hint="仅本人可见" disabled />

            <Link
              to="/install"
              className="flex items-center justify-between gap-2 px-4 py-3.5 text-sm transition hover:bg-[var(--bagua-active-bg)]/50"
            >
              <span>
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <Smartphone size={15} aria-hidden />
                  添加到主屏幕
                </span>
                <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                  iPhone / Android 像 App 一样打开
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </Link>

            <Link
              to="/profile/membership"
              className="flex items-center justify-between gap-2 px-4 py-3.5 text-sm transition hover:bg-[var(--bagua-active-bg)]/50"
            >
              <span>
                <span className="inline-flex items-center gap-2 font-medium text-[var(--gold)]">
                  <Crown size={15} aria-hidden />
                  会员与邀请
                </span>
                <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                  邀请 2 位好友注册，多得 1 次免费解读
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* 底部行动 */}
        <div className="mt-8 flex flex-col gap-2.5">
          <GuardedDivineLink
            search={{ method: defaultMethod, skipEntry: true }}
            returnPath="/profile"
            className="btn-gold flex items-center justify-center gap-2 py-3 text-sm"
          >
            <Compass size={16} aria-hidden />
            开始问卜
          </GuardedDivineLink>
          <Link
            to="/history"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 py-2.5 text-sm text-muted-foreground transition hover:border-[var(--gold)]/30 hover:text-foreground"
          >
            <History size={15} aria-hidden />
            查看历史卦象
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <Link
      to="/history"
      className="profile-stat-card group rounded-xl border border-border/70 bg-card/80 p-3 text-center transition hover:border-[var(--gold)]/35 hover:shadow-md sm:p-3.5"
    >
      <div className="font-serif-cjk text-2xl font-medium text-foreground transition group-hover:text-[var(--gold)]">
        {value}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[10px] tracking-wide text-muted-foreground">
        <Sparkles size={10} className="text-[var(--gold)]/50" aria-hidden />
        {label}
      </div>
    </Link>
  );
}

function SettingPicker({
  label,
  value,
  hint,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-secondary/40"
      >
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex shrink-0 items-center gap-1 font-medium text-foreground">
          {value}
          <ChevronRight
            size={16}
            className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
        </span>
      </button>
      {hint && !open && (
        <p className="border-t border-border/40 px-4 pb-3 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      )}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 border-t border-border/50 bg-secondary/25 px-3 py-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onToggle,
  hint,
  disabled,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="border-b border-border/60 px-4 py-3.5 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          disabled={disabled}
          onClick={onToggle}
          className={`profile-toggle relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
            on ? "bg-[var(--gold)]" : "bg-border"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
              on ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
