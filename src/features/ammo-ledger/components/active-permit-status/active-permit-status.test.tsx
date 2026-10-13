import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computePermitUsage } from "@/features/ammo-ledger/permit/compute-permit-usage/compute-permit-usage";
import { computeCurrentPermitBalance } from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import { ActivePermitStatus } from "./active-permit-status";

const createdAt = new Date("2026-01-01T00:00:00Z");

function buildPermit({
  id,
  grantedOn,
  expiresOn,
  name = `許可${id}`,
  ledgerPurpose = "shooting",
  quantity = 500,
}: {
  id: string;
  grantedOn: string;
  expiresOn: string;
  name?: string;
  ledgerPurpose?: string;
  quantity?: number;
}) {
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

const today = "2026-10-13";
const expired = buildPermit({ id: "expired", grantedOn: "2025-03-01", expiresOn: "2026-02-28" });
const active = buildPermit({ id: "active", grantedOn: "2026-03-01", expiresOn: "2027-02-28" });
const upcoming = buildPermit({ id: "upcoming", grantedOn: "2026-11-01", expiresOn: "2027-10-31" });
const noUsage = new Map<string, number>();

function acquire({
  id,
  occurredOn,
  quantity,
}: {
  id: string;
  occurredOn: string;
  quantity: number;
}) {
  return { id, occurredOn, category: "acquire" as const, quantity };
}

describe("ActivePermitStatus", () => {
  it("期限切れの許可は表示せず、使い切っていない有効な許可を表示する", () => {
    render(
      <ActivePermitStatus
        permits={[expired, active]}
        ledgerPurpose="shooting"
        permitBalance={300}
        usedQuantityByPermitId={new Map([["active", 200]])}
        today={today}
      />,
    );

    expect(screen.getByText(/許可active/)).toBeInTheDocument();
    expect(screen.queryByText(/許可expired/)).not.toBeInTheDocument();
    expect(screen.getByText(/有効な許可 1件/)).toBeInTheDocument();
  });

  it("数量を使い切った許可は表示せず、登録を案内する", () => {
    render(
      <ActivePermitStatus
        permits={[expired, active]}
        ledgerPurpose="shooting"
        permitBalance={0}
        usedQuantityByPermitId={new Map([["active", 500]])}
        today={today}
      />,
    );

    expect(screen.queryByText(/許可active/)).not.toBeInTheDocument();
    expect(screen.queryByText(/許可expired/)).not.toBeInTheDocument();
    expect(screen.getByText(/有効な許可 0件/)).toBeInTheDocument();
    expect(screen.getByText(/使える譲受許可はありません/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "譲受許可" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/permits",
    );
  });

  it("これから有効になる許可は、開始日つきで表示する", () => {
    render(
      <ActivePermitStatus
        permits={[active, upcoming]}
        ledgerPurpose="shooting"
        permitBalance={0}
        usedQuantityByPermitId={new Map([["active", 500]])}
        today={today}
      />,
    );

    expect(screen.queryByText(/許可active/)).not.toBeInTheDocument();
    expect(screen.getByText(/許可upcoming/)).toBeInTheDocument();
    expect(screen.getByText(/2026\/11\/01から有効/)).toBeInTheDocument();
    expect(screen.queryByText(/使える譲受許可はありません/)).not.toBeInTheDocument();
  });

  it("有効期限の当日は、使い切っていなければ「本日まで」として表示する", () => {
    const expiringToday = buildPermit({
      id: "expiring",
      grantedOn: "2025-10-14",
      expiresOn: today,
    });
    const ledgerEntries = [
      acquire({ id: "e1", occurredOn: "2026-05-01", quantity: 200 }),
      // 今日より後の日付で入力済みの譲受は、今日使える残数を減らさない
      acquire({ id: "e2", occurredOn: "2026-10-20", quantity: 300 }),
    ];

    render(
      <ActivePermitStatus
        permits={[expiringToday]}
        ledgerPurpose="shooting"
        permitBalance={computeCurrentPermitBalance({
          permitEvents: [
            { occurredOn: expiringToday.grantedOn, eventKind: "grant", quantity: 500 },
            { occurredOn: expiringToday.expiresOn, eventKind: "expiry", quantity: 0 },
          ],
          ledgerEntries,
          today,
        })}
        usedQuantityByPermitId={computePermitUsage({
          permits: [expiringToday],
          ledgerEntries,
          today,
        })}
        today={today}
      />,
    );

    expect(screen.getByText(/今日使える残り/).parentElement).toHaveTextContent(
      "今日使える残り 300",
    );
    expect(screen.getByText(/許可expiring/)).toBeInTheDocument();
    expect(screen.getByText(/本日まで/)).toBeInTheDocument();
    expect(screen.getByText(/有効な許可 1件/)).toBeInTheDocument();
  });

  it("期間が重なる旧許可の失効で用途の残数が0になっても、未使用の新許可は表示する", () => {
    const oldPermit = buildPermit({
      id: "old",
      grantedOn: "2026-01-01",
      expiresOn: "2026-10-12",
      quantity: 100,
    });
    const newPermit = buildPermit({ id: "new", grantedOn: "2026-10-11", expiresOn: "2027-10-10" });
    const permitBalance = computeCurrentPermitBalance({
      permitEvents: [
        { permitId: "old", occurredOn: "2026-01-01", eventKind: "grant", quantity: 100 },
        { permitId: "new", occurredOn: "2026-10-11", eventKind: "grant", quantity: 500 },
        { permitId: "old", occurredOn: "2026-10-12", eventKind: "expiry", quantity: 0 },
      ],
      ledgerEntries: [],
      today,
    });

    render(
      <ActivePermitStatus
        permits={[oldPermit, newPermit]}
        ledgerPurpose="shooting"
        permitBalance={permitBalance}
        usedQuantityByPermitId={computePermitUsage({
          permits: [oldPermit, newPermit],
          ledgerEntries: [],
          today,
        })}
        today={today}
      />,
    );

    expect(permitBalance).toBe(0);
    expect(screen.queryByText(/許可old/)).not.toBeInTheDocument();
    expect(screen.getByText(/許可new/)).toBeInTheDocument();
    expect(screen.queryByText(/使える譲受許可はありません/)).not.toBeInTheDocument();
  });

  it("使い切った旧許可は、期間が重なる新許可に残りがあっても表示しない", () => {
    const oldPermit = buildPermit({
      id: "old",
      grantedOn: "2026-01-01",
      expiresOn: "2026-12-31",
      quantity: 100,
    });
    const newPermit = buildPermit({ id: "new", grantedOn: "2026-06-01", expiresOn: "2027-05-31" });

    render(
      <ActivePermitStatus
        permits={[oldPermit, newPermit]}
        ledgerPurpose="shooting"
        permitBalance={500}
        usedQuantityByPermitId={computePermitUsage({
          permits: [oldPermit, newPermit],
          ledgerEntries: [acquire({ id: "e1", occurredOn: "2026-03-01", quantity: 100 })],
          today,
        })}
        today={today}
      />,
    );

    expect(screen.queryByText(/許可old/)).not.toBeInTheDocument();
    expect(screen.getByText(/許可new/)).toBeInTheDocument();
    expect(screen.getByText(/有効な許可 1件/)).toBeInTheDocument();
  });

  it("許可の詳細がなくても用途の残りがあれば、使える許可がないとは案内しない", () => {
    render(
      <ActivePermitStatus
        permits={[expired]}
        ledgerPurpose="shooting"
        permitBalance={100}
        usedQuantityByPermitId={noUsage}
        today={today}
      />,
    );

    expect(screen.getByText(/今日使える残り/).parentElement).toHaveTextContent(
      "今日使える残り 100",
    );
    expect(screen.queryByText(/使える譲受許可はありません/)).not.toBeInTheDocument();
  });

  it("別の用途の許可は表示しない", () => {
    render(
      <ActivePermitStatus
        permits={[active, { ...active, id: "hunting", ledgerPurpose: "hunting" }]}
        ledgerPurpose="shooting"
        permitBalance={300}
        usedQuantityByPermitId={noUsage}
        today={today}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("用途の許可が1件もなければ、未登録として案内する", () => {
    render(
      <ActivePermitStatus
        permits={[]}
        ledgerPurpose="shooting"
        permitBalance={0}
        usedQuantityByPermitId={noUsage}
        today={today}
      />,
    );

    expect(screen.getByText("譲受許可が未登録です")).toBeInTheDocument();
  });
});
