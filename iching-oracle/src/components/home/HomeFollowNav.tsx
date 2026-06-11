import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import {
  EXPLORE_NAV_GROUPS,
  EXPLORE_PAGES,
  exploreNavGroupForPage,
} from "@/components/home/homePages";
import { SiteUtilityNav } from "@/components/SiteUtilityNav";
import { BrandMark } from "@/components/BrandMark";
import { SITE_NAME } from "@/lib/brand";
import { useDevice } from "@/hooks/use-device";
import { playRitualSound, unlockRitualAudio } from "@/lib/ritual-sounds";

const STEP_MARK = ["壹", "贰", "叁"] as const;

type NavPage = (typeof EXPLORE_PAGES)[number];
type NavGroup = (typeof EXPLORE_NAV_GROUPS)[number];

/** 分组与当前页同名时，面包屑只保留一页文案 */
function formatNavTrail(group: NavGroup, page: NavPage): { phase: string | null; title: string; hint?: string } {
  const hint = "hint" in page ? page.hint : undefined;
  if (group.label === page.label) {
    return { phase: null, title: page.label, hint };
  }
  return { phase: group.label, title: page.label, hint };
}

function formatNavCompact(group: NavGroup, page: NavPage): string {
  const { phase, title, hint } = formatNavTrail(group, page);
  const core = hint ? `${title} · ${hint}` : title;
  return phase ? `${phase} · ${core}` : core;
}

type Props = {
  page: number;
  onPageChange: (index: number) => void;
};

function goToPage(i: number, page: number, onPageChange: (index: number) => void) {
  if (i !== page) {
    unlockRitualAudio();
    playRitualSound("ui-step");
  }
  onPageChange(i);
}

export function HomeFollowNav({ page, onPageChange }: Props) {
  const { isMobile, isDesktop } = useDevice();
  const tabsRef = useRef<HTMLDivElement>(null);
  const current = EXPLORE_PAGES[page];
  const activeGroup = exploreNavGroupForPage(page);
  const trail = current ? formatNavTrail(activeGroup, current) : null;

  const pathProgress = useMemo(() => {
    const path = EXPLORE_NAV_GROUPS.find((g) => g.id === "path")!;
    const pos = (path.indices as readonly number[]).indexOf(page);
    if (pos < 0) return null;
    return { index: pos, total: path.indices.length };
  }, [page]);

  useEffect(() => {
    const row = tabsRef.current;
    if (!row) return;
    const active = row.querySelector<HTMLElement>(".home-guide-tab.is-active");
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [page]);

  return (
    <header
      className={`home-follow-nav shrink-0 border-b border-border bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/88${page === 0 ? " home-follow-nav--landing" : ""}`}
    >
      <nav aria-label="主导航" className="flex items-center justify-between gap-2 px-3 py-1.5 sm:px-5 sm:py-2">
        <Link
          to="/"
          aria-label={`${SITE_NAME} 主页`}
          className="group flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-[var(--gold)]"
        >
          <BrandMark variant="nav" className="shrink-0 group-hover:[&_.brand-slogan--nav]:text-[var(--gold)]" />
          <span className={`home-page-current-label truncate${isMobile ? "" : " hidden"}`}>
            {current ? formatNavCompact(activeGroup, current) : ""}
          </span>
        </Link>
        <SiteUtilityNav divineEntry />
      </nav>

      <nav aria-label="导览导航" className="home-guide-nav border-t border-border/60">
        <div className="home-guide-nav-head px-3 pt-1.5 sm:px-5 sm:pt-2">
          <div className="home-guide-nav-title">
            <span className="home-guide-nav-kicker">沿路</span>
            <span className={`home-guide-nav-context min-w-0${isDesktop ? " inline" : " hidden"}`}>
              {trail?.phase ? (
                <>
                  <span className="home-guide-nav-phase">{trail.phase}</span>
                  <ChevronRight size={10} className="shrink-0 opacity-40" aria-hidden />
                </>
              ) : null}
              <span className="truncate font-serif-cjk text-foreground">{trail?.title}</span>
              {trail?.hint ? (
                <span className="home-guide-nav-hint truncate">{trail.hint}</span>
              ) : null}
            </span>
          </div>
          <div className="home-guide-nav-meta">
            {pathProgress ? (
              <span className={`home-guide-path-badge${isDesktop ? " inline-flex" : " hidden"}`}>
                主线 {pathProgress.index + 1}/{pathProgress.total}
              </span>
            ) : null}
            <span className="home-guide-nav-count tabular-nums">
              <span className="home-guide-nav-count-current">{page + 1}</span>
              <span className="text-muted-foreground/70"> / {EXPLORE_PAGES.length}</span>
            </span>
          </div>
        </div>

        <div className="home-guide-strip px-3 pb-2 pt-0.5 sm:px-5 sm:pb-2.5 sm:pt-1">
          <div ref={tabsRef} className="home-guide-groups">
            {EXPLORE_NAV_GROUPS.map((group) => {
              const indices = group.indices as readonly number[];
              const isActiveGroup = indices.includes(page);

              return (
                <div
                  key={group.id}
                  className={`home-guide-group home-guide-group--${group.id}${isActiveGroup ? " is-active-group" : ""}${indices.every((i) => i < page) ? " is-done-group" : ""}`}
                  style={{ flex: indices.length }}
                >
                  <span className="home-guide-group-label">{group.label}</span>
                  <div className="home-guide-group-tabs" role="list">
                    {indices.map((i) => {
                      const p = EXPLORE_PAGES[i];
                      const on = page === i;
                      const isPath = group.id === "path";
                      const stepVal = "step" in p ? p.step : undefined;
                      const stepIdx = stepVal != null ? stepVal - 1 : -1;
                      const isCta = "cta" in p && Boolean(p.cta);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="listitem"
                          aria-current={on ? "page" : undefined}
                          aria-label={
                            group.label === p.label
                              ? `${p.label}${p.hint ? `，${p.hint}` : ""}`
                              : `${group.label} · ${p.label}${p.hint ? `，${p.hint}` : ""}`
                          }
                          onClick={() => goToPage(i, page, onPageChange)}
                          className={`home-guide-tab${on ? " is-active" : ""}${isPath ? " is-path" : ""}${isCta ? " is-cta" : ""}`}
                        >
                          <span className="home-guide-tab-main">
                            {isPath && stepIdx >= 0 ? (
                              <span className="home-guide-tab-step font-ritual-cjk" aria-hidden>
                                {STEP_MARK[stepIdx]}
                              </span>
                            ) : null}
                            <span className="home-guide-tab-label">{p.label}</span>
                          </span>
                          <span className="home-guide-tab-hint">{p.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="home-guide-rail" aria-hidden>
            {EXPLORE_NAV_GROUPS.map((group) => {
              const indices = group.indices as readonly number[];
              return (
                <div
                  key={group.id}
                  className={`home-guide-rail-block home-guide-rail-block--${group.id}${
                    indices.includes(page) ? " is-active-group" : ""
                  }${indices.every((i) => i < page) ? " is-done-group" : ""}`}
                  style={{ flex: indices.length }}
                >
                  {indices.map((i) => (
                    <span
                      key={EXPLORE_PAGES[i].id}
                      className={`home-guide-rail-seg${i === page ? " is-current" : i < page ? " is-done" : ""}`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
