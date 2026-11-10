import { buildRootMetadata, rootViewport } from "@/features/portfolio/site-metadata";
import { SiteAnalytics } from "@/features/site-analytics/site-analytics";
import "./globals.css";

export const metadata = buildRootMetadata();
export const viewport = rootViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-background">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
