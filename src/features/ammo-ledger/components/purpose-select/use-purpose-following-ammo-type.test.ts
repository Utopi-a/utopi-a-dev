import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePurposeFollowingAmmoType } from "./use-purpose-following-ammo-type";

const ammoTypes = [
  { id: "ammo-shooting", defaultPurpose: "shooting" },
  { id: "ammo-hunting", defaultPurpose: "hunting" },
  { id: "ammo-unset", defaultPurpose: null },
];

describe("usePurposeFollowingAmmoType", () => {
  it("用途を選ぶ前は、選んだ弾の既定用途にそろえる（既定用途がなければ射撃用）", () => {
    const { result } = renderHook(() =>
      usePurposeFollowingAmmoType({ ammoTypes, keepsPurpose: false }),
    );

    act(() => {
      result.current.selectAmmoType("ammo-hunting");
    });
    expect(result.current.purpose).toBe("hunting");

    act(() => {
      result.current.selectAmmoType("ammo-unset");
    });
    expect(result.current.purpose).toBe("shooting");
    expect(result.current.ammoTypeId).toBe("ammo-unset");
  });

  it("用途を選んだ後は、弾を選び直しても用途を変えない", () => {
    const { result } = renderHook(() =>
      usePurposeFollowingAmmoType({ ammoTypes, keepsPurpose: false }),
    );

    act(() => result.current.choosePurpose("hunting"));
    act(() => {
      result.current.selectAmmoType("ammo-shooting");
    });

    expect(result.current.purpose).toBe("hunting");
    expect(result.current.ammoTypeId).toBe("ammo-shooting");
  });

  it("既存の記録の編集では、弾を選び直しても元の用途を保つ", () => {
    const { result } = renderHook(() =>
      usePurposeFollowingAmmoType({
        ammoTypes,
        initialAmmoTypeId: "ammo-shooting",
        initialPurpose: "pest_control",
        keepsPurpose: true,
      }),
    );

    act(() => {
      result.current.selectAmmoType("ammo-hunting");
    });

    expect(result.current.purpose).toBe("pest_control");
  });
});
