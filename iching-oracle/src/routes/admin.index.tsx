import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminCodesTab } from "@/components/admin/AdminCodesTab";
import { AdminDivinationsTab } from "@/components/admin/AdminDivinationsTab";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminPaymentsTab } from "@/components/admin/AdminPaymentsTab";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSystemTab } from "@/components/admin/AdminSystemTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { adminFetchHealth, adminFetchOverview, getAdminToken, setAdminToken } from "@/lib/admin-api";
import type { AdminTabId } from "@/lib/admin-constants";

export const Route = createFileRoute("/admin/")({
  validateSearch: (s: Record<string, unknown>) => {
    const tab = typeof s.tab === "string" ? s.tab : "overview";
    const valid: AdminTabId[] = ["overview", "users", "divinations", "codes", "payments", "system"];
    return {
      tab: valid.includes(tab as AdminTabId) ? (tab as AdminTabId) : "overview",
    };
  },
  component: AdminPage,
});

function AdminPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/" });
  const [authed, setAuthed] = useState(() => !!getAdminToken());
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterUserId, setFilterUserId] = useState<number | undefined>();
  const [databaseOk, setDatabaseOk] = useState<boolean | null>(null);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [scopeNote, setScopeNote] = useState<string | undefined>();

  const logout = useCallback(() => {
    setAdminToken(null);
    setAuthed(false);
    setDatabaseOk(null);
    setDatabaseError(null);
  }, []);

  const handleAuthError = useCallback(() => {
    logout();
  }, [logout]);

  const refreshHealth = useCallback(() => {
    adminFetchHealth()
      .then((h) => {
        setDatabaseOk(h.database);
        setDatabaseError(h.databaseError ?? null);
        if (h.database) {
          adminFetchOverview()
            .then((ov) => setScopeNote(ov.scope?.note))
            .catch(() => setScopeNote(undefined));
        }
      })
      .catch(() => {
        setDatabaseOk(false);
        setDatabaseError("无法连接后端服务");
      });
  }, []);

  useEffect(() => {
    if (!authed) return;
    refreshHealth();
  }, [authed, refreshKey, refreshHealth]);

  const setTab = (next: AdminTabId) => {
    void navigate({ search: { tab: next } });
  };

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <AdminShell
      tab={tab}
      onTab={setTab}
      onLogout={logout}
      onRefresh={bumpRefresh}
      refreshing={false}
      databaseOk={databaseOk}
      databaseError={databaseError}
      scopeNote={scopeNote}
      onDatabaseRefresh={() => {
        refreshHealth();
        bumpRefresh();
      }}
    >
      {tab === "overview" && (
        <AdminOverviewTab refreshKey={refreshKey} databaseOk={databaseOk} onAuthError={handleAuthError} />
      )}
      {tab === "users" && (
        <AdminUsersTab
          refreshKey={refreshKey}
          databaseOk={databaseOk}
          onAuthError={handleAuthError}
          onViewUserDivinations={(userId) => {
            setFilterUserId(userId);
            setTab("divinations");
          }}
        />
      )}
      {tab === "divinations" && (
        <AdminDivinationsTab
          refreshKey={refreshKey}
          databaseOk={databaseOk}
          onAuthError={handleAuthError}
          filterUserId={filterUserId}
          onClearUserFilter={() => setFilterUserId(undefined)}
        />
      )}
      {tab === "codes" && (
        <AdminCodesTab refreshKey={refreshKey} databaseOk={databaseOk} onAuthError={handleAuthError} />
      )}
      {tab === "payments" && (
        <AdminPaymentsTab refreshKey={refreshKey} databaseOk={databaseOk} onAuthError={handleAuthError} />
      )}
      {tab === "system" && (
        <AdminSystemTab
          refreshKey={refreshKey}
          databaseOk={databaseOk}
          onAuthError={handleAuthError}
          onMigrated={() => {
            refreshHealth();
            bumpRefresh();
          }}
        />
      )}
    </AdminShell>
  );
}
