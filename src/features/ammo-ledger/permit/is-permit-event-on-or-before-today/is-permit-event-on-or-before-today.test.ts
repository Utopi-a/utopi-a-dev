import { describe, expect, it } from "vitest";
import { isPermitEventOnOrBeforeToday } from "./is-permit-event-on-or-before-today";

describe("isPermitEventOnOrBeforeToday", () => {
  it("今日以前のイベントは true", () => {
    expect(isPermitEventOnOrBeforeToday({ occurredOn: "2026-06-07", today: "2026-06-07" })).toBe(
      true,
    );
    expect(isPermitEventOnOrBeforeToday({ occurredOn: "2026-01-01", today: "2026-06-07" })).toBe(
      true,
    );
  });

  it("未来のイベントは false", () => {
    expect(isPermitEventOnOrBeforeToday({ occurredOn: "2026-12-31", today: "2026-06-07" })).toBe(
      false,
    );
  });
});
