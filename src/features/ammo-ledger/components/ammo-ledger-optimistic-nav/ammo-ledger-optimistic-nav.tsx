"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

type AmmoLedgerOptimisticNavContextValue = {
  activePath: string | null;
  setActivePath: ({ path }: { path: string | null }) => void;
};

const AmmoLedgerOptimisticNavContext = createContext<AmmoLedgerOptimisticNavContextValue | null>(
  null,
);

export function AmmoLedgerOptimisticNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activePath, setActivePathState] = useState<string | null>(null);

  const setActivePath = useCallback(({ path }: { path: string | null }) => {
    setActivePathState(path);
  }, []);

  useEffect(() => {
    if (!activePath) {
      return;
    }

    if (pathname === activePath) {
      setActivePathState(null);
      return;
    }

    if (resolveShellRoute({ path: pathname }) === null) {
      if (typeof window !== "undefined" && window.location.pathname === pathname) {
        setActivePathState(null);
      }
      return;
    }

    if (typeof window !== "undefined" && window.location.pathname === activePath) {
      return;
    }

    setActivePathState(null);
  }, [pathname, activePath]);

  useEffect(() => {
    function handlePopState() {
      setActivePathState(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const value = useMemo(
    () => ({
      activePath,
      setActivePath,
    }),
    [activePath, setActivePath],
  );

  return (
    <AmmoLedgerOptimisticNavContext.Provider value={value}>
      {children}
    </AmmoLedgerOptimisticNavContext.Provider>
  );
}

export function useAmmoLedgerOptimisticNav() {
  const context = useContext(AmmoLedgerOptimisticNavContext);
  if (!context) {
    throw new Error(
      "useAmmoLedgerOptimisticNav must be used within AmmoLedgerOptimisticNavProvider",
    );
  }
  return context;
}
