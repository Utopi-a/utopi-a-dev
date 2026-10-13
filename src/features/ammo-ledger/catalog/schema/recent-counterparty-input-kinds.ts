import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";

/**
 * 「最近使った相手」を絞る記録区分。受け入れ（譲受・被交付）と払い出し（譲渡・交付）の相手を分け、
 * 購入先の既定値に譲渡先を、譲渡先の候補の先頭に購入先を出さない。
 */
export const inflowCounterpartyInputKinds: InputKind[] = ["acquire", "receive"];
export const outflowCounterpartyInputKinds: InputKind[] = ["transfer", "issue"];
