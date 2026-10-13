import { Suspense } from "react";
import { ConsumeNewView } from "@/features/ammo-ledger/components/consume-new-view/consume-new-view";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const metadata = { title: "消費の記録" };

export default function ConsumeNewPage() {
  return (
    <Suspense fallback={<WorkspaceViewLoader />}>
      <ConsumeNewView />
    </Suspense>
  );
}
