import { redirect } from "next/navigation";

// Templates are listed on the Backtesting Logger page under its Templates tab.
export default function Page() {
  redirect("/goals/finance-trading/backtesting");
}
