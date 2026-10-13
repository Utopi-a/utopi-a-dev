import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GunForm } from "./gun-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/ammo-ledger/master/create-gun/create-gun-action", () => ({
  createGunAction: vi.fn(),
}));
vi.mock("@/features/ammo-ledger/master/update-gun/update-gun-action", () => ({
  updateGunAction: vi.fn(),
}));

function listSuggestions({ input }: { input: HTMLElement }): string[] {
  const listId = input.getAttribute("list");
  const datalist = listId ? document.getElementById(listId) : null;
  return Array.from(datalist?.querySelectorAll("option") ?? []).map((option) => option.value);
}

describe("GunForm", () => {
  it("許可番号は「第」「号」を除いて入力するよう案内する", () => {
    render(<GunForm />);

    expect(screen.getByLabelText("許可番号")).toHaveAccessibleDescription(
      /「第」「号」を除いた番号だけ/,
    );
  });

  it("銃種と番径は候補から選べる", () => {
    render(<GunForm />);

    expect(listSuggestions({ input: screen.getByLabelText("銃種") })).toEqual([
      "散弾銃",
      "ライフル銃",
      "空気銃",
    ]);
    expect(listSuggestions({ input: screen.getByLabelText("番径") })).toEqual([
      "12番",
      "20番",
      "410番",
    ]);
  });
});
