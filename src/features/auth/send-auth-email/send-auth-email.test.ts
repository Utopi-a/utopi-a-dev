import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendAuthEmail } from "@/features/auth/send-auth-email/send-auth-email";

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

  it("Resend 未設定かつ development では fetch せずログのみ", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendAuthEmail({
      to: "user@example.com",
      subject: "件名",
      text: "本文",
      html: "<p>本文</p>",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("Resend 設定時は API を呼ぶ", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "App <from@example.com>");
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
          Authorization: "Bearer re_test",
        }),
      }),
    );
  });

  it("Resend が失敗したら例外", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "from@example.com");
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
