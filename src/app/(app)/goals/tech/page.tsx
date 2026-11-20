import { TechProjectsPanel } from "@/components/goals/LinkedPanels";
import { GoalPage } from "@/components/goals/GoalPage";

export const metadata = { title: "Tech Development — Willow" };

export default function Page() {
  return <GoalPage goal="tech" panels={<TechProjectsPanel />} />;
}
