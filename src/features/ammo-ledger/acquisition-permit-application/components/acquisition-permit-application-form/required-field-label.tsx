import { Label } from "@/components/ui/label";

// 入力欄側の required で読み上げられるため、見た目の印だけを足す。
export function RequiredMark() {
  return (
    <span
      aria-hidden
      className="rounded-sm bg-destructive/10 px-1 py-0.5 text-[10px] leading-none font-medium text-destructive"
    >
      必須
    </span>
  );
}

export function RequiredFieldLabel({ field }: { field: { id: string; label: string } }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={field.id}>{field.label}</Label>
      <RequiredMark />
    </div>
  );
}
