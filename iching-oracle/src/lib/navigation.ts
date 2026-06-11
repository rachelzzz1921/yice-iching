import type { RegisteredRouter } from "@tanstack/react-router";
import { EXPLORE_PAGES } from "@/components/home/homePages";
import type { CategoryId } from "@/lib/iching";
import { isValidCategory } from "@/lib/profile";

export const EXPLORE_PATH = "/explore";

export type ExploreSearch = {
  category?: CategoryId;
  page?: number;
};

export type HomeIndexSearch = ExploreSearch;

export function parseExplorePage(raw: unknown): number | undefined {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0 && n < EXPLORE_PAGES.length) return n;
  return undefined;
}

/** @deprecated 使用 parseExplorePage */
export const parseHomePage = parseExplorePage;

export function buildExploreSearch(opts: {
  page?: number;
  category?: CategoryId;
}): ExploreSearch {
  const page =
    opts.page != null && opts.page > 0 && opts.page < EXPLORE_PAGES.length ? opts.page : undefined;
  const category = opts.category && isValidCategory(opts.category) ? opts.category : undefined;
  return { ...(category ? { category } : {}), ...(page != null ? { page } : {}) };
}

/** @deprecated 使用 buildExploreSearch */
export const buildHomeSearch = buildExploreSearch;

/** 当前导览位置对应的站内路径（用于问卜页 return） */
export function exploreLocationPath(page: number, category?: CategoryId): string {
  const search = buildExploreSearch({ page, category });
  const params = new URLSearchParams();
  if (search.page != null) params.set("page", String(search.page));
  if (search.category) params.set("category", search.category);
  const qs = params.toString();
  return qs ? `${EXPLORE_PATH}?${qs}` : EXPLORE_PATH;
}

/** @deprecated 使用 exploreLocationPath */
export const homeLocationPath = exploreLocationPath;

/** 解析站内 return 路径（防开放重定向） */
export function parseReturnPath(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const decoded = decodeURIComponent(raw.trim());
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return undefined;
  return decoded;
}

type RouterLike = Pick<RegisteredRouter, "navigate" | "history">;

/** 退出到上一浏览页；无历史或指定 return 时回退到 fallback */
export function exitToPrevious(
  router: RouterLike,
  options?: { returnPath?: string; fallback?: string },
) {
  const fallback = options?.fallback ?? "/";
  const returnPath = parseReturnPath(options?.returnPath);

  if (returnPath) {
    void router.navigate({ href: returnPath });
    return;
  }

  if (typeof window !== "undefined" && window.history.length > 1) {
    router.history.back();
    return;
  }

  void router.navigate({ to: fallback });
}
