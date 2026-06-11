import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { ReferralCapture } from "@/components/ReferralCapture";
import { DeviceProvider } from "@/components/DeviceProvider";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import { RitualAudioProvider } from "@/components/RitualAudioProvider";
import { WechatOAuthBootstrap } from "@/components/WechatOAuthBootstrap";
import { AuthProvider } from "@/lib/auth";
import { DEVICE_BOOTSTRAP_SCRIPT } from "@/lib/device";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SLOGAN_FULL } from "@/lib/brand";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  const router = useRouter();

  /** 404 状态下客户端 Link 往往无法离开 notFound，需整页导航 */
  const hardNavigate = (to: "/" | "/divine") => (e: React.MouseEvent) => {
    e.preventDefault();
    void router.navigate({ to, replace: true, reloadDocument: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-ritual-cjk text-lg tracking-[0.3em] text-[var(--gold)]">迷卦</p>
        <h1 className="mt-3 font-serif-cjk text-3xl font-medium text-foreground">此路不通</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          你寻找的页面不存在，或已被移走。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/" onClick={hardNavigate("/")} className="btn-gold text-sm">
            返回首页
          </a>
          <a
            href="/login?mode=choose&return=%2Fdivine"
            className="btn-ghost-gold text-sm"
          >
            去起卦
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-ritual-cjk text-lg tracking-[0.3em] text-[var(--gold)]">卦象未明</p>
        <h1 className="mt-3 font-serif-cjk text-2xl font-medium text-foreground">
          页面加载失败
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          出了点问题，请刷新重试，或返回首页。
        </p>
        {import.meta.env.DEV && error?.message ? (
          <p className="mt-2 break-all text-left text-[11px] text-destructive/90">
            {error.message}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-gold text-sm"
          >
            重试
          </button>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              void router.navigate({ to: "/", replace: true, reloadDocument: true });
            }}
            className="btn-ghost-gold text-sm"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "author", content: SITE_NAME },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SLOGAN_FULL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#F5F2EA" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/app-icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/app-icon.svg" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500&family=Ma+Shan+Zheng&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-device="desktop">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: DEVICE_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <DeviceProvider>
        <AuthProvider>
          <WechatOAuthBootstrap />
          <PwaBootstrap />
          <ReferralCapture />
          <RitualAudioProvider>
            <Outlet />
          </RitualAudioProvider>
        </AuthProvider>
      </DeviceProvider>
    </QueryClientProvider>
  );
}
