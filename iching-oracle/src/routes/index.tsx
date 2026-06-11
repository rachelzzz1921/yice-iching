import { createFileRoute, redirect } from "@tanstack/react-router";
import { HomeShell } from "@/components/home/HomeShell";
import { HomePage } from "@/components/home/HomePage";
import { ReturnPathProvider } from "@/components/home/DivineEntryLink";
import { buildExploreSearch, EXPLORE_PATH, parseExplorePage } from "@/lib/navigation";
import { isValidCategory } from "@/lib/profile";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const page = parseExplorePage(search.page);
    const category = isValidCategory(search.category) ? search.category : undefined;
    if (page != null || category) {
      throw redirect({
        to: EXPLORE_PATH,
        search: buildExploreSearch({ page: page ?? 0, category }),
      });
    }
    return {};
  },
  component: Index,
});

function Index() {
  return (
    <HomeShell>
      <ReturnPathProvider returnPath="/">
        <HomePage />
      </ReturnPathProvider>
    </HomeShell>
  );
}
