import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InflowRecordTabs } from "./inflow-record-tabs";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function Memo({ label }: { label: string }) {
  return <input aria-label={label} defaultValue="" />;
}

function selectTab(name: string) {
  const tab = screen.getByRole("tab", { name });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
}

describe("InflowRecordTabs", () => {
  it("タブを切り替えて戻っても、入力途中の値を保持する", () => {
    render(
      <InflowRecordTabs
        defaultTab="acquire"
        acquireContent={<Memo label="譲受の入力" />}
        disposeContent={<Memo label="廃棄の入力" />}
        transferContent={<Memo label="譲渡の入力" />}
        manufactureContent={<Memo label="製造の入力" />}
        issueContent={<Memo label="交付の入力" />}
        receiveContent={<Memo label="被交付の入力" />}
      />,
    );
    fireEvent.change(screen.getByLabelText("譲受の入力"), { target: { value: "50発" } });

    selectTab("廃棄");
    expect(screen.getByLabelText("廃棄の入力")).toBeVisible();
    expect(screen.getByLabelText("譲受の入力")).not.toBeVisible();

    selectTab("譲受");
    expect(screen.getByLabelText("譲受の入力")).toHaveValue("50発");
  });
});
