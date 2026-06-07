import { headers } from "next/headers";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";

function isAmmoLedgerPath({ pathname }: { pathname: string }) {
  return pathname.startsWith("/lab/ammo-ledger");
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAmmoLedger = isAmmoLedgerPath({ pathname });

  return (
    <>
      {isAmmoLedger ? null : <SiteHeader />}
      <main
        className={isAmmoLedger ? "flex h-dvh min-h-0 flex-col" : "flex min-h-0 flex-1 flex-col"}
      >
        {children}
      </main>
      {isAmmoLedger ? null : <SiteFooter />}
      <Toaster />
    </>
  );
}
