import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { DivineEntryLink } from "@/components/home/DivineEntryLink";
import { HomeHeroMark } from "@/components/home/HomeHeroMark";
import { LiveQuestionsTicker } from "@/components/home/LiveQuestionsTicker";
import { PaperDecor } from "@/components/home/PaperDecor";
import { SiteUtilityNav } from "@/components/SiteUtilityNav";
import { SITE_NAME, SLOGAN } from "@/lib/brand";
import { EXPLORE_PATH } from "@/lib/navigation";

export function HomePage() {
  return (
    <div className="home-intro flex min-h-0 flex-1 flex-col">
      <header className="home-intro-nav shrink-0 border-b border-border/80 bg-card/90 px-3 py-2.5 backdrop-blur-sm sm:px-5 sm:py-3">
        <nav aria-label="主导航" className="flex items-center justify-between gap-3">
          <Link
            to="/"
            aria-label={`${SITE_NAME} 主页`}
            className="group min-w-0 transition-colors hover:text-[var(--gold)]"
          >
            <BrandMark variant="nav" hideSlogan className="group-hover:[&_.brand-name--nav]:text-[var(--gold)]" />
          </Link>
          <SiteUtilityNav divineEntry />
        </nav>
      </header>

      <main className="home-intro-main relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center sm:px-10 sm:py-12">
        <PaperDecor variant="intro" />

        <div className="home-hero-stack relative z-[1]">
          <header
            className="home-hero-zone home-hero-zone--identity home-hero-reveal"
            style={{ animationDelay: "0ms" }}
          >
            <HomeHeroMark />
            <h1 id="home-hero-heading" className="home-hero-slogan font-serif-cjk">
              {SLOGAN}
            </h1>
          </header>

          <div className="home-hero-zone home-hero-zone--bridge home-hero-reveal" style={{ animationDelay: "90ms" }}>
            <LiveQuestionsTicker />
          </div>

          <div className="home-hero-zone home-hero-zone--action home-hero-reveal" style={{ animationDelay: "170ms" }}>
            <DivineEntryLink className="btn-gold btn-gold-hero home-hero-cta group">
              <span>开始问卜</span>
              <ArrowRight size={15} className="btn-gold-arrow" aria-hidden />
            </DivineEntryLink>
            <Link to={EXPLORE_PATH} className="home-hero-ghost group">
              沿路看看
              <ArrowRight
                size={13}
                className="opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80"
                aria-hidden
              />
            </Link>
          </div>

          <footer className="home-hero-zone home-hero-zone--utility home-hero-reveal" style={{ animationDelay: "250ms" }}>
            <nav aria-label="快捷入口" className="home-hero-foot">
              <Link to="/history" className="home-hero-foot-link">
                历史卦象
              </Link>
              <span className="home-hero-foot-sep" aria-hidden>
                ·
              </span>
              <Link to="/learn" className="home-hero-foot-link">
                十问入门
              </Link>
            </nav>
          </footer>
        </div>
      </main>
    </div>
  );
}
