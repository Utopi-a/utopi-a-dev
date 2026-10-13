import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeStorageWarning } from "./home-storage-warning";

describe("HomeStorageWarning", () => {
  it("過去の超過は最後に超えた日を示し、超えても問題ないとは読めない案内にする", () => {
    render(<HomeStorageWarning currentStock={700} peakStock={900} lastExceededOn="2026-02-01" />);

    expect(
      screen.getByText(/目安（800個）を超えた時期があります（最後は 2026\/02\/01）。/),
    ).toBeVisible();
    expect(screen.getByText(/記録漏れがないか確認してください/)).toBeVisible();
    expect(screen.queryByText(/問題ありません/)).not.toBeInTheDocument();
  });
});
