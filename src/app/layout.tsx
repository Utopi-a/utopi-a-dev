import { buildRootMetadata, rootViewport } from "@/features/portfolio/site-metadata";
import { fontVariableClassName } from "@/lib/theme/fonts";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import "./globals.css";

export const metadata = buildRootMetadata();
export const viewport = rootViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${fontVariableClassName} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-background">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
