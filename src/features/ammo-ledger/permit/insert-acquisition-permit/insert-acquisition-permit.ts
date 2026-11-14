import { ammoAcquisitionPermit, ammoPermitEvent } from "@/db/schema/ammo-ledger";
import type { AmmoLedgerMutationTx } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import type { AcquisitionPermitKind } from "@/features/ammo-ledger/schema/acquisition-permit-kind";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

/** 許可と、残数計算に使う取得・失効のイベントを一緒に登録する */
export async function insertAcquisitionPermit({
  tx,
  userId,
  permit,
}: {
  tx: AmmoLedgerMutationTx;
  userId: string;
  permit: {
    kind: AcquisitionPermitKind;
    ledgerPurpose: LedgerPurpose;
    name: string;
    permitPurpose: string;
    grantedOn: string;
    expiresOn: string;
    quantity: number;
    memo?: string;
  };
}) {
  const permitId = crypto.randomUUID();

  await tx.insert(ammoAcquisitionPermit).values({
    id: permitId,
    userId,
    kind: permit.kind,
    ledgerPurpose: permit.ledgerPurpose,
    name: permit.name,
    permitPurpose: permit.permitPurpose,
    grantedOn: permit.grantedOn,
    expiresOn: permit.expiresOn,
    quantity: permit.quantity,
    memo: permit.memo ?? null,
  });

  await tx.insert(ammoPermitEvent).values({
    id: crypto.randomUUID(),
    userId,
    permitId,
    purpose: permit.ledgerPurpose,
    eventKind: "grant",
    occurredOn: permit.grantedOn,
    quantity: permit.quantity,
    memo: permit.memo ?? null,
  });

  await tx.insert(ammoPermitEvent).values({
    id: crypto.randomUUID(),
    userId,
    permitId,
    purpose: permit.ledgerPurpose,
    eventKind: "expiry",
    occurredOn: permit.expiresOn,
    quantity: 0,
    memo: "許可有効期限",
  });
}
