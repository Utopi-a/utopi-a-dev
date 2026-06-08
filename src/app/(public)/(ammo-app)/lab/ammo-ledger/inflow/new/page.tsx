import { Suspense } from "react";
import { InflowNewView } from "@/features/ammo-ledger/components/inflow-new-view/inflow-new-view";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export default function InflowNewPage() {
  return (
    <Suspense fallback={<WorkspaceViewLoader />}>
      <InflowNewView />
    </Suspense>
  );
}
