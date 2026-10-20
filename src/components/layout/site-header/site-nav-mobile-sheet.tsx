"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { isNavActive } from "@/components/layout/site-header/is-nav-active";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { publicNavItems } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

type SiteNavMobileSheetProps = {
  pathname: string;
};

export function SiteNavMobileSheet({ pathname }: SiteNavMobileSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" aria-label="メニューを開く" className="-mr-2">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      {/* シートは body 直下へポータルされ、レイアウトのフォント指定を継承しないため個別に付ける */}
      <SheetContent side="right" className="flex w-[min(100%,20rem)] flex-col gap-0 p-0 font-serif">
        <SheetHeader className="sr-only">
          <SheetTitle>メニュー</SheetTitle>
          <SheetDescription>サイト内のページへ移動</SheetDescription>
        </SheetHeader>

        <nav className="flex flex-1 flex-col px-4 pt-16" aria-label="モバイル">
          {publicNavItems.map((item) => {
            const active = isNavActive({ pathname, href: item.href });

            return (
              <SheetClose key={item.href} asChild>
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2 py-2.5 text-2xl tracking-wide transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <SheetFooter className="mt-auto p-0">
          <div className="flex w-full items-center justify-between gap-4 border-t border-border px-6 py-5">
            <SocialLinks />
            <ThemeToggle />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
