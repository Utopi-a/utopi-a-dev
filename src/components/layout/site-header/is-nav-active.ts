export function isNavActive({ pathname, href }: { pathname: string; href: string }) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}
