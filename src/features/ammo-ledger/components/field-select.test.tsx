import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldSelect } from "./field-select";

const purposeOptions = [
  { value: "shooting", label: "射撃用" },
  { value: "hunting", label: "狩猟用" },
];

function listOptionValues() {
  return within(screen.getByLabelText("用途区分"))
    .getAllByRole("option")
    .map((option) => (option as HTMLOptionElement).value);
}

describe("FieldSelect", () => {
  it("案内文のない必須の選択では空欄を選べない", () => {
    render(
      <FieldSelect
        id="purpose"
        label="用途区分"
        value="shooting"
        onChange={() => {}}
        options={purposeOptions}
        required
        placeholder=""
      />,
    );

    expect(listOptionValues()).toEqual(["shooting", "hunting"]);
  });

  it("案内文があれば未選択の空欄を出す", () => {
    render(
      <FieldSelect
        id="purpose"
        label="用途区分"
        value=""
        onChange={() => {}}
        options={purposeOptions}
        required
      />,
    );

    expect(listOptionValues()).toEqual(["", "shooting", "hunting"]);
    expect(screen.getByRole("option", { name: "選択してください" })).toBeInTheDocument();
  });

  it("値がどの選択肢にも当たらないときは、別の選択肢が選ばれて見えないよう空欄を残す", () => {
    render(
      <FieldSelect
        id="purpose"
        label="用途区分"
        value="legacy"
        onChange={() => {}}
        options={purposeOptions}
        required
        placeholder=""
      />,
    );

    expect(listOptionValues()).toEqual(["", "shooting", "hunting"]);
    expect(screen.getByLabelText("用途区分")).toHaveValue("");
  });
});
