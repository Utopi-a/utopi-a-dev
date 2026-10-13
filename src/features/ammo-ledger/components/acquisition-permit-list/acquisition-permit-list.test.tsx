import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import { AcquisitionPermitList } from "./acquisition-permit-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock(
  "@/features/ammo-ledger/permit/delete-acquisition-permit/delete-acquisition-permit-action",
  () => ({ deleteAcquisitionPermitAction: vi.fn() }),
);

const createdAt = new Date("2026-01-01T00:00:00Z");
const today = "2026-10-13";

type Permit = typeof ammoAcquisitionPermit.$inferSelect;
type PermitEvent = typeof ammoPermitEvent.$inferSelect;
type LedgerEntry = typeof ammoLedgerEntry.$inferSelect;

function buildPermit({
  id,
  name,
  grantedOn,
  expiresOn,
  quantity,
  ledgerPurpose = "shooting",
}: Pick<Permit, "id" | "name" | "grantedOn" | "expiresOn" | "quantity"> & {
  ledgerPurpose?: string;
}): Permit {
  return {
    id,
    userId: "user-1",
    ledgerPurpose,
    name,
    permitPurpose: "標的射撃",
    grantedOn,
    expiresOn,
    quantity,
    memo: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildPermitEvent({
  permit,
  eventKind,
  occurredOn,
  quantity,
}: {
  permit: Permit;
  eventKind: string;
  occurredOn: string;
  quantity: number;
}): PermitEvent {
  return {
    id: `${permit.id}-${eventKind}`,
    userId: "user-1",
    permitId: permit.id,
    purpose: permit.ledgerPurpose,
    eventKind,
    occurredOn,
    quantity,
    memo: null,
    createdAt,
    updatedAt: createdAt,
  };
}

// 許可の登録時と年初繰越の保存時に作られるイベント
function buildEventsFor({
  permit,
  openKind = "grant",
}: {
  permit: Permit;
  openKind?: "grant" | "carryover";
}): PermitEvent[] {
  return [
    buildPermitEvent({
      permit,
      eventKind: openKind,
      occurredOn: permit.grantedOn,
      quantity: permit.quantity,
    }),
    buildPermitEvent({ permit, eventKind: "expiry", occurredOn: permit.expiresOn, quantity: 0 }),
  ];
}

function acquire({
  id,
  occurredOn,
  quantity,
}: {
  id: string;
  occurredOn: string;
  quantity: number;
}): LedgerEntry {
  // 許可残数の計算に使う列だけ意味のある値にする
  return {
    id,
    occurredOn,
    quantity,
    category: "acquire",
    purpose: "shooting",
    dayOrder: 0,
    createdAt,
  } as LedgerEntry;
}

const expired = buildPermit({
  id: "expired",
  name: "昨年の許可",
  grantedOn: "2025-03-01",
  expiresOn: "2026-02-28",
  quantity: 500,
});
const carryover = buildPermit({
  id: "carryover",
  name: "繰越の許可",
  grantedOn: "2026-01-01",
  expiresOn: "2026-12-31",
  quantity: 200,
});
const hunting = buildPermit({
  id: "hunting",
  name: "狩猟の許可",
  grantedOn: "2026-01-15",
  expiresOn: "2026-11-30",
  quantity: 100,
  ledgerPurpose: "hunting",
});
const active = buildPermit({
  id: "active",
  name: "今年の許可",
  grantedOn: "2026-03-01",
  expiresOn: "2027-02-28",
  quantity: 500,
});
const upcoming = buildPermit({
  id: "upcoming",
  name: "次の許可",
  grantedOn: "2026-11-01",
  expiresOn: "2027-10-31",
  quantity: 400,
});

function renderList() {
  render(
    <AcquisitionPermitList
      permits={[expired, carryover, hunting, active, upcoming]}
      permitEvents={[
        ...buildEventsFor({ permit: expired }),
        ...buildEventsFor({ permit: carryover, openKind: "carryover" }),
        ...buildEventsFor({ permit: hunting }),
        ...buildEventsFor({ permit: active }),
        ...buildEventsFor({ permit: upcoming }),
      ]}
      ledgerEntries={[
        // 昨年の許可（期限 2/28）から差し引く
        acquire({ id: "e1", occurredOn: "2026-02-01", quantity: 200 }),
        // 期限の早い繰越の許可を使い切り、残りを今年の許可から差し引く
        acquire({ id: "e2", occurredOn: "2026-05-01", quantity: 400 }),
      ]}
      today={today}
    />,
  );
}

function findPermitRow({ name }: { name: string }) {
  const row = screen.getByText(new RegExp(name)).closest("li");
  if (!row) {
    throw new Error(`${name}の行が見つかりません`);
  }
  return row;
}

describe("AcquisitionPermitList", () => {
  it("有効な許可は用途ごとに差し引いた今日の残りを出す", () => {
    renderList();

    expect(findPermitRow({ name: "今年の許可" })).toHaveTextContent("残り 300個");
    // 射撃用の譲受は、有効期限の早い狩猟用の許可からは差し引かない
    expect(findPermitRow({ name: "狩猟の許可" })).toHaveTextContent("残り 100個");
    expect(findPermitRow({ name: "次の許可" })).toHaveTextContent("開始前");
  });

  it("有効 → 開始前の順に並べ、終了した許可は折りたたんで状態を出す", () => {
    renderList();

    const visibleRows = screen
      .getAllByRole("listitem")
      .filter((row) => row.closest("details") === null);
    expect(visibleRows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("狩猟の許可"),
      expect.stringContaining("今年の許可"),
      expect.stringContaining("次の許可"),
    ]);

    expect(screen.getByText("終了した許可（期限切れ・使い切り 2件）")).toBeVisible();
    const usedUpRow = findPermitRow({ name: "繰越の許可" });
    const expiredRow = findPermitRow({ name: "昨年の許可" });
    expect(usedUpRow).toHaveTextContent("使い切り");
    expect(expiredRow).toHaveTextContent("期限切れ");
    expect(usedUpRow).not.toBeVisible();
    expect(expiredRow).not.toBeVisible();
  });

  it("年初繰越から作った許可にだけ年初繰越の印を付ける", () => {
    renderList();

    expect(findPermitRow({ name: "繰越の許可" })).toHaveTextContent("年初繰越");
    expect(findPermitRow({ name: "今年の許可" })).not.toHaveTextContent("年初繰越");
  });

  it("許可が1件もなければ未登録と表示する", () => {
    render(
      <AcquisitionPermitList permits={[]} permitEvents={[]} ledgerEntries={[]} today={today} />,
    );

    expect(screen.getByText("まだ登録がありません。")).toBeInTheDocument();
  });
});
