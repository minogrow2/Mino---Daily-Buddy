import { CoursesPanel } from "@/components/goals/CoursesPanel";
import { GoalPage } from "@/components/goals/GoalPage";

export const metadata = { title: "CS Student Advantage — Willow" };

export default function Page() {
  return <GoalPage goal="cs" panels={<CoursesPanel />} />;
}
