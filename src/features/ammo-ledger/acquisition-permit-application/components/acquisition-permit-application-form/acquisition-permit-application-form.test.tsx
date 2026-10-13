import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
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

type FormProps = ComponentProps<typeof AcquisitionPermitApplicationForm>;

async function mountForm(profile: Partial<FormProps> = {}) {
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <AcquisitionPermitApplicationForm
        ownerName="テスト氏名"
        ownerAddress="テスト住所"
        totalHomeStock={755}
        ammoTypeStocks={[{ cartridgeType: "shotgun_shot", caliber: "12番", bookStock: 755 }]}
        guns={guns}
        {...profile}
      />
    </SWRConfig>,
  );
  await screen.findByText("テスト射撃場");
}

async function renderForm(profile: Partial<FormProps> = {}) {
  await mountForm(profile);
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

  it("印刷プレビューから入力に戻ると、入力・銃・購入先・射撃場の配分を復元する", async () => {
    await renderForm();
    fireEvent.change(screen.getByLabelText("ふりがな"), { target: { value: "てすと しめい" } });
    fireEvent.change(screen.getByLabelText("貯蔵又は保管する場所"), {
      target: { value: "ガンロッカー" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /テスト銃B/ }));
    fireEvent.change(screen.getByLabelText("配分の比率（2なら2倍）"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "消費計画を生成" }));
    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));

    cleanup();
    await mountForm();

    expect(screen.getByLabelText("ふりがな")).toHaveValue("てすと しめい");
    expect(screen.getByLabelText("貯蔵又は保管する場所")).toHaveValue("ガンロッカー");
    expect(screen.getByLabelText("申請数量（発）")).toHaveValue(500);
    expect(screen.getByRole("checkbox", { name: /テスト銃A/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /テスト銃B/ })).toBeChecked();
    expect(screen.getByLabelText("配分の比率（2なら2倍）")).toHaveValue(2);
    await waitFor(() =>
      expect(screen.getByLabelText("銃砲火薬店")).toHaveTextContent("テスト銃砲店"),
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it.each([
    ["申請数量（発）", "750"],
    ["現保有数量（発）", "100"],
    ["配分の比率（2なら2倍）", "2"],
  ])("計画を作った後に%sを変えると計画を破棄し、作り直すまで印刷へ進めない", async (label, value) => {
    await renderForm();
    fireEvent.click(screen.getByRole("button", { name: "消費計画を生成" }));
    expect(screen.getByRole("table")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "入力が変わったので計画を作り直してください",
    );
    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));
    expect(loadAcquisitionPermitApplicationPayload()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "消費計画を生成" }));
    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));
    const payload = loadAcquisitionPermitApplicationPayload();
    if (!payload) throw new Error("印刷用データが保存されていません");
    expect(payload.consumptionPlan.totalAcquisition).toBe(payload.requestedQuantity);
  });

  it("計画に注意が残っているときは、確認してから印刷へ進む", async () => {
    await mountForm();
    fireEvent.click(screen.getByRole("button", { name: "消費計画を生成" }));
    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));

    const dialog = screen.getByRole("dialog", { name: "消費計画に注意があります" });
    expect(dialog).toHaveTextContent("複数ページが必要です");
    fireEvent.click(within(dialog).getByRole("button", { name: "計画を見直す" }));
    expect(loadAcquisitionPermitApplicationPayload()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));
    fireEvent.click(screen.getByRole("button", { name: "このまま印刷へ進む" }));
    expect(loadAcquisitionPermitApplicationPayload()?.consumptionPlan.warnings).toContainEqual(
      expect.stringContaining("複数ページが必要です"),
    );
  });

  it("最初からやり直すと、下書きを消してプロフィールの内容と既定値に戻す", async () => {
    await renderForm({ ownerFurigana: "やまだ たろう" });
    fireEvent.change(screen.getByLabelText("ふりがな"), { target: { value: "やまだ じろう" } });

    fireEvent.click(screen.getByRole("button", { name: "最初からやり直す" }));
    const dialog = screen.getByRole("dialog", { name: "入力を最初からやり直しますか？" });
    fireEvent.click(within(dialog).getByRole("button", { name: "最初からやり直す" }));

    expect(screen.getByLabelText("ふりがな")).toHaveValue("やまだ たろう");
    expect(screen.getByLabelText("申請数量（発）")).toHaveValue(5000);
    cleanup();
    await mountForm({ ownerFurigana: "やまだ たろう" });
    expect(screen.getByLabelText("ふりがな")).toHaveValue("やまだ たろう");
  });

  it("火薬類の名称は、様式の実包欄に印字できる実包だけを選べる", async () => {
    await renderForm();
    const optionLabels = within(screen.getByLabelText("火薬類の名称"))
      .getAllByRole("option")
      .map((option) => option.textContent)
      .filter((label) => label !== "");
    expect(optionLabels).toEqual(["12番", "20番", "410番", "実包（ライフル）"]);
  });

  it("現保有数量は選んだ名称の弾種だけを合計し、手で直すまでは名称の変更に追随する", async () => {
    await renderForm({
      totalHomeStock: 600,
      ammoTypeStocks: [
        { cartridgeType: "shotgun_shot", caliber: "12番", bookStock: 300 },
        { cartridgeType: "shotgun_slug", caliber: "12番", bookStock: 100 },
        { cartridgeType: "rifle", caliber: ".308WIN", bookStock: 200 },
      ],
    });
    const homeStockInput = screen.getByLabelText("現保有数量（発）");
    expect(homeStockInput).toHaveValue(400);

    fireEvent.change(screen.getByLabelText("火薬類の名称"), {
      target: { value: "実包（ライフル）" },
    });
    expect(homeStockInput).toHaveValue(200);

    fireEvent.change(homeStockInput, { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText("火薬類の名称"), { target: { value: "20番" } });
    expect(homeStockInput).toHaveValue(150);
  });

  it("印刷する保有数量は名称の分だけにし、自宅保管の上限はほかの弾種も含めて計画する", async () => {
    await renderForm({
      totalHomeStock: 700,
      ammoTypeStocks: [
        { cartridgeType: "shotgun_shot", caliber: "12番", bookStock: 300 },
        { cartridgeType: "rifle", caliber: ".308WIN", bookStock: 400 },
      ],
    });
    expect(screen.getByText(/ほかの弾種の400発も含めます/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "消費計画を生成" }));
    fireEvent.click(screen.getByRole("button", { name: "印刷プレビューへ" }));

    const payload = loadAcquisitionPermitApplicationPayload();
    if (!payload) throw new Error("印刷用データが保存されていません");
    expect(buildApplicationFieldValues({ input: payload }).mainFields.currentHomeStock).toBe(
      "12番 300個",
    );
    expect(payload.consumptionPlan.peakHomeStock).toBeGreaterThanOrEqual(700);
    expect(payload.consumptionPlan.peakHomeStock).toBeLessThanOrEqual(800);
  });

  it("提出先はプロフィール住所の都道府県を初期値にする", async () => {
    await renderForm({ ownerAddress: "北海道札幌市中央区北1条西2丁目" });
    expect(screen.getByLabelText("提出先（公安委員会）")).toHaveValue("北海道");
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
