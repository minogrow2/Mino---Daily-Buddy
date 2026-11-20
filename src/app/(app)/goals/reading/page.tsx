import { ReadingPanel } from "@/components/goals/LinkedPanels";
import { GoalPage } from "@/components/goals/GoalPage";

export const metadata = { title: "Watch and Read — Willow" };

export default function Page() {
  return <GoalPage goal="reading" panels={<ReadingPanel />} />;
}
