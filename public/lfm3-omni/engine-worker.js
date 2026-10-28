// LFM3-Omni-2B を CPU で動かすモジュール Worker。fusor-ai の lfm3-runtime（scripts/lfm3-omni/build-runtime.sh で
// 固定コミットから自前ビルドした単スレッド版）に、Hugging Face の重みバンドルを流し込んで会話する。
// fusor-ai の packages/host/worker.js（MIT）と liquidai-lmf3-wasm の app/engine/worker.js（MIT）を元に、
// 重みの取得元を固定リビジョンにし、manifest の SHA-256 を照合する処理を足している。
//
// load:  manifest を取得して SHA-256 を照合し、ランタイムを起動して各パートを流し込む。パートは manifest の
//        BLAKE3 でランタイムが検証するので、manifest を固定すれば重み全体が固定される。OPFS にキャッシュする。
// send:  ユーザーの次の発言（テキスト・画像の RGBA・16 kHz の音声）で返答を始め、1 段ずつ step() して
//        途中経過と 24 kHz の音声を送る。stop は段の合間に効く。
// reset: 会話を忘れる。
//
// 読み込み後は何も取得しない。入力は端末の外に出ない。

import { describe, errorKind, fetchOk, loadParts, startRuntime } from "./fusor/loader.js";

const BUNDLE_URL =
  "https://huggingface.co/fusorlabs/lfm3-omni-2b-web/resolve/09f4fc6ddbbb3cc6cd30f74b1e76cc894f4901f4/";
const MANIFEST_SHA256 = "96acbfa469bbf95f7ec87bb46317400dab2491d648416643c5b10f5c3645de24";
// 他の保存領域と衝突しない専用の OPFS ディレクトリ。読み込み後、manifest にないファイルはここから消える。
const CACHE_NAME = "local-llm-lfm3-omni-2b-parts";
const DIST_URL = new URL("./fusor/runtime/", import.meta.url);

let engine = null;
let resolveReady;
const ready = new Promise((resolve) => {
  resolveReady = resolve;
});
let stoppedJob = null;

const post = (message, transfer) => self.postMessage(message, transfer ?? []);

// setTimeout の 4 ms 制限のないマクロタスク。stop を step の合間に受け取るために使う。
const ticks = new MessageChannel();
const waiting = [];
ticks.port1.onmessage = () => waiting.shift()();
const yieldTask = () =>
  new Promise((resolve) => {
    waiting.push(resolve);
    ticks.port2.postMessage(null);
  });

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function load() {
  const t0 = performance.now();
  const [manifestText, started] = await Promise.all([
    fetchOk(new URL("manifest.json", BUNDLE_URL)).then((response) => response.text()),
    startRuntime({
      distUrl: DIST_URL,
      glueName: "lfm3_runtime",
      threads: 1,
      requested: null,
      onWarning: (message) => post({ type: "warning", message }),
    }),
  ]);
  if ((await sha256Hex(manifestText)) !== MANIFEST_SHA256) {
    throw new Error("重みバンドルの manifest が固定したものと一致しません");
  }
  const manifest = JSON.parse(manifestText);
  engine = { rt: new started.glue.Runtime(manifestText), glue: started.glue };
  const progress = await loadParts({
    runtime: engine.rt,
    manifest,
    baseUrl: BUNDLE_URL,
    cacheName: CACHE_NAME,
    onProgress: (p) => post({ type: "progress", ...p }),
  });
  post({ type: "ready", ms: performance.now() - t0, build: started.build.name, ...progress });
  resolveReady();
  await evictStaleParts(manifest);
}

/** 以前のバンドルのパートを OPFS から消す。 */
async function evictStaleParts(manifest) {
  const keep = new Set(manifest.parts.map((part) => part.blake3));
  let dir;
  try {
    dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(CACHE_NAME);
  } catch {
    return;
  }
  for await (const name of dir.keys()) {
    if (!keep.has(name)) await dir.removeEntry(name);
  }
}

async function send({ job, message, rgba, audio, layout }) {
  await ready;
  if (stoppedJob === job) return post({ type: "done", job, stopped: true });
  const { rt } = engine;
  const plan = JSON.parse(rt.start(message, rgba, audio, layout));
  post({ type: "started", job, plan });
  const speak = () => {
    const samples = rt.speech();
    if (samples.length) post({ type: "speech", job, samples }, [samples.buffer]);
  };
  for (;;) {
    await yieldTask();
    if (stoppedJob === job) {
      rt.cancel();
      speak();
      return post({ type: "done", job, stopped: true });
    }
    const progress = JSON.parse(rt.step());
    speak();
    if (progress.done) return post({ type: "done", job, stopped: false, ...progress });
    post({ type: "reply", job, ...progress });
  }
}

const handlers = {
  load,
  send,
  stop: ({ job }) => {
    stoppedJob = job;
  },
  reset: async () => {
    await ready;
    engine.rt.reset();
  },
};

self.onmessage = async ({ data }) => {
  try {
    await handlers[data.type]?.(data);
  } catch (error) {
    // ランタイムの {"kind","message"} エラーはエンジンを使い続けられる。それ以外（panic による trap など）は致命的。
    post({ type: errorKind(error) ? "error" : "fatal", job: data.job, message: describe(error, engine?.glue) });
  }
};
