/**
 * Live2D Cubism Core（Cubism 3 以降のモデルを読む公式の実行ライブラリ）を公式 CDN から読み込む。
 * 再配布を避けるため、リポジトリには含めずに実行時に取得する。
 */
const CUBISM_CORE_URL = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";

let loading: Promise<void> | null = null;

export function loadCubismCore() {
  if ("Live2DCubismCore" in window) {
    return Promise.resolve();
  }
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CUBISM_CORE_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("Live2D Cubism Core を読み込めませんでした"));
    };
    document.head.append(script);
  });
  return loading;
}
