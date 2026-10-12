"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

type MasterListItemContextValue = {
  setHidden: (hidden: boolean) => void;
};

const MasterListItemContext = createContext<MasterListItemContextValue | null>(null);

/** 削除を確認した行を、サーバーの一覧更新を待たずに隠すための行。 */
export function MasterListItem({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ setHidden }), []);

  return (
    <MasterListItemContext.Provider value={value}>
      <li hidden={hidden} className={className}>
        {children}
      </li>
    </MasterListItemContext.Provider>
  );
}

export function useMasterListItem() {
  return useContext(MasterListItemContext);
}
