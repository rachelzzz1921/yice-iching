import { BrandMark } from "@/components/BrandMark";
import { SiteUtilityNav } from "@/components/SiteUtilityNav";
import { SITE_NAME } from "@/lib/brand";

export function SiteNav() {
  return (
    <nav
      aria-label="主导航"
      className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 sm:px-5 sm:py-3.5"
    >
      <div className="site-brand-static min-w-0" aria-label={SITE_NAME}>
        <BrandMark variant="nav" />
      </div>
      <SiteUtilityNav />
    </nav>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <div className="mx-auto w-full max-w-3xl px-2 pt-2 pb-4 sm:px-5 sm:pt-5 sm:pb-6 lg:max-w-4xl xl:max-w-[52rem]">
        <div className="paper-card relative overflow-hidden rounded-2xl">
          <SiteNav />
          <div className="site-brand-bar hidden sm:block" aria-hidden>
            <BrandMark variant="banner" showTagline={false} />
          </div>
          <main id="main-content" className="page-content">{children}</main>
          <footer className="site-brand-bar border-t border-b-0 sm:hidden">
            <BrandMark variant="footer" />
          </footer>
        </div>
      </div>
    </div>
  );
}
