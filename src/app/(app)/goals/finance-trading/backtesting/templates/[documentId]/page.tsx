import { Suspense } from "react";
import { DocEditor } from "@/components/editor/DocEditor";

export const metadata = { title: "Template — Willow" };

async function Editor({ params }: { params: PageProps<"/goals/finance-trading/backtesting/templates/[documentId]">["params"] }) {
  const { documentId } = await params;
  return <DocEditor documentId={documentId} backHref="/goals/finance-trading/backtesting" backLabel="Backtesting Logger" />;
}

export default function Page(props: PageProps<"/goals/finance-trading/backtesting/templates/[documentId]">) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted">Opening template…</div>}>
      <Editor params={props.params} />
    </Suspense>
  );
}
