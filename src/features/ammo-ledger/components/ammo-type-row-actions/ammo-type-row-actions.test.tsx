import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoTypeRowActions } from "./ammo-type-row-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/ammo-ledger/master/delete-ammo-type/delete-ammo-type-action", () => ({
  deleteAmmoTypeAction: vi.fn(),
}));

describe("AmmoTypeRowActions", () => {
  it("帳簿で使用中の弾種は削除ボタンを押せず、理由を表示する", () => {
    render(<AmmoTypeRowActions ammoTypeId="type-1" isInUse />);

    expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();
    expect(screen.getByText("帳簿で使用中のため削除できません")).toBeInTheDocument();
  });

  it("使用されていない弾種は削除の確認へ進める", () => {
    render(<AmmoTypeRowActions ammoTypeId="type-1" isInUse={false} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByRole("dialog", { name: "弾種を削除しますか？" })).toBeInTheDocument();
    expect(screen.queryByText("帳簿で使用中のため削除できません")).not.toBeInTheDocument();
  });
});
