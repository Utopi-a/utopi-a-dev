// Irodori-TTS v4.1-Small-MF を ONNX Runtime Web（WebGPU）向けに変換したもの。
// リビジョンを固定し、取得したファイルは下の SHA-256 と照合してから使う（作者が後から差し替えても読み込まない）。
const REPOSITORY = "ryusei-46/Irodori-TTS-v4.1-ONNX-WebGPU";
const REVISION = "8259696dc5e4a408b4aed2e9f8e08f69d2e7af33";
const CACHE_NAME = `irodori-tts-v4.1-small-mf-${REVISION.slice(0, 7)}`;

type ModelFile = { path: string; size: number; sha256: string };

const FILES = {
  encoder: {
    path: "shared/encoder.onnx",
    size: 8_246_664,
    sha256: "f51ced4f920bd86b6101e85cb24330d5905d836c3f0144999785fa72f5f0afa7",
  },
  encoderData: {
    path: "shared/encoder.onnx.data",
    size: 636_050_944,
    sha256: "0d41d9ce1b7c2d2b749e7e32ad9f7b3740c2fb0b96604be36890a442c43fde98",
  },
  duration: {
    path: "shared/duration.onnx",
    size: 257_221,
    sha256: "3c2dfca151910eb24c188f8a93b3ae8e68834e3d589ba499435009f308fc0769",
  },
  durationData: {
    path: "shared/duration.onnx.data",
    size: 43_567_616,
    sha256: "d8812189e0d99538f5eee723c40d985e8a7d89cb3e755daaa7d841e08247309d",
  },
  dit: {
    path: "dit-meanflow/dit.onnx",
    size: 2_734_667,
    sha256: "1939802b49065f176e08a70ee64e102df75f9e6843a4c47c49e2fed6784df1de",
  },
  ditData: {
    path: "dit-meanflow/dit.onnx.data",
    size: 745_886_720,
    sha256: "4cd0ed4c62e3fe71df2b41341e9c963de1e8a63f2882b20904f57d0f323fd3bf",
  },
  decoder: {
    path: "shared/decoder.onnx",
    size: 839_817,
    sha256: "89af98338ceb9ba04852afa97caa8b173ad6a506d20929952c48baf5e2683d0d",
  },
  decoderData: {
    path: "shared/decoder.onnx.data",
    size: 166_135_616,
    sha256: "4ab51296a7482bf0dc9f6465b939f547fe6f10f982fb5d4b60946df6e5cf1a2c",
  },
  speaker: {
    path: "shared/speaker.onnx",
    size: 1_362_734,
    sha256: "77ef718dbb2887ffb01caa06ccb20efecde16259cd1fb223fb284f355542db8c",
  },
  speakerData: {
    path: "shared/speaker.onnx.data",
    size: 121_015_296,
    sha256: "33e4eb8853175b2133ff76f3c2760c34359cde14e822636ad37008b36ab8796c",
  },
  textTokenizer: {
    path: "tokenizer/tokenizer_text.json",
    size: 3_228_566,
    sha256: "591c8c74350e13f9c4cad9075a3548e22806d86e2b2dbd6b583f374f7367a4d5",
  },
  captionTokenizer: {
    path: "tokenizer/tokenizer_caption.json",
    size: 3_439_550,
    sha256: "27d32e223723b6c560145822b2ad1636defa1752c23f16eedc22b21dc21c833e",
  },
  tokenizerConfig: {
    path: "tokenizer/tokenizer_config.json",
    size: 668,
    sha256: "d229a271c64de1a7939d20d3665498e873fa91d5ee2edf135d73ec752cb9c9d3",
  },
  forcedSplits: {
    path: "tokenizer/forced_splits.json",
    size: 1800,
    sha256: "39752fa2f04027f5c28eea25e94cb634a83ead117a8b478c1850aa329e7aa779",
  },
  annotationEmojis: {
    path: "tokenizer/annotation_emojis.json",
    size: 464,
    sha256: "1179de87786cec990a50b17aaffd2d1fe81a11aef9eb6023454478dd7448c6cb",
  },
} as const satisfies Record<string, ModelFile>;

export type IrodoriFileKey = keyof typeof FILES;

export const IRODORI_TOTAL_BYTES = Object.values(FILES).reduce((sum, file) => sum + file.size, 0);

function urlOf({ file }: { file: ModelFile }) {
  return `https://huggingface.co/${REPOSITORY}/resolve/${REVISION}/${file.path}`;
}

async function sha256Hex({ bytes }: { bytes: Uint8Array<ArrayBuffer> }) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function download({ file, onBytes }: { file: ModelFile; onBytes: (bytes: number) => void }) {
  const response = await fetch(urlOf({ file }));
  if (!response.ok || !response.body) {
    throw new Error(`${file.path} を取得できませんでした（HTTP ${response.status}）`);
  }
  const bytes = new Uint8Array(file.size);
  let offset = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (offset + value.length > bytes.length) {
      throw new Error(`${file.path} の大きさが想定と違います`);
    }
    bytes.set(value, offset);
    offset += value.length;
    onBytes(value.length);
  }
  if (offset !== file.size) {
    throw new Error(`${file.path} の大きさが想定と違います`);
  }
  return bytes;
}

/**
 * モデルのファイルを、ブラウザのキャッシュになければ取得し、ハッシュを照合して返す。
 * キャッシュから読んだものも照合する（壊れたキャッシュを使わないため）。
 */
export async function loadIrodoriFiles<Key extends IrodoriFileKey>({
  keys,
  onProgress,
}: {
  keys: readonly Key[];
  onProgress: (progress: { loaded: number; total: number }) => void;
}) {
  const cache = await caches.open(CACHE_NAME);
  const total = keys.reduce((sum, key) => sum + FILES[key].size, 0);
  let loaded = 0;
  const entries = [] as [Key, Uint8Array<ArrayBuffer>][];
  for (const key of keys) {
    const file = FILES[key];
    const url = urlOf({ file });
    const cached = await cache.match(url);
    let bytes: Uint8Array<ArrayBuffer>;
    if (cached) {
      bytes = new Uint8Array(await cached.arrayBuffer());
      loaded += file.size;
      onProgress({ loaded, total });
    } else {
      bytes = await download({
        file,
        onBytes(count) {
          loaded += count;
          onProgress({ loaded, total });
        },
      });
    }
    if ((await sha256Hex({ bytes })) !== file.sha256) {
      await cache.delete(url);
      throw new Error(`${file.path} のハッシュが一致しません`);
    }
    if (!cached) {
      await cache.put(url, new Response(bytes));
    }
    entries.push([key, bytes]);
  }
  return Object.fromEntries(entries) as Record<Key, Uint8Array<ArrayBuffer>>;
}

/** 重みがブラウザのキャッシュにあるか（読み込み前に、初回のダウンロード量を見せるかを決める） */
export async function hasCachedIrodoriFiles() {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(urlOf({ file: FILES.ditData }))) !== undefined;
}

/** 古いリビジョンのキャッシュを消す */
export async function evictStaleIrodoriCaches() {
  for (const name of await caches.keys()) {
    if (name.startsWith("irodori-tts-") && name !== CACHE_NAME) {
      await caches.delete(name);
    }
  }
}
