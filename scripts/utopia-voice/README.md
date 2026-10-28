# ゆーとぴあちゃんの読み上げの声の作り直し

ローカル LLM チャット（`/lab/local-llm`）の「声で読み上げ」が使う声を、作り直す手順です。
普段の開発では不要で、声を変えるときだけ使います。

読み上げは Irodori-TTS（ブラウザの WebGPU）で行い、声は「手本の潜在」（`public/utopia-voice/irodori-reference-latent.bin`）と
キャプション（`src/features/local-llm/irodori-tts/utopia-voice.ts`）で決まります。手本なしで合成すると、
文ごとに声を選び直して別人の声になるので、すべての文をこの手本に寄せます。

## 素材

| ファイル | 内容 |
| --- | --- |
| `source/qwen-voice-design-qb3.wav` | 手本の元にした声（24 kHz・約 10 秒）。Qwen3-TTS VoiceDesign で、`design_voice.py` の説明 b・種 3 から作ったもの |
| `public/utopia-voice/irodori-reference-latent.bin` | サイトが読み込む手本の潜在（float32・リトルエンディアン、フレーム × 32） |

## 流れ

1. `design_voice.py`: Qwen3-TTS VoiceDesign で、説明文と種の組み合わせごとに声の候補を作る。聞いて 1 本選ぶ
2. `prepare_reference.py`: 選んだ声を Irodori の参照音声の形（48 kHz・−16 LUFS・hop の倍数）にそろえる
3. `make-irodori-voice.ts`: 手本の声で Irodori に日本語を読み直させ、その音声を新しい手本にして潜在を書き出す。
   試聴用の音声（`tmp/utopia-voice/preview.wav`）も書き出す

手順 3 の読み直しが要るのは、Qwen は日本語の抑揚が崩れる（中国語なまりになる）ためです。Qwen の声をそのまま手本にすると、
崩れも Irodori に移ります。Irodori が読んだ日本語を手本にすると、声質は Qwen の声に寄ったまま抑揚が整います。
読み直しを 2 回にすると、声質が元の声から離れていきました。

## 声を選ぶときに気をつけること

- 実在の人（声優など）の声を手本にしない。Irodori-TTS の利用条件で、本人の同意のない声の複製は禁止されている
- 子どもの声として書かない。設定どおり 19 歳の女性として書く（Gemini・ElevenLabs など他社の声作りでは、子どもの声の指示は断られる）
- 作った声がたまたま実在の人に似ていないか、聞いて確かめる
- キャプションを変えたら、手順 3 からやり直す（手本の潜在はキャプションで読ませた音声から作るため）

## 環境の用意

```bash
W=tmp/utopia-voice
uv venv --python 3.12 $W/venv
VIRTUAL_ENV=$W/venv uv pip install -r scripts/utopia-voice/requirements.txt
```

手順 3 は Irodori-TTS の ONNX 版を手元に置いて使う。リビジョンはサイトと同じもの（`irodori-model-files.ts` の `REVISION`）にする。
`hf` は qwen-tts と一緒に入る。

```bash
W=tmp/utopia-voice
$W/venv/bin/hf download ryusei-46/Irodori-TTS-v4.1-ONNX-WebGPU \
  --revision 8259696dc5e4a408b4aed2e9f8e08f69d2e7af33 \
  --include "shared/*" "dit-meanflow/*" "tokenizer/*" \
  --local-dir tmp/utopia-voice/irodori-onnx
```

## 実行

```bash
W=tmp/utopia-voice
# 1. 候補を作る（Apple Silicon の GPU で 1 本 15 秒ほど。初回はモデル約 4 GB を取得する）
$W/venv/bin/python scripts/utopia-voice/design_voice.py $W/candidates
# 選んだ声を source/ に置く（ファイル名を変えたら、この README の素材の表も直す）
cp $W/candidates/qb3.wav scripts/utopia-voice/source/qwen-voice-design-qb3.wav
# 2. 参照音声の形にそろえる
$W/venv/bin/python scripts/utopia-voice/prepare_reference.py \
  scripts/utopia-voice/source/qwen-voice-design-qb3.wav $W/reference-48k.wav
# 3. 読み直して手本の潜在を書き出す（CPU で 30 秒ほど）
IRODORI_ONNX_DIR=$W/irodori-onnx REFERENCE_WAV=$W/reference-48k.wav \
  pnpm vitest run --config scripts/utopia-voice/vitest.config.ts
```

手順 3 は、サイトの読み上げと同じ合成のコード（`src/features/local-llm/irodori-tts/irodori-synthesizer.ts`）を
onnxruntime-node で動かすため、vitest で実行します。乱数の種を固定しているので、同じ手本からは同じ潜在ができます。

## ライセンス

- キャラクターと声の素材は、ゆーとぴあ（utopi-a）がすべての権利を留保する
- Qwen3-TTS: Apache-2.0
- Irodori-TTS v4.1・ONNX 版: MIT（Aratako。ONNX 変換は ryusei-46）
