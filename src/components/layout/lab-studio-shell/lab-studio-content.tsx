"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function isCatalogPath({ pathname }: { pathname: string }) {
  return pathname.includes("/catalog");
}

type LabStudioContentProps = {
  children: ReactNode;
};

export function LabStudioContent({ children }: LabStudioContentProps) {
  const pathname = usePathname();
  const isCatalog = isCatalogPath({ pathname });

  return (
    <div className={cn("flex flex-col", !isCatalog && "min-h-0 flex-1 overflow-hidden")}>
      {children}
    </div>
  );
}
