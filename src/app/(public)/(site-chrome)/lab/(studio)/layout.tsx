import { LabStudioShell } from "@/components/layout/lab-studio-shell";

export default function LabStudioLayout({ children }: { children: React.ReactNode }) {
  return <LabStudioShell className="flex-1">{children}</LabStudioShell>;
}
