import { PageHeader } from "@/components/ui";
import GoalsView from "@/components/GoalsView";

export default function GoalsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Goals"
        title="Targets, gaps & what to fix."
        subtitle="Two goals that matter most right now, the popup scoreboard behind the opt-in number, and an auto-generated list of weak points ranked by impact."
      />
      <GoalsView />
    </>
  );
}
