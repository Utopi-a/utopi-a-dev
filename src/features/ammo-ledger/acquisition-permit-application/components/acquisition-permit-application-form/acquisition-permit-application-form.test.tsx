import { fireEvent, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ammoGun } from "@/db/schema/ammo-ledger";
import { loadAcquisitionPermitApplicationPayload } from "../../application-session/application-session";
import { buildApplicationFieldValues } from "../../build-application-field-values/build-application-field-values";
import { AcquisitionPermitApplicationForm } from "./acquisition-permit-application-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock(
  "@/features/ammo-ledger/catalog/ensure-counterparty-from-catalog/ensure-counterparty-from-catalog",
  () => ({ ensureCounterpartyFromCatalog: vi.fn() }),
);
vi.mock(
  "@/features/ammo-ledger/catalog/ensure-range-from-catalog/ensure-range-from-catalog",
  () => ({ ensureRangeFromCatalog: vi.fn() }),
);
vi.mock(
  "@/features/ammo-ledger/catalog/toggle-catalog-favorite/toggle-catalog-favorite-action",
  () => ({ toggleCatalogFavoriteAction: vi.fn() }),
);

const guns: (typeof ammoGun.$inferSelect)[] = ["A", "B"].map((name) => ({
  id: name,
  userId: "test-user",
  name: `テスト銃${name}`,
  gunNumber: `gun-${name}`,
  permitNumber: `gun-permit-${name}`,
  gunType: "散弾銃",
  caliber: "12番",
  purpose: null,
  memo: null,
  createdAt: new Date("2026-09-10"),
  updatedAt: new Date("2026-09-10"),
}));

async function renderForm(
  profile: { ownerFurigana?: string; possessionPermitCertificateNumber?: string } = {},
) {
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <AcquisitionPermitApplicationForm
        ownerName="テスト氏名"
        ownerAddress="テスト住所"
        currentHomeStock={755}
        guns={guns}
        {...profile}
      />
    </SWRConfig>,
  );
  await screen.findByText("テスト射撃場");
  fireEvent.change(screen.getByLabelText("申請数量（発）"), { target: { value: "500" } });
}

describe("譲受許可申請の入力から印刷への引き継ぎ", () => {
  beforeEach(() => {
    sessionStorage.clear();
    // GET通信だけを置き換え、入力・計画生成・印刷への引き継ぎは実際の処理を通す。
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = new URL(input, "http://localhost");
        if (url.pathname !== "/api/ammo-ledger/picker") throw new Error("想定外の通信です");
        const catalogKind = url.searchParams.get("kind");
        return Response.json({
          favorites: [],
          recent: [],
          registered: [
            {
              id: catalogKind,
              name: catalogKind === "range" ? "テスト射撃場" : "テスト銃砲店",
              address: "テスト所在地",
              catalogId: null,
            },
          ],
          catalogByPrefecture: [],
          favoriteCatalogIds: [],
          registeredCatalogIds: [],
        });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("銃の選択を変えても所持許可証番号を維持し、755発の自然な消費計画と一緒に印刷へ渡す", async () => {
    await renderForm();
    const certificateInput = screen.getByLabelText("銃砲所持許可証の番号");
    expect(certificateInput).toHaveValue("");
    fireEvent.change(certificateInput, { target: { value: "00123456789" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /テスト銃B/ }));
    expect(certificateInput).toHaveValue("00123456789");
    fireEvent.click(screen.getByRole("checkbox", { name: /テスト銃A/ }));
    expect(certificateInput).toHaveValue("00123456789");

    fireEvent.click(screen.getByRole("button", { name: "消費計画を生成" }));
    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));

    const payload = loadAcquisitionPermitApplicationPayload();
    if (!payload) throw new Error("印刷用データが保存されていません");
    expect(payload.possessionPermitCertificateNumber).toBe("00123456789");
    expect(
      payload.consumptionPlan.rows.map((row) => row.acquisitionQuantity - row.consumptionQuantity),
    ).toEqual([-500, 500]);
    expect(payload.consumptionPlan.peakHomeStock).toBe(755);
    const fields = buildApplicationFieldValues({ input: payload });
    expect(fields.mainFields.permitCertificateNumber).toBe("00123456789");
    expect(fields.supplementRows.map((row) => row.values.period)).toEqual(
      payload.consumptionPlan.rows.map((row) => row.scheduledPeriod.period[0]),
    );
  });

  it("許可証番号が未入力なら、選択した銃の番号を印刷しない", async () => {
    await renderForm();
    fireEvent.click(screen.getByRole("button", { name: "消費計画を生成" }));
    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));

    const payload = loadAcquisitionPermitApplicationPayload();
    if (!payload) throw new Error("印刷用データが保存されていません");
    expect(buildApplicationFieldValues({ input: payload }).mainFields.permitCertificateNumber).toBe(
      "",
    );
  });

  it.each([
    false,
    true,
  ])("プロフィールを初期表示し、申請時の修正も書類に反映する（修正: %s）", async (edit) => {
    await renderForm({
      ownerFurigana: "やまだ たろう",
      possessionPermitCertificateNumber: "00123456789",
    });
    expect(screen.getByLabelText("ふりがな")).toHaveValue("やまだ たろう");
    expect(screen.getByLabelText("銃砲所持許可証の番号")).toHaveValue("00123456789");
    if (edit) {
      fireEvent.change(screen.getByLabelText("ふりがな"), { target: { value: "やまだ じろう" } });
      fireEvent.change(screen.getByLabelText("銃砲所持許可証の番号"), {
        target: { value: "00987654321" },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "消費計画を生成" }));
    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));
    const payload = loadAcquisitionPermitApplicationPayload();
    if (!payload) throw new Error("印刷用データが保存されていません");
    const fields = buildApplicationFieldValues({ input: payload });
    expect(fields.mainFields.ownerFurigana).toBe(edit ? "やまだ じろう" : "やまだ たろう");
    expect(fields.mainFields.permitCertificateNumber).toBe(edit ? "00987654321" : "00123456789");
  });
});
