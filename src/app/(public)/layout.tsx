import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <Toaster />
    </>
  );
}
