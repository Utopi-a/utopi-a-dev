# ゆーとぴあちゃんの Live2D モデルの作り直し

`public/utopia-live2d/` の Live2D モデル（`.moc3` ほか）を、元絵から作り直す手順です。
普段の開発では不要で、絵やパーツの切り方、動きを変えるときだけ使います。

## 素材

| ファイル | 内容 |
| --- | --- |
| `source/utopia-master.png` | 元絵（1024×1536）。Codex の画像生成で、設定集 v1.3 から正面バストアップとして描いたもの |
| `source/sprites/` | 元絵にないパーツ（開いた口・頬染め）。同じく Codex で単体を描いたもの |
| `source/cleaned/` | 切り出した髪のパーツを Codex の画像生成で清書したもの。`bbox.json` は清書前の切り出し範囲（4 倍キャンバス） |

## 流れ

1. 元絵を waifu2x（CUnet）で 4 倍（4096×6144）にする
2. `build_layers.py`: SAM 2.1 の点・枠指定と色の条件で、各パーツのマスクを作る。同じ色が続く髪の分け目だけ多角形で決める
3. `compose_layers.py`: マスクから RGBA のパーツを作る。隠れていた部分（前髪の下のおでこ、目の下の肌、顔の裏の髪、首）は、同じパーツの見えている色を広げて埋める
4. `place_sprites.py`: 開いた口と頬染めを元絵の位置へ縮小して置く
5. `unmix_translucent_bangs.py`: 目にかかる半透明の前髪を、髪の色と透明度に分け直す（目を閉じたとき前髪越しに透けるように）
6. `apply_codex_clean.py`: 清書した髪のパーツを、元のパーツと形が最も重なる位置・大きさで差し替える
7. `make-psd.mjs`: パーツを [PSD2Live](https://github.com/tsunehimatoi/psd2live) が部位を読み取れるレイヤー名で PSD にまとめる
8. `build_live2d.py`: PSD2Live（MCP）で自動リギングし、揺れもの・頬染め・設定資料の表情 6 種を足して書き出す
9. `install_web_model.py`: 書き出したモデルを `public/utopia-live2d/` に配置する（テクスチャは WebP）

中間生成物は `tmp/utopia-puppet-work/`、`tmp/live2d-work/`（どちらも git 対象外）に置きます。

## 髪の清書（手順 6 の素材を作り直すとき）

`compose_layers.py` の後の髪のパーツを切り出して、Codex に画像生成で清書させます。
外形・位置を保ったまま、途切れた毛先や浮いたかけら、混ざった別パーツの欠片だけを描き直すよう指示します。
返ってきた画像は大きさ・位置が数％ずれるので、`apply_codex_clean.py` が拡大率と平行移動を探して合わせます。

## 環境の用意

```bash
W=tmp/utopia-puppet-work
python3 -m venv $W/tools/venv
$W/tools/venv/bin/pip install -r scripts/utopia-live2d/requirements.txt
git clone --depth 1 https://github.com/facebookresearch/sam2.git $W/tools/vendor/sam2
SAM2_BUILD_CUDA=0 $W/tools/venv/bin/pip install -e $W/tools/vendor/sam2 --no-build-isolation
mkdir -p $W/tools/models
curl -fL https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_base_plus.pt -o $W/tools/models/sam2.1_hiera_base_plus.pt
```

- waifu2x-ncnn-vulkan は [公式リリース 20250915](https://github.com/nihui/waifu2x-ncnn-vulkan/releases/tag/20250915) の macOS 版を `$W/tools/` に展開する
- PSD2Live は `tmp/live2d-work/psd2live` に clone し、JDK 21（`brew install openjdk@21`）でヘッドレスの MCP サーバーとして起動する

```bash
cd tmp/live2d-work/psd2live
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew run --args="mcp --port 23871 --token <32 文字以上のトークン> --profile full"
```

## 実行

```bash
W=tmp/utopia-puppet-work
$W/tools/waifu2x-ncnn-vulkan-20250915-macos/waifu2x-ncnn-vulkan \
  -i scripts/utopia-live2d/source/utopia-master.png \
  -o $W/master/master_b_4x.png -n -1 -s 4 -t 256 \
  -m $W/tools/waifu2x-ncnn-vulkan-20250915-macos/models-cunet -g 0 -f png
for step in build_layers compose_layers place_sprites unmix_translucent_bangs apply_codex_clean; do
  $W/tools/venv/bin/python scripts/utopia-live2d/$step.py
done
node scripts/utopia-live2d/make-psd.mjs $PWD/tmp/live2d-work/rig/utopia.psd
PSD2LIVE_MCP_TOKEN=<トークン> $W/tools/venv/bin/python scripts/utopia-live2d/build_live2d.py \
  $PWD/tmp/live2d-work/rig/utopia.psd $PWD/tmp/live2d-work/rig/out
$W/tools/venv/bin/python scripts/utopia-live2d/install_web_model.py $PWD/tmp/live2d-work/rig/out
```

`tmp/live2d-work/rig/out/` には、Cubism Editor で開ける `.cmo3` と PSD2Live のプロジェクト（`utopia.psd2live`）も出ます。
手で細かく直すときはこちらを使います。

## ライセンス

- SAM 2.1: Apache-2.0
- waifu2x-ncnn-vulkan: MIT
- PSD2Live: GPL-3.0（ツールとして使うだけで、サイトには含めない。書き出したモデルは PSD2Live に依存しない）
- 表示に使う Live2D Cubism Core は、Live2D 社の公式 CDN から実行時に読み込む（リポジトリには含めない）
