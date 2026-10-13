import { describe, expect, it } from "vitest";
import { resolvePermitStatus } from "./resolve-permit-status";

const period = { grantedOn: "2026-03-01", expiresOn: "2027-02-28" };

describe("resolvePermitStatus", () => {
  it("開始日より前は、残りに関係なく開始前", () => {
    expect(resolvePermitStatus({ ...period, remaining: 0, today: "2026-02-28" })).toBe("upcoming");
  });

  it("有効期間中で残りがあれば有効、なければ使い切り", () => {
    expect(resolvePermitStatus({ ...period, remaining: 1, today: "2026-03-01" })).toBe("active");
    expect(resolvePermitStatus({ ...period, remaining: 0, today: "2026-10-13" })).toBe("used_up");
  });

  it("有効期限の当日までは使え、翌日から期限切れ", () => {
    expect(resolvePermitStatus({ ...period, remaining: 100, today: "2027-02-28" })).toBe("active");
    expect(resolvePermitStatus({ ...period, remaining: 100, today: "2027-03-01" })).toBe("expired");
  });
});
