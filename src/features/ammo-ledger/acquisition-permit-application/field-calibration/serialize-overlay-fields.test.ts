import { describe, expect, it } from "vitest";
import { serializeOverlayFields } from "./serialize-overlay-fields";

describe("serializeOverlayFields", () => {
  it("OverlayFieldDef をテンプレート用 TS 断片に変換する", () => {
    const serialized = serializeOverlayFields({
      fields: [
        {
          id: "ownerName",
          page: 0,
          x: 62.99,
          y: 80.49,
          width: 125.68,
          fontSize: 3.36,
        },
        {
          id: "certificateTypeGunPossessionPermit",
          page: 0,
          x: 65.02,
          y: 183.88,
          width: 2.9,
          height: 2.9,
          fontSize: 2.4,
          align: "center",
          variant: "checkbox",
        },
      ],
    });

    expect(serialized).toContain('id: "ownerName"');
    expect(serialized).toContain("fontSize: 3.36");
    expect(serialized).toContain('variant: "checkbox"');
  });
});
