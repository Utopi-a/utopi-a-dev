import { Suspense } from "react";
import { InflowNewView } from "@/features/ammo-ledger/components/inflow-new-view/inflow-new-view";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const metadata = { title: "入庫・出庫の記録" };

export default function InflowNewPage() {
  return (
    <Suspense fallback={<WorkspaceViewLoader />}>
      <InflowNewView />
    </Suspense>
  );
}
