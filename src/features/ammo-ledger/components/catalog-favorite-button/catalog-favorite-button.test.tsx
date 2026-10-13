import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toggleCatalogFavoriteAction } from "@/features/ammo-ledger/catalog/toggle-catalog-favorite/toggle-catalog-favorite-action";
import { CatalogFavoriteButton } from "./catalog-favorite-button";

vi.mock(
  "@/features/ammo-ledger/catalog/toggle-catalog-favorite/toggle-catalog-favorite-action",
  () => ({ toggleCatalogFavoriteAction: vi.fn() }),
);

describe("CatalogFavoriteButton", () => {
  it("名前は行の名称で固定し、お気に入りかどうかは押下状態で伝える", async () => {
    vi.mocked(toggleCatalogFavoriteAction).mockResolvedValue({ ok: true, isFavorite: true });
    const user = userEvent.setup();
    render(
      <CatalogFavoriteButton
        catalogKind="range"
        catalogId="range-1"
        name="千葉射撃場"
        isFavorite={false}
      />,
    );

    const button = screen.getByRole("button", { name: "千葉射撃場をお気に入り" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "千葉射撃場をお気に入り" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });
});
