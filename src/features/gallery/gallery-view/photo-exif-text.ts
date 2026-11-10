import type { GalleryPhotoExif } from "@/features/gallery/photo";

/** 画面に出す値と、読み上げ用の言い方。 */
export type ExposureValue = { text: string; spoken: string };

// 小数 1 桁に丸め、末尾の .0 は付けない
function oneDecimal({ value }: { value: number }) {
  return String(Math.round(value * 10) / 10);
}

function formatMillimeters({ value }: { value: number }) {
  return `${value < 10 ? oneDecimal({ value }) : Math.round(value)}mm`;
}

function formatFocalLength({ exif }: { exif: GalleryPhotoExif }): ExposureValue | null {
  const { focalLength, focalLength35mm } = exif;
  if (focalLength === undefined) {
    if (focalLength35mm === undefined) {
      return null;
    }
    const text = `換算 ${formatMillimeters({ value: focalLength35mm })}`;
    return { text, spoken: `焦点距離 ${text}` };
  }
  const actual = formatMillimeters({ value: focalLength });
  const text =
    focalLength35mm !== undefined && Math.abs(focalLength35mm - focalLength) >= 1
      ? `${actual}（換算 ${formatMillimeters({ value: focalLength35mm })}）`
      : actual;
  return { text, spoken: `焦点距離 ${text}` };
}

function formatShutterSpeed({ seconds }: { seconds: number }) {
  // 0.3 秒以上は分母が小さく、丸めると値がずれる（0.4 秒が 1/3 になる）ので小数で書く。
  const value = seconds < 0.3 ? `1/${Math.round(1 / seconds)}` : oneDecimal({ value: seconds });
  return { text: `${value}s`, spoken: `シャッター速度 ${value} 秒` };
}

/** 焦点距離 → 絞り → シャッター速度 → ISO → 露出補正 の順に、ある項目だけを返す。 */
export function exposureValues({ exif }: { exif: GalleryPhotoExif }): ExposureValue[] {
  const values: ExposureValue[] = [];
  const focal = formatFocalLength({ exif });
  if (focal) {
    values.push(focal);
  }
  if (exif.aperture !== undefined) {
    const text = `f/${oneDecimal({ value: exif.aperture })}`;
    values.push({ text, spoken: `絞り ${text}` });
  }
  if (exif.exposureTime !== undefined) {
    values.push(formatShutterSpeed({ seconds: exif.exposureTime }));
  }
  if (exif.iso !== undefined) {
    const text = `ISO ${exif.iso}`;
    values.push({ text, spoken: text });
  }
  if (exif.exposureCompensation !== undefined) {
    const rounded = Math.round(exif.exposureCompensation * 10) / 10;
    if (rounded !== 0) {
      const text = `${rounded > 0 ? "+" : ""}${rounded} EV`;
      values.push({ text, spoken: `露出補正 ${text}` });
    }
  }
  return values;
}

export function spokenExposureValues({ values }: { values: ExposureValue[] }) {
  return values.map(({ spoken }) => spoken).join("、");
}

/**
 * カメラ名。機種名がメーカー名の最初の語で始まっていれば（"Canon" と "Canon EOS R6"）機種名だけにし、
 * そうでなければ（"Apple" と "iPhone 15 Pro"）メーカー名を前に付ける。
 */
export function formatCameraName({ exif }: { exif: GalleryPhotoExif }): string | null {
  const { cameraMake: make, cameraModel: model } = exif;
  if (!make || !model) {
    return model ?? make ?? null;
  }
  const makeFirstWord = make.split(/\s+/)[0].toLowerCase();
  return model.toLowerCase().startsWith(makeFirstWord) ? model : `${make} ${model}`;
}

/** 管理画面の 1 行用。カメラ名と露出の値を空白でつなぐ。 */
export function photoExifSummary({ exif }: { exif: GalleryPhotoExif }): string | null {
  const parts = [
    formatCameraName({ exif }),
    ...exposureValues({ exif }).map(({ text }) => text),
  ].filter((part): part is string => part !== null);
  // 値の中にも半角空白があるので、区切りは一回り広い EN SPACE にする
  return parts.length === 0 ? null : parts.join(" ");
}
