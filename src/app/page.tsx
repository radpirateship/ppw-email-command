import { PageHeader } from "@/components/ui";
import TaskBoard from "@/components/TaskBoard";
import HomeStats from "@/components/HomeStats";

export default function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="This week"
        title="Here's what to do this week."
        subtitle="The highest-impact next action, your short list, and the full backlog. Check things off — progress saves automatically on this device."
      />

      <HomeStats />

      <TaskBoard />
    </>
  );
}
