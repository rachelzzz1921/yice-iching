/**
 * 「沿路一览」横向分页：流程 → 问事 → 起卦 → 解读 → 先例 → 八卦 → 起行
 */
export const EXPLORE_PAGES = [
  { id: "intro", label: "入内", hint: "从此看起" },
  { id: "ritual", label: "流程", hint: "三步纵览" },
  { id: "questions", label: "问事", hint: "明确所问", step: 1 },
  { id: "methods", label: "起卦", hint: "观象成卦", step: 2 },
  { id: "reading", label: "解读", hint: "大师深解", step: 3 },
  { id: "stories", label: "先例", hint: "他人曾问" },
  { id: "bagua", label: "八卦", hint: "符号根基" },
  { id: "start", label: "起行", hint: "即刻问卜", cta: true },
] as const;

/** @deprecated 使用 EXPLORE_PAGES */
export const HOME_PAGES = EXPLORE_PAGES;

export type ExplorePageId = (typeof EXPLORE_PAGES)[number]["id"];
export type HomePageId = ExplorePageId;

/** 分组名与页内 tab 名刻意区分，避免导览条出现「入内 > 入内」类叠字 */
export const EXPLORE_NAV_GROUPS = [
  { id: "intro", label: "入门", indices: [0, 1] as const },
  { id: "path", label: "问卜", indices: [2, 3, 4] as const },
  { id: "explore", label: "延伸", indices: [5, 6] as const },
  { id: "action", label: "开问", indices: [7] as const },
] as const;

/** @deprecated 使用 EXPLORE_NAV_GROUPS */
export const HOME_NAV_GROUPS = EXPLORE_NAV_GROUPS;

export type ExploreNavGroupId = (typeof EXPLORE_NAV_GROUPS)[number]["id"];
export type HomeNavGroupId = ExploreNavGroupId;

export const EXPLORE_PAGE_INDEX = {
  intro: 0,
  ritual: 1,
  questions: 2,
  methods: 3,
  reading: 4,
  stories: 5,
  bagua: 6,
  start: 7,
} as const;

/** @deprecated 使用 EXPLORE_PAGE_INDEX */
export const HOME_PAGE_INDEX = EXPLORE_PAGE_INDEX;

const GROUP_BY_INDEX = EXPLORE_NAV_GROUPS.flatMap((g) =>
  g.indices.map((i) => [i, g] as const),
);

export function exploreNavGroupForPage(page: number) {
  return GROUP_BY_INDEX.find(([i]) => i === page)?.[1] ?? EXPLORE_NAV_GROUPS[0];
}

/** @deprecated 使用 exploreNavGroupForPage */
export const homeNavGroupForPage = exploreNavGroupForPage;
