import { headers } from "next/headers";
import { SiteNavDesktop } from "@/components/layout/site-header/site-nav-desktop";
import { SiteNavMobileSheet } from "@/components/layout/site-header/site-nav-mobile-sheet";

export async function SiteNav() {
  const pathname = (await headers()).get("x-pathname") ?? "/";

  return (
    <>
      <SiteNavDesktop pathname={pathname} />
      <SiteNavMobileSheet pathname={pathname} />
    </>
  );
}
