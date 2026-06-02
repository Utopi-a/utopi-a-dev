import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordStrengthPanel } from "@/features/auth/password-policy/password-strength-panel";

describe("PasswordStrengthPanel", () => {
  it("未入力時は要件の説明を表示", () => {
    render(<PasswordStrengthPanel password="" idPrefix="test" />);
    expect(screen.getByText(/8文字以上/)).toBeInTheDocument();
  });

  it("入力中は堅牢度と要件リストを表示", () => {
    render(<PasswordStrengthPanel password="Abcd1234" idPrefix="test" />);
    expect(screen.getByText("堅牢度")).toBeInTheDocument();
    expect(screen.getByText("英小文字（a–z）を含む")).toBeInTheDocument();
    expect(screen.getByText(/登録に必要な要件は満たしています/)).toBeInTheDocument();
  });

  it("弱いパスワードは必須未達の案内", () => {
    render(<PasswordStrengthPanel password="abc" idPrefix="test" />);
    expect(screen.getByText(/必須の要件をすべて満たす/)).toBeInTheDocument();
  });
});
