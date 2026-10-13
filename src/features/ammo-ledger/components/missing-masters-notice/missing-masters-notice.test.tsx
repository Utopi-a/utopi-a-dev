import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissingMastersNotice } from "./missing-masters-notice";

describe("MissingMastersNotice", () => {
  it("足りない登録を文で示し、項目ごとに今の画面へ戻れる設定ページへのリンクを出す", () => {
    render(
      <MissingMastersNotice
        action="消費を記録する"
        missing={["gun", "ammo-type"]}
        returnTo="/lab/ammo-ledger/consume/new"
      >
        射撃場は入力時に選べます。
      </MissingMastersNotice>,
    );

    expect(screen.getByText("消費を記録するには、銃と弾種の登録が必要です。")).toBeVisible();
    expect(screen.getByRole("link", { name: "銃を登録する" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/guns?returnTo=%2Flab%2Fammo-ledger%2Fconsume%2Fnew",
    );
    expect(screen.getByRole("link", { name: "弾種を登録する" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/ammo-types?returnTo=%2Flab%2Fammo-ledger%2Fconsume%2Fnew",
    );
    expect(screen.getByText("射撃場は入力時に選べます。")).toBeVisible();
  });

  it("足りないものだけを案内する", () => {
    render(
      <MissingMastersNotice
        action="譲り受けを記録する"
        missing={["permit"]}
        returnTo="/lab/ammo-ledger/inflow/new"
      />,
    );

    expect(screen.getByText("譲り受けを記録するには、譲受許可の登録が必要です。")).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "譲受許可を登録する" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/permits?returnTo=%2Flab%2Fammo-ledger%2Finflow%2Fnew",
    );
  });
});
