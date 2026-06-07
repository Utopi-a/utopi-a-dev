import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function DisposeNewPage({ searchParams }: PageProps) {
  const { draft } = await searchParams;
  const params = new URLSearchParams({ tab: "dispose" });
  if (draft) {
    params.set("draft", draft);
  }
  redirect(`/lab/ammo-ledger/inflow/new?${params.toString()}`);
}
