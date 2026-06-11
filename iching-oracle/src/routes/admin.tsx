import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SITE_NAME } from "@/lib/brand";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/90 px-4 py-3 sm:px-6">
        <p className="font-ritual-cjk text-xs tracking-[0.35em] text-[var(--gold)]">管理</p>
        <h1 className="font-serif-cjk text-lg font-medium text-foreground">{SITE_NAME} · 后台</h1>
      </header>
      <Outlet />
    </div>
  );
}
