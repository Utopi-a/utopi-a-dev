import { afterEach, describe, expect, it } from "vitest";
import { defaultCarryoverExpiresOn } from "./default-carryover-expires-on";

const originalTimeZone = process.env.TZ;

describe("defaultCarryoverExpiresOn", () => {
  afterEach(() => {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });

  it.each(["UTC", "Asia/Tokyo"])("端末が TZ=%s でも1月1日から1年後の前日を返す", (timeZone) => {
    process.env.TZ = timeZone;
    expect(defaultCarryoverExpiresOn({ year: 2027 })).toBe("2027-12-31");
  });
});
