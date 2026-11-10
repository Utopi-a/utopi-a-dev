import { describe, expect, it } from "vitest";
import {
  exposureValues,
  formatCameraName,
  photoExifSummary,
  spokenExposureValues,
} from "./photo-exif-text";

function texts({ exif }: { exif: Parameters<typeof exposureValues>[0]["exif"] }) {
  return exposureValues({ exif }).map(({ text }) => text);
}

describe("formatCameraName", () => {
  it.each([
    { make: "Canon", model: "Canon EOS R6", expected: "Canon EOS R6" },
    { make: "NIKON CORPORATION", model: "NIKON Z 6_2", expected: "NIKON Z 6_2" },
    { make: "OLYMPUS CORPORATION", model: "olympus e-m1", expected: "olympus e-m1" },
    { make: "Apple", model: "iPhone 15 Pro", expected: "Apple iPhone 15 Pro" },
    { make: "FUJIFILM", model: "X-T5", expected: "FUJIFILM X-T5" },
  ])("$make + $model → $expected", ({ make, model, expected }) => {
    expect(formatCameraName({ exif: { cameraMake: make, cameraModel: model } })).toBe(expected);
  });

  it("片方だけならそれだけ、どちらも無ければ null", () => {
    expect(formatCameraName({ exif: { cameraModel: "X-T5" } })).toBe("X-T5");
    expect(formatCameraName({ exif: { cameraMake: "FUJIFILM" } })).toBe("FUJIFILM");
    expect(formatCameraName({ exif: { iso: 100 } })).toBeNull();
  });
});

describe("exposureValues", () => {
  it("焦点距離 → 絞り → シャッター速度 → ISO → 露出補正 の順に並べる", () => {
    expect(
      texts({
        exif: {
          exposureCompensation: 0.7,
          iso: 160,
          exposureTime: 0.004,
          aperture: 1.8,
          focalLength: 35,
        },
      }),
    ).toEqual(["35mm", "f/1.8", "1/250s", "ISO 160", "+0.7 EV"]);
  });

  it("無い項目は詰める", () => {
    expect(texts({ exif: { aperture: 8, iso: 100 } })).toEqual(["f/8", "ISO 100"]);
    expect(texts({ exif: { cameraModel: "X-T5" } })).toEqual([]);
  });

  it("焦点距離は 10mm 未満だけ小数 1 桁にし、換算値が 1mm 以上違えば添える", () => {
    expect(texts({ exif: { focalLength: 6.86, focalLength35mm: 24 } })).toEqual([
      "6.9mm（換算 24mm）",
    ]);
    expect(texts({ exif: { focalLength: 34.6, focalLength35mm: 35 } })).toEqual(["35mm"]);
    expect(texts({ exif: { focalLength: 23, focalLength35mm: 35 } })).toEqual([
      "23mm（換算 35mm）",
    ]);
    expect(texts({ exif: { focalLength35mm: 26 } })).toEqual(["換算 26mm"]);
  });

  it("絞りは整数なら小数を付けない", () => {
    expect(texts({ exif: { aperture: 8 } })).toEqual(["f/8"]);
    expect(texts({ exif: { aperture: 1.7999 } })).toEqual(["f/1.8"]);
  });

  it.each([
    { seconds: 2, expected: "2s" },
    { seconds: 1.3, expected: "1.3s" },
    { seconds: 1, expected: "1s" },
    { seconds: 0.5, expected: "0.5s" },
    { seconds: 0.4, expected: "0.4s" },
    { seconds: 0.25, expected: "1/4s" },
    { seconds: 1 / 250, expected: "1/250s" },
    { seconds: 1 / 8000, expected: "1/8000s" },
  ])("シャッター速度 $seconds 秒は $expected", ({ seconds, expected }) => {
    expect(texts({ exif: { exposureTime: seconds } })).toEqual([expected]);
  });

  it("露出補正は 0 のとき出さず、小数 1 桁に丸めて正には + を付ける", () => {
    expect(texts({ exif: { exposureCompensation: 0 } })).toEqual([]);
    expect(texts({ exif: { exposureCompensation: 0.02 } })).toEqual([]);
    expect(texts({ exif: { exposureCompensation: -1 } })).toEqual(["-1 EV"]);
    expect(texts({ exif: { exposureCompensation: -2 / 3 } })).toEqual(["-0.7 EV"]);
    expect(texts({ exif: { exposureCompensation: 1 / 3 } })).toEqual(["+0.3 EV"]);
  });
});

describe("spokenExposureValues", () => {
  it("項目名を付けた文にする", () => {
    expect(
      spokenExposureValues({
        values: exposureValues({
          exif: {
            focalLength: 6.8,
            focalLength35mm: 24,
            aperture: 1.8,
            exposureTime: 1 / 250,
            iso: 160,
            exposureCompensation: 0.7,
          },
        }),
      }),
    ).toBe(
      "焦点距離 6.8mm（換算 24mm）、絞り f/1.8、シャッター速度 1/250 秒、ISO 160、露出補正 +0.7 EV",
    );
    expect(spokenExposureValues({ values: exposureValues({ exif: { exposureTime: 2 } }) })).toBe(
      "シャッター速度 2 秒",
    );
  });
});

describe("photoExifSummary", () => {
  it("カメラ名と露出の値を EN SPACE でつなぐ", () => {
    expect(
      photoExifSummary({
        exif: { cameraMake: "Apple", cameraModel: "iPhone 15 Pro", aperture: 1.8, iso: 50 },
      }),
    ).toBe("Apple iPhone 15 Pro f/1.8 ISO 50");
  });

  it("出すものが無ければ null", () => {
    expect(photoExifSummary({ exif: { lensModel: "XF23mmF1.4 R LM WR" } })).toBeNull();
  });
});
