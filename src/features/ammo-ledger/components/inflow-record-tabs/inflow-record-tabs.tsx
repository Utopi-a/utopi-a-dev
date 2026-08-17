"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type InflowTab = "acquire" | "dispose" | "transfer" | "manufacture" | "issue" | "receive";

const tabLabels: Record<InflowTab, string> = {
  acquire: "譲受",
  dispose: "廃棄",
  transfer: "譲渡",
  manufacture: "製造",
  issue: "交付",
  receive: "被交付",
};

type InflowRecordTabsProps = {
  defaultTab: InflowTab;
  acquireContent: ReactNode;
  disposeContent: ReactNode;
  transferContent: ReactNode;
  manufactureContent: ReactNode;
  issueContent: ReactNode;
  receiveContent: ReactNode;
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
  manufactureContent,
  issueContent,
  receiveContent,
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
      <TabsList className="w-full flex-wrap">
        {(Object.keys(tabLabels) as InflowTab[]).map((tab) => (
          <TabsTrigger key={tab} value={tab} className="flex-1">
            {tabLabels[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="acquire" className="mt-4">
        {activeTab === "acquire" ? acquireContent : null}
      </TabsContent>
      <TabsContent value="dispose" className="mt-4">
        {activeTab === "dispose" ? disposeContent : null}
      </TabsContent>
      <TabsContent value="transfer" className="mt-4">
        {activeTab === "transfer" ? transferContent : null}
      </TabsContent>
      <TabsContent value="manufacture" className="mt-4">
        {activeTab === "manufacture" ? manufactureContent : null}
      </TabsContent>
      <TabsContent value="issue" className="mt-4">
        {activeTab === "issue" ? issueContent : null}
      </TabsContent>
      <TabsContent value="receive" className="mt-4">
        {activeTab === "receive" ? receiveContent : null}
      </TabsContent>
    </Tabs>
  );
}
