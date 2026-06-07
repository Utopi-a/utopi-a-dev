"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type InflowTab = "acquire" | "dispose" | "transfer";

const tabLabels: Record<InflowTab, string> = {
  acquire: "譲り受けた",
  dispose: "廃棄した",
  transfer: "譲渡した",
};

type InflowRecordTabsProps = {
  defaultTab: InflowTab;
  acquireContent: ReactNode;
  disposeContent: ReactNode;
  transferContent: ReactNode;
};

export function InflowRecordTabs({
  defaultTab,
  acquireContent,
  disposeContent,
  transferContent,
}: InflowRecordTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draft = searchParams.get("draft");

  function handleTabChange(tab: string) {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (draft) {
      params.set("draft", draft);
    }
    router.replace(`/lab/ammo-ledger/inflow/new?${params.toString()}`);
  }

  return (
    <Tabs value={defaultTab} onValueChange={handleTabChange}>
      <TabsList className="w-full">
        {(Object.keys(tabLabels) as InflowTab[]).map((tab) => (
          <TabsTrigger key={tab} value={tab} className="flex-1">
            {tabLabels[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="acquire" className="mt-4">
        {acquireContent}
      </TabsContent>
      <TabsContent value="dispose" className="mt-4">
        {disposeContent}
      </TabsContent>
      <TabsContent value="transfer" className="mt-4">
        {transferContent}
      </TabsContent>
    </Tabs>
  );
}
