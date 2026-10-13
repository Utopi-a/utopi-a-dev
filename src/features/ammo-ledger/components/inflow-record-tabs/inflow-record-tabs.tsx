"use client";

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

// 下書き・入力の復元などの指定を保ったまま、タブだけを URL に反映する。
function syncTabToUrl({ tab }: { tab: InflowTab }) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab);
  window.history.replaceState(null, "", url);
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
  const [activeTab, setActiveTab] = useState<InflowTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  function handleTabChange(tab: string) {
    const nextTab = tab as InflowTab;
    setActiveTab(nextTab);
    syncTabToUrl({ tab: nextTab });
  }

  // 切り替えても入力が消えないよう、全タブのフォームを保持して表示だけを切り替える。
  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="w-full flex-wrap">
        {(Object.keys(tabLabels) as InflowTab[]).map((tab) => (
          <TabsTrigger key={tab} value={tab} className="flex-1">
            {tabLabels[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="acquire" forceMount hidden={activeTab !== "acquire"} className="mt-4">
        {acquireContent}
      </TabsContent>
      <TabsContent value="dispose" forceMount hidden={activeTab !== "dispose"} className="mt-4">
        {disposeContent}
      </TabsContent>
      <TabsContent value="transfer" forceMount hidden={activeTab !== "transfer"} className="mt-4">
        {transferContent}
      </TabsContent>
      <TabsContent
        value="manufacture"
        forceMount
        hidden={activeTab !== "manufacture"}
        className="mt-4"
      >
        {manufactureContent}
      </TabsContent>
      <TabsContent value="issue" forceMount hidden={activeTab !== "issue"} className="mt-4">
        {issueContent}
      </TabsContent>
      <TabsContent value="receive" forceMount hidden={activeTab !== "receive"} className="mt-4">
        {receiveContent}
      </TabsContent>
    </Tabs>
  );
}
