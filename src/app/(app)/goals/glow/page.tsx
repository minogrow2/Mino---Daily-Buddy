import { GlowPanels } from "@/components/goals/GlowPanels";
import { GoalPage } from "@/components/goals/GoalPage";

export const metadata = { title: "Glow Up — Willow" };

export default function Page() {
  return <GoalPage goal="glow" panels={<GlowPanels />} />;
}
