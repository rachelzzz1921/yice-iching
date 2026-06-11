import { createFileRoute } from "@tanstack/react-router";
import { HomeExplore } from "@/components/home/HomeExplore";
import { HomeShell } from "@/components/home/HomeShell";
import { parseExplorePage, type ExploreSearch } from "@/lib/navigation";
import { isValidCategory } from "@/lib/profile";

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
    category: isValidCategory(search.category) ? search.category : undefined,
    page: parseExplorePage(search.page),
  }),
  component: ExploreRoute,
});

function ExploreRoute() {
  const { category, page } = Route.useSearch();
  return (
    <HomeShell>
      <HomeExplore initialCategory={category} initialPage={page} />
    </HomeShell>
  );
}
