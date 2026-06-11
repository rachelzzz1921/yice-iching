import { ADMIN_TAB_META, ADMIN_TABS, type AdminTabId } from "@/lib/admin-constants";
import { AdminDbBanner } from "./AdminDbBanner";
import { AdminScopeNote } from "./AdminScopeNote";

type Props = {
  tab: AdminTabId;
  onTab: (tab: AdminTabId) => void;
  onLogout: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  databaseOk?: boolean | null;
  databaseError?: string | null;
  scopeNote?: string;
  onDatabaseRefresh?: () => void;
  children: React.ReactNode;
};

export function AdminShell({
  tab,
  onTab,
  onLogout,
  onRefresh,
  refreshing,
  databaseOk,
  databaseError,
  scopeNote,
  onDatabaseRefresh,
  children,
}: Props) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="border-b border-border bg-card/50 px-4 py-3 lg:w-44 lg:border-b-0 lg:border-r lg:py-6">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
          {ADMIN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              data-active={tab === t.id}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground data-[active=true]:bg-[var(--bagua-active-bg)] data-[active=true]:font-medium data-[active=true]:text-foreground"
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 hidden flex-col gap-2 lg:flex">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {refreshing ? "刷新中…" : "刷新数据"}
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-6">
        <header className="mb-4 border-b border-border/60 pb-3">
          <h1 className="text-base font-medium text-foreground">{ADMIN_TAB_META[tab].title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{ADMIN_TAB_META[tab].hint}</p>
        </header>
        <AdminDbBanner
          databaseOk={databaseOk ?? null}
          databaseError={databaseError}
          onStarted={onDatabaseRefresh}
        />
        {databaseOk && <AdminScopeNote note={scopeNote} />}
        {children}
      </main>
      <div className="flex gap-2 border-t border-border px-4 py-3 lg:hidden">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex-1 rounded-lg border border-border py-2 text-xs"
          >
            刷新
          </button>
        )}
        <button type="button" onClick={onLogout} className="flex-1 rounded-lg border border-border py-2 text-xs">
          退出
        </button>
      </div>
    </div>
  );
}
