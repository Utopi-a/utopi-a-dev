import { describe, expect, it } from "vitest";
import {
  buildCameraTurn,
  hasFrameChanged,
} from "@/features/utopia-companion/camera/companion-scene";

describe("hasFrameChanged", () => {
  it("座ったままの揺れ程度の差は変わっていないとし、大きく変わったら変わったとする", () => {
    const previous = new Uint8Array(192).fill(100);
    expect(hasFrameChanged({ previous, current: new Uint8Array(192).fill(104) })).toBe(false);
    expect(hasFrameChanged({ previous, current: new Uint8Array(192).fill(130) })).toBe(true);
  });

  it("比べる前の映像がなければ変わったとする", () => {
    expect(hasFrameChanged({ previous: null, current: new Uint8Array(192) })).toBe(true);
  });
});

describe("buildCameraTurn", () => {
  const image = {
    dataUrl: "data:image/jpeg;base64,AAA",
    name: "camera.jpg",
    mimeType: "image/jpeg",
  };

  it("相手の発言に映像を添え、映っている人は相手本人だと伝える。記憶には発言だけ残す", () => {
    expect(buildCameraTurn({ frame: image.dataUrl, text: "後ろに何がある？" })).toEqual({
      userText: expect.stringMatching(/^後ろに何がある？\n\n（添えた画像は、いまの相手のカメラ/),
      historyText: "後ろに何がある？",
      images: [image],
    });
  });

  it("発言がなければ見えたものについて話しかけさせ、記憶にはカメラを見たとだけ残す", () => {
    expect(buildCameraTurn({ frame: image.dataUrl })).toEqual({
      userText: expect.stringMatching(/^見えたものについて[\s\S]*映っている人はたぶん相手本人/),
      historyText: "（カメラを見た）",
      images: [image],
    });
  });
});
