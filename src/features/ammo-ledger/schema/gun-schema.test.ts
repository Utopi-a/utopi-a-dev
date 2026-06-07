import { describe, expect, it } from "vitest";
import { gunSchema } from "./gun-schema";

describe("gunSchema", () => {
  it("有効な入力を受け付ける", () => {
    const result = gunSchema.safeParse({
      name: "DT11",
      permitNumber: "茨城県公安委員会 第12345号",
      gunType: "散弾銃",
      caliber: "12番",
    });
    expect(result.success).toBe(true);
  });

  it("許可番号が空なら拒否する", () => {
    const result = gunSchema.safeParse({
      name: "DT11",
      permitNumber: "",
      gunType: "散弾銃",
      caliber: "12番",
    });
    expect(result.success).toBe(false);
  });
});
