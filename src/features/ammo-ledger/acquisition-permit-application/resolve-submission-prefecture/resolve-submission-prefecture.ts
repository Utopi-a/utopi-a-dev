import { PREFECTURE_ORDER } from "@/features/ammo-ledger/catalog/prefecture-order/prefecture-order";

const fallbackSubmissionPrefecture = "茨城県";

/** 申請は住所地の公安委員会へ出すため、プロフィール住所の都道府県を提出先の初期値にする。 */
export function resolveSubmissionPrefecture({ ownerAddress }: { ownerAddress: string }): string {
  const address = ownerAddress.trim();
  return (
    PREFECTURE_ORDER.find((prefecture) => address.startsWith(prefecture)) ??
    fallbackSubmissionPrefecture
  );
}
