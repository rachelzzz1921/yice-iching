export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

export function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Mobile/i.test(ua)) return "unknown";
  return "desktop";
}

/** 已从主屏幕打开（类 App 全屏） */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // Safari 添加到主屏幕
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return getInstallPlatform() === "ios";
}

/** 微信、微博等内置浏览器无法直接「添加到主屏幕」 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger|Weibo|QQ\//i.test(navigator.userAgent);
}

/** iOS 上是否为系统 Safari（可添加主屏幕） */
export function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  if (isInAppBrowser()) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|mercury|Chrome/i.test(ua)) return false;
  return /Safari/i.test(ua);
}

export function canShowAndroidInstallButton(): boolean {
  return !!deferredInstallPrompt;
}

export function initPwaInstallListener(): () => void {
  if (typeof window === "undefined") return () => {};

  const onBip = (e: Event) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent("yice:pwa-install-available"));
  };

  const onInstalled = () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("yice:pwa-installed"));
  };

  window.addEventListener("beforeinstallprompt", onBip);
  window.addEventListener("appinstalled", onInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", onBip);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export async function triggerAndroidInstall(): Promise<"installed" | "dismissed" | "unavailable"> {
  const prompt = deferredInstallPrompt;
  if (!prompt) return "unavailable";
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredInstallPrompt = null;
    return outcome === "accepted" ? "installed" : "dismissed";
  } catch {
    deferredInstallPrompt = null;
    return "unavailable";
  }
}

export function getInstallPagePath(): string {
  return "/install";
}

/** 复制或分享当前站点链接，便于从微信转到 Safari */
export async function copySiteUrlForSafari(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const url = window.location.origin + getInstallPagePath();
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}
