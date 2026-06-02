import { LabStudioShell } from "@/components/layout/lab-studio-shell";

export default function LabStudioLayout({ children }: { children: React.ReactNode }) {
  return <LabStudioShell>{children}</LabStudioShell>;
}
