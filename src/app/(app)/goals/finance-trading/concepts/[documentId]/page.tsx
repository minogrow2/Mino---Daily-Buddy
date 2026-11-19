import { Suspense } from "react";
import { DocEditor } from "@/components/editor/DocEditor";

export const metadata = { title: "Document — Willow" };

async function Editor({ params }: { params: PageProps<"/goals/finance-trading/concepts/[documentId]">["params"] }) {
  const { documentId } = await params;
  return <DocEditor documentId={documentId} backHref="/goals/finance-trading/concepts" backLabel="Concepts and Platforms" />;
}

export default function Page(props: PageProps<"/goals/finance-trading/concepts/[documentId]">) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted">Opening document…</div>}>
      <Editor params={props.params} />
    </Suspense>
  );
}
