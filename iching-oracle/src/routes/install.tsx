import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Share,
  Smartphone,
  SquarePlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { GuardedDivineLink } from "@/components/home/DivineEntryLink";
import { PageShell } from "@/components/SiteNav";
import { SITE_NAME } from "@/lib/brand";
import {
  canShowAndroidInstallButton,
  copySiteUrlForSafari,
  getInstallPlatform,
  isInAppBrowser,
  isIOSSafari,
  isStandaloneApp,
  triggerAndroidInstall,
} from "@/lib/install-app";

export const Route = createFileRoute("/install")({
  component: InstallAppPage,
});

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/80 bg-card/70 px-4 py-3.5">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bagua-active-bg)] text-xs font-medium text-[var(--gold)]"
        aria-hidden
      >
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

function InstallAppPage() {
  const [platform, setPlatform] = useState<ReturnType<typeof getInstallPlatform>>("unknown");
  const [standalone, setStandalone] = useState(false);
  const [androidReady, setAndroidReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [installMsg, setInstallMsg] = useState("");

  useEffect(() => {
    setPlatform(getInstallPlatform());
    setStandalone(isStandaloneApp());
    setAndroidReady(canShowAndroidInstallButton());

    const refresh = () => setAndroidReady(canShowAndroidInstallButton());
    window.addEventListener("yice:pwa-install-available", refresh);
    window.addEventListener("yice:pwa-installed", () => {
      setStandalone(true);
      setInstallMsg("已安装到主屏幕，可从桌面图标打开。");
    });
    return () => {
      window.removeEventListener("yice:pwa-install-available", refresh);
    };
  }, []);

  const handleAndroidInstall = async () => {
    setBusy(true);
    setInstallMsg("");
    const result = await triggerAndroidInstall();
    if (result === "installed") setInstallMsg("安装成功，请从主屏幕或应用列表打开易测。");
    else if (result === "dismissed") setInstallMsg("你已取消安装，仍可按下方步骤手动添加。");
    else setInstallMsg("当前浏览器暂不支持一键安装，请按下方步骤手动添加。");
    setBusy(false);
  };

  const handleCopyLink = async () => {
    const ok = await copySiteUrlForSafari();
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 2000);
  };

  const inApp = isInAppBrowser();
  const iosSafari = isIOSSafari();
  const showIos = platform === "ios";
  const showAndroid = platform === "android";

  return (
    <PageShell>
      <div className="px-6 py-7 sm:px-8">
        <Link
          to="/profile"
          className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> 返回我的
        </Link>

        <div className="text-center">
          <Smartphone size={28} className="mx-auto text-[var(--gold)]" aria-hidden />
          <h1 className="mt-3 font-serif-cjk text-xl font-medium text-foreground">添加到主屏幕</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            像 App 一样全屏打开 {SITE_NAME}，起卦、看解读更顺手。
          </p>
        </div>

        {standalone ? (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-[var(--gold)]/40 bg-[var(--bagua-active-bg)] px-4 py-4 text-sm text-foreground">
            <Check size={18} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden />
            <p>你正在从主屏幕图标打开，已具备类 App 体验。</p>
          </div>
        ) : null}

        {inApp && (showIos || showAndroid) ? (
          <div className="mt-6 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3.5 text-sm">
            <p className="font-medium text-foreground">请先使用系统浏览器打开</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              微信 / QQ 等内置浏览器无法添加主屏幕。请点右上角「⋯」选择「在 Safari 中打开」或「在浏览器中打开」。
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--gold)] hover:underline"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "已复制链接" : "复制链接，到 Safari / Chrome 粘贴打开"}
            </button>
          </div>
        ) : null}

        {showAndroid && !standalone && (
          <section className="mt-6" aria-labelledby="install-android-title">
            <h2 id="install-android-title" className="text-sm font-medium text-foreground">
              Android · 一键安装
            </h2>
            {androidReady ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleAndroidInstall}
                className="btn-gold mt-3 w-full py-3 text-sm disabled:opacity-50"
              >
                {busy ? "请稍候…" : "安装到主屏幕 / 应用列表"}
              </button>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                若未出现按钮，请用 Chrome 打开本页，或使用下方手动步骤。
              </p>
            )}
            <ol className="mt-4 space-y-2.5">
              <StepCard step={1} title="用 Chrome 打开本站">
                地址栏旁或菜单中的「安装应用」「添加到主屏幕」。
              </StepCard>
              <StepCard step={2} title="或：浏览器菜单 ⋮">
                选择「添加到主屏幕」或「安装应用」，确认即可。
              </StepCard>
            </ol>
          </section>
        )}

        {showIos && !standalone && (
          <section className="mt-6" aria-labelledby="install-ios-title">
            <h2 id="install-ios-title" className="text-sm font-medium text-foreground">
              iPhone / iPad · Safari 添加主屏幕
            </h2>
            {!iosSafari && !inApp ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                请使用 <strong>Safari</strong> 打开本页（Chrome 等需改用 Safari 才能添加主屏幕）。
              </p>
            ) : null}
            <ol className="mt-4 space-y-2.5">
              <StepCard step={1} title="点击底部分享按钮">
                <span className="inline-flex items-center gap-1">
                  <Share size={14} className="text-[var(--gold)]" aria-hidden />
                  Safari 底部中间的「分享」
                </span>
              </StepCard>
              <StepCard step={2} title="选择「添加到主屏幕」">
                <span className="inline-flex items-center gap-1">
                  <SquarePlus size={14} className="text-[var(--gold)]" aria-hidden />
                  向下滑动找到「添加到主屏幕」
                </span>
              </StepCard>
              <StepCard step={3} title="点右上角「添加」">
                名称默认为「{SITE_NAME}」，可改昵称后确认。
              </StepCard>
            </ol>
            {iosSafari ? (
              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                添加后从桌面图标进入，将隐藏 Safari 地址栏，体验接近原生 App。
              </p>
            ) : null}
          </section>
        )}

        {platform === "desktop" && !standalone ? (
          <section className="mt-6 rounded-xl border border-border bg-secondary/40 px-4 py-4 text-sm text-muted-foreground">
            <p>
              在电脑上可将本站固定到任务栏：Chrome 地址栏右侧「安装」图标，或 Edge / Safari
              的「添加到程序坞 / 固定」。
            </p>
            <p className="mt-2">手机用户请用手机打开本页，会自动显示对应系统的步骤。</p>
          </section>
        ) : null}

        {installMsg ? (
          <p className="mt-4 text-center text-sm text-[var(--success)]" role="status">
            {installMsg}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-2">
          <GuardedDivineLink returnPath="/install" className="btn-gold py-2.5 text-center text-sm">
            继续问卜
          </GuardedDivineLink>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink size={12} aria-hidden />
            返回首页
          </a>
        </div>
      </div>
    </PageShell>
  );
}
