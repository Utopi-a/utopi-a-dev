import { describe, expect, it } from "vitest";
import { hasActiveAcquisitionPermit } from "./has-active-acquisition-permit";

const permits = [
  {
    ledgerPurpose: "hunting",
    grantedOn: "2026-01-01",
    expiresOn: "2026-02-15",
  },
  {
    ledgerPurpose: "shooting",
    grantedOn: "2026-01-01",
    expiresOn: "2026-12-15",
  },
];

describe("hasActiveAcquisitionPermit", () => {
  it("譲受日に有効な同じ用途の許可があればtrueを返す", () => {
    expect(
      hasActiveAcquisitionPermit({
        permits,
        purpose: "shooting",
        occurredOn: "2026-08-08",
      }),
    ).toBe(true);
  });

  it("同じ用途の許可が失効済みならfalseを返す", () => {
    expect(
      hasActiveAcquisitionPermit({
        permits,
        purpose: "hunting",
        occurredOn: "2026-08-08",
      }),
    ).toBe(false);
  });

  it("許可の開始日と満了日は有効期間に含める", () => {
    expect(
      hasActiveAcquisitionPermit({
        permits,
        purpose: "hunting",
        occurredOn: "2026-01-01",
      }),
    ).toBe(true);
    expect(
      hasActiveAcquisitionPermit({
        permits,
        purpose: "hunting",
        occurredOn: "2026-02-15",
      }),
    ).toBe(true);
  });
});
