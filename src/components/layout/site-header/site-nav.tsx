"use client";

import { MenuIcon } from "lucide-react";
import Image from "next/image";
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
import { contactLink, publicNavItems } from "@/features/portfolio/site-config";
import { cn } from "@/lib/cn";

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "text-sm transition-colors",
        isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  return (
    <>
      <nav className="hidden items-center gap-6 md:flex" aria-label="メイン">
        {publicNavItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
        <a
          href={contactLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {contactLink.label}
        </a>
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
          <nav className="mt-8 flex flex-col gap-6" aria-label="モバイル">
            {publicNavItems.map((item) => (
              <SheetClose key={item.href} asChild>
                <NavLink href={item.href} label={item.label} />
              </SheetClose>
            ))}
            <SheetClose asChild>
              <a
                href={contactLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Image src="/XIcon.png" alt="" width={20} height={20} className="size-5" />
                {contactLink.label}
              </a>
            </SheetClose>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
