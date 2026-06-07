"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
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

function syncTabToUrl({ tab, draft }: { tab: InflowTab; draft: string | null }) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (draft) {
    params.set("draft", draft);
  }
  const url = `/lab/ammo-ledger/inflow/new?${params.toString()}`;
  window.history.replaceState(window.history.state, "", url);
}

export function InflowRecordTabs({
  defaultTab,
  acquireContent,
  disposeContent,
  transferContent,
}: InflowRecordTabsProps) {
  const searchParams = useSearchParams();
  const draft = searchParams.get("draft");
  const [activeTab, setActiveTab] = useState<InflowTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  function handleTabChange(tab: string) {
    const nextTab = tab as InflowTab;
    setActiveTab(nextTab);
    syncTabToUrl({ tab: nextTab, draft });
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
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
