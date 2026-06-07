import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendAuthEmail } from "@/features/auth/send-auth-email/send-auth-email";
import { authSecretFixtures } from "@/features/auth/test-fixtures/auth-secret-fixtures";

describe("sendAuthEmail", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("Resend 未設定では fetch せず何もしない", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendAuthEmail({
      to: "user@example.com",
      subject: "件名",
      text: "本文に https://example.com/reset-password?token=secret を含む",
      html: "<p>本文</p>",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("Resend 設定時は API を呼ぶ", async () => {
    vi.stubEnv("RESEND_API_KEY", authSecretFixtures.resendApiKey);
    vi.stubEnv("RESEND_FROM_EMAIL", authSecretFixtures.resendFromEmail);
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => "",
    });

    await sendAuthEmail({
      to: "user@example.com",
      subject: "件名",
      text: "本文",
      html: "<p>本文</p>",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${authSecretFixtures.resendApiKey}`,
        }),
      }),
    );
  });

  it("Resend が失敗したら例外", async () => {
    vi.stubEnv("RESEND_API_KEY", authSecretFixtures.resendApiKey);
    vi.stubEnv("RESEND_FROM_EMAIL", "fixture@example.com");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "validation_error",
    });

    await expect(
      sendAuthEmail({
        to: "user@example.com",
        subject: "件名",
        text: "本文",
        html: "<p>本文</p>",
      }),
    ).rejects.toThrow(/Resend failed \(422\)/);
  });
});
