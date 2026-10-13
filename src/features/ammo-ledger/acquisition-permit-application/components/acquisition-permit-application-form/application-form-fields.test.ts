import { describe, expect, it } from "vitest";
import {
  findMissingApplicationFields,
  type RequiredApplicationFieldKey,
  requiredApplicationFields,
} from "./application-form-fields";

const filledValues = Object.fromEntries(
  Object.keys(requiredApplicationFields).map((key) => [key, "入力済み"]),
) as Record<RequiredApplicationFieldKey, string>;

describe("findMissingApplicationFields", () => {
  it("すべて揃っていれば不足はない", () => {
    expect(
      findMissingApplicationFields({
        values: filledValues,
        selectedGunCount: 1,
        hasCounterparty: true,
        planStatus: "ready",
      }),
    ).toEqual([]);
  });

  it("空白だけの欄も不足とし、画面の並び順で返す", () => {
    const missing = findMissingApplicationFields({
      values: { ...filledValues, storageLocation: "  ", ownerBirthDate: "" },
      selectedGunCount: 1,
      hasCounterparty: false,
      planStatus: "outdated",
    });
    expect(missing.map((field) => field.label)).toEqual([
      "生年月日",
      "貯蔵又は保管する場所",
      "譲渡者（購入先）",
      "消費計画（入力が変わったので作り直してください）",
    ]);
  });
});
