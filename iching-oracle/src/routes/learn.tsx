import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteNav";
import { LearnTenQuestions } from "@/components/LearnTenQuestions";
import { SITE_NAME } from "@/lib/brand";

export const Route = createFileRoute("/learn")({
  component: LearnPage,
  head: () => ({
    meta: [
      { title: `易经十问 — ${SITE_NAME}` },
      {
        name: "description",
        content: "易经十问：为何用易经起卦、与算命有何不同、四式起卦、如何帮助决策。",
      },
    ],
  }),
});

function LearnPage() {
  return (
    <PageShell>
      <LearnTenQuestions />
    </PageShell>
  );
}
