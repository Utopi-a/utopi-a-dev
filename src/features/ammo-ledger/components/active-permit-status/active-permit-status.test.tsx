import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivePermitStatus } from "./active-permit-status";

const createdAt = new Date("2026-01-01T00:00:00Z");

function buildPermit({
  id,
  grantedOn,
  expiresOn,
  name = `許可${id}`,
  ledgerPurpose = "shooting",
}: {
  id: string;
  grantedOn: string;
  expiresOn: string;
  name?: string;
  ledgerPurpose?: string;
}) {
  return {
    id,
    userId: "user-1",
    ledgerPurpose,
    name,
    permitPurpose: "標的射撃",
    grantedOn,
    expiresOn,
    quantity: 500,
    memo: null,
    createdAt,
    updatedAt: createdAt,
  };
}

const today = "2026-10-13";
const expired = buildPermit({ id: "expired", grantedOn: "2025-03-01", expiresOn: "2026-02-28" });
const active = buildPermit({ id: "active", grantedOn: "2026-03-01", expiresOn: "2027-02-28" });
const upcoming = buildPermit({ id: "upcoming", grantedOn: "2026-11-01", expiresOn: "2027-10-31" });

describe("ActivePermitStatus", () => {
  it("期限切れの許可は表示せず、残数のある有効な許可だけを表示する", () => {
    render(
      <ActivePermitStatus
        permits={[expired, active]}
        ledgerPurpose="shooting"
        permitBalance={300}
        today={today}
      />,
    );

    expect(screen.getByText(/許可active/)).toBeInTheDocument();
    expect(screen.queryByText(/許可expired/)).not.toBeInTheDocument();
    expect(screen.getByText(/有効な許可 1件/)).toBeInTheDocument();
  });

  it("許可残数を使い切ったら、有効期間内の許可も表示せず登録を案内する", () => {
    render(
      <ActivePermitStatus
        permits={[expired, active]}
        ledgerPurpose="shooting"
        permitBalance={0}
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

  it("これから有効になる許可は、残数を使い切っていても開始日つきで表示する", () => {
    render(
      <ActivePermitStatus
        permits={[active, upcoming]}
        ledgerPurpose="shooting"
        permitBalance={0}
        today={today}
      />,
    );

    expect(screen.queryByText(/許可active/)).not.toBeInTheDocument();
    expect(screen.getByText(/許可upcoming/)).toBeInTheDocument();
    expect(screen.getByText(/2026\/11\/01から有効/)).toBeInTheDocument();
    expect(screen.queryByText(/使える譲受許可はありません/)).not.toBeInTheDocument();
  });

  it("別の用途の許可は表示しない", () => {
    render(
      <ActivePermitStatus
        permits={[active, { ...active, id: "hunting", ledgerPurpose: "hunting" }]}
        ledgerPurpose="shooting"
        permitBalance={300}
        today={today}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("用途の許可が1件もなければ、未登録として案内する", () => {
    render(
      <ActivePermitStatus permits={[]} ledgerPurpose="shooting" permitBalance={0} today={today} />,
    );

    expect(screen.getByText("譲受許可が未登録です")).toBeInTheDocument();
  });
});
