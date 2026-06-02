"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { publicNavItems } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";
import { cn } from "@/lib/cn";

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  return (
    <>
      <nav className="hidden items-center gap-0.5 md:flex" aria-label="メイン">
        {publicNavItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>

      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="outline" size="icon" aria-label="メニューを開く">
            <MenuIcon className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(100%,20rem)]">
          <SheetHeader>
            <SheetTitle className="text-left">メニュー</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1" aria-label="モバイル">
            {publicNavItems.map((item) => (
              <SheetClose key={item.href} asChild>
                <NavLink href={item.href} label={item.label} />
              </SheetClose>
            ))}
          </nav>
          <div className="mt-8 border-t border-border/60 pt-6">
            <SocialLinks size="sm" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
