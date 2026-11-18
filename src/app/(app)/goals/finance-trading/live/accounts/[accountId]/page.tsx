import { Suspense } from "react";
import { AccountPage } from "@/components/trading/live/AccountPage";

export const metadata = { title: "Prop account — Willow" };

async function Account({ params }: { params: PageProps<"/goals/finance-trading/live/accounts/[accountId]">["params"] }) {
  const { accountId } = await params;
  return <AccountPage id={accountId} />;
}

export default function Page(props: PageProps<"/goals/finance-trading/live/accounts/[accountId]">) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted">Opening account…</div>}>
      <Account params={props.params} />
    </Suspense>
  );
}
