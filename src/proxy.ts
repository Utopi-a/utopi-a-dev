import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function isAmmoLedgerPwaPublicPath({ pathname }: { pathname: string }) {
  return (
    pathname === "/lab/ammo-ledger/manifest.webmanifest" || pathname === "/lab/ammo-ledger/~offline"
  );
}

function isProtectedPath({ pathname }: { pathname: string }) {
  return (
    pathname === "/lab/studio" ||
    pathname.startsWith("/lab/studio/") ||
    pathname === "/lab/blog/manage" ||
    pathname.startsWith("/lab/blog/manage/") ||
    pathname === "/lab/settings" ||
    pathname.startsWith("/lab/settings/") ||
    pathname === "/lab/ammo-ledger" ||
    pathname.startsWith("/lab/ammo-ledger/")
  );
}

function withPathnameHeader({ request }: { request: NextRequest }) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function proxy(request: NextRequest) {
  if (isAmmoLedgerPwaPublicPath({ pathname: request.nextUrl.pathname })) {
    return withPathnameHeader({ request });
  }

  if (!isProtectedPath({ pathname: request.nextUrl.pathname })) {
    return withPathnameHeader({ request });
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return withPathnameHeader({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/lab/studio",
    "/lab/studio/:path*",
    "/lab/blog/manage",
    "/lab/blog/manage/:path*",
    "/lab/settings",
    "/lab/settings/:path*",
    "/lab/ammo-ledger",
    "/lab/ammo-ledger/:path*",
  ],
};
