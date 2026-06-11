import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  buildDivineHref,
  buildLoginChooseHref,
  needsAuthEntryChoice,
} from "@/lib/auth-entry";
import { exploreLocationPath } from "@/lib/navigation";
import type { CategoryId } from "@/lib/iching";

type Ctx = { returnPath: string };

const ReturnPathContext = createContext<Ctx>({ returnPath: "/" });

export function ReturnPathProvider({
  returnPath,
  children,
}: {
  returnPath: string;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ returnPath }), [returnPath]);
  return <ReturnPathContext.Provider value={value}>{children}</ReturnPathContext.Provider>;
}

/** 导览页：return 指向当前 /explore 位置 */
export function ExploreNavProvider({
  page,
  category,
  children,
}: {
  page: number;
  category?: CategoryId;
  children: ReactNode;
}) {
  const returnPath = exploreLocationPath(page, category);
  return <ReturnPathProvider returnPath={returnPath}>{children}</ReturnPathProvider>;
}

/** @deprecated 使用 ExploreNavProvider 或 ReturnPathProvider */
export function HomeNavProvider({
  page,
  category,
  children,
}: {
  page: number;
  category?: CategoryId;
  children: ReactNode;
}) {
  return (
    <ExploreNavProvider page={page} category={category}>
      {children}
    </ExploreNavProvider>
  );
}

type DivineSearch = Record<string, unknown>;

type Props = Omit<LinkProps, "to"> & {
  /** 未在 ReturnPathProvider 内时可显式指定 */
  returnPath?: string;
};

function useCurrentReturnPath(): string {
  return useRouterState({
    select: (s) => `${s.location.pathname}${s.location.searchStr ?? ""}`,
  });
}

/** 所有起卦入口：未在本会话确认入内 → 先走选择页 */
export function DivineEntryLink({ search, returnPath: returnPathProp, ...props }: Props) {
  const { returnPath: ctxReturn } = useContext(ReturnPathContext);
  const currentPath = useCurrentReturnPath();
  const { user, loading } = useAuth();
  const returnPath = returnPathProp ?? (ctxReturn !== "/" ? ctxReturn : currentPath);
  const base = typeof search === "object" && search != null ? search : {};
  const divineSearch = { ...base, return: returnPath };
  const divineHref = buildDivineHref(divineSearch);

  if (!loading && needsAuthEntryChoice(!!user)) {
    const login = buildLoginChooseHref(divineHref);
    return <Link {...props} to={login.to} search={login.search} />;
  }

  return <Link {...props} to="/divine" search={divineSearch} />;
}

/** 无 Provider 时的简版起卦链接（如顶栏、历史、会员页） */
export function GuardedDivineLink({
  search,
  returnPath,
  className,
  children,
}: {
  search?: DivineSearch;
  returnPath?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <DivineEntryLink search={search} returnPath={returnPath} className={className}>
      {children}
    </DivineEntryLink>
  );
}
