import { ThemeProvider } from "@/lib/theme/theme-provider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
