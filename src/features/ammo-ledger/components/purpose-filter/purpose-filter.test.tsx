import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PurposeFilter } from "./purpose-filter";

describe("PurposeFilter", () => {
  it("用途ごとの帳簿件数を表示する", () => {
    render(
      <PurposeFilter
        current="shooting"
        entryCounts={{ shooting: 0, hunting: 2, pest_control: 0 }}
        onPurposeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "射撃用 0件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "狩猟用 2件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "有害鳥獣駆除用 0件" })).toBeInTheDocument();
  });
});
