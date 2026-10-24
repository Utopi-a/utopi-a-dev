# ゆーとぴあちゃんの Live2D モデルの作り直し

`public/utopia-live2d/` の Live2D モデル（`.moc3` ほか）を、元絵から作り直す手順です。
普段の開発では不要で、絵やパーツの切り方、動きを変えるときだけ使います。

## 素材

| ファイル | 内容 |
| --- | --- |
| `source/utopia-master.png` | 元絵（1024×1536）。Codex の画像生成で、設定集 v1.3 から正面バストアップとして描いたもの |
| `source/sprites/` | 元絵にないパーツ（開いた口・驚きの口・頬染め）。同じく Codex で単体を描いたもの |
| `source/gpt/` | 切り出したパーツを Codex（GPT）の画像生成で描き直したもの。隠れていた部分の補完と、途切れ・色抜けの修正を含む |
| `source/gpt_parts.json` | パーツごとの描き直しの指示、切り出し範囲（元絵の座標）、合わせ方、置く位置 |

## 流れ

1. 元絵を waifu2x（CUnet）で 4 倍（4096×6144）にする
2. `build_layers.py`: SAM 2.1 の点・枠指定と色の条件で、各パーツのマスクを作る。同じ色が続く髪の分け目だけ多角形で決める
3. `compose_layers.py`: マスクから RGBA のパーツを作る。隠れていた部分（前髪の下のおでこ、目の下の肌、顔の裏の髪、首）は、同じパーツの見えている色を広げて埋める
4. `place_sprites.py`: 開いた口・驚きの「お」の口・頬染めを元絵の位置へ縮小して置く
5. `unmix_translucent_bangs.py`: 目にかかる半透明の前髪を、髪の色と透明度に分け直す（目を閉じたとき前髪越しに透けるように）
6. `gpt_parts.py apply`: 描き直したパーツ（`source/gpt/`）を `gpt_parts.json` に記録した位置・大きさで置く
7. `extract_accessories.py`: 髪飾りとブローチを元絵から切り出す（描き直した編み込みとタイの上に重ねる）
8. `clip_to_silhouette.py`: 胴・腕・タイを元絵の輪郭に収める
9. `fit_parts.py`: 動かしたときに破綻しないよう整える（白目と瞳を下まつ毛までの目の輪郭に収める、下まつ毛を元絵から切り出す、目尻で上下のまつ毛がつながる部分を下まつ毛側に移す、顔に描かれた口を消す、見えている胴と袖を元絵の画素にして肩の線をつなぐ、タイの下を輪郭線ごと除き、GPT がタイを取り除いて描いた白いシャツ（`under_tie`）で埋める、髪の内側を不透明にする）
10. `draw_mouth_line.py`: 閉じ口の線を左右対称のなめらかな線で描き直す
11. `add_base_blush.py`: 薄い頬の赤みを顔に焼き込む（頬染めの表情は別パーツ）
12. `make-psd.mjs`: パーツを [PSD2Live](https://github.com/tsunehimatoi/psd2live) が部位を読み取れるレイヤー名で PSD にまとめる。下まつ毛は顔に結合せず目のレイヤーにする（頭の向きで目と顔の動きがずれて離れるため）
13. `build_live2d.py`: PSD2Live（MCP）で自動リギングし、揺れもの・頬染め・設定資料の表情 6 種を足して書き出す。閉じた目は、上まつ毛の根元の線を下まつ毛の根元の線に重ねる形へ書き直す（下まつ毛はわずかに上げ、上まつ毛の帯の裏に潜らせる）。笑い目（ParamEyeLSmile / ParamEyeRSmile）、見開き（ParamEyeLWide / ParamEyeRWide）、閉じた口の口角（ParamMouthForm）の変形と、驚きの口の差し替え（ParamMouthO）もここで足す
14. `install_web_model.py`: 書き出したモデルを `public/utopia-live2d/` に配置する（テクスチャは WebP）

中間生成物は `tmp/utopia-puppet-work/`、`tmp/live2d-work/`（どちらも git 対象外）に置きます。

## パーツの描き直し（手順 6 の素材を作り直すとき）

`gpt_parts.json` の各パーツについて、元絵の切り出しと周りの文脈を Codex に渡し、画像生成でパーツ単体を描き直させます。
描き直した結果は Codex の画像認識で別に評価させ、形の破綻・色抜け・別パーツの混入があれば指示を直して描き直します。

```bash
python scripts/utopia-live2d/gpt_parts.py prepare <パーツ名>...   # tmp/utopia-puppet-work/gpt-parts/<パーツ名>/ に依頼一式を作る
# 各ディレクトリの prompt.md を codex exec -s workspace-write に渡し、out.png を描かせる
# out.png を source/gpt/<パーツ名>.webp（品質 95）に変換して置き、gpt_parts.json の placement を消す
python scripts/utopia-live2d/gpt_parts.py apply <パーツ名>...     # 置く位置を探して gpt_parts.json に記録する
```

返ってきた画像は大きさ・位置が数％ずれるので、`align` に応じて位置を探します。

| `align` | 合わせ方 |
| --- | --- |
| （なし） | 元のパーツと形が最も重なる拡大率と平行移動 |
| `color` | 元絵の画素と色が最も合う位置（形が大きく変わる腕や耳など） |
| `chamfer` | 輪郭線どうしの距離が最も近い位置（眉など、塗りが少なく線だけのもの） |
| `none` | 切り出し範囲にそのまま置く（細い線や前髪など、探すとかえってずれるもの） |

一度決まった位置は `placement` として記録し、以後の `apply` はそれを使います。

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
for step in build_layers compose_layers place_sprites unmix_translucent_bangs; do
  $W/tools/venv/bin/python scripts/utopia-live2d/$step.py
done
(cd scripts/utopia-live2d && ../../$W/tools/venv/bin/python gpt_parts.py apply \
  $(python3 -c "import json; print(' '.join(json.load(open('source/gpt_parts.json'))))"))
for step in extract_accessories clip_to_silhouette fit_parts draw_mouth_line add_base_blush; do
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

- キャラクター・元絵・素材・書き出したモデルは、ゆーとぴあ（utopi-a）がすべての権利を留保する。利用条件は `source/LICENSE.txt`（`install_web_model.py` が `public/utopia-live2d/LICENSE.txt` にも置く）
- SAM 2.1: Apache-2.0
- waifu2x-ncnn-vulkan: MIT
- PSD2Live: GPL-3.0（ツールとして使うだけで、サイトには含めない。書き出したモデルは PSD2Live に依存しない）
- 表示に使う Live2D Cubism Core は、Live2D 社の公式 CDN から実行時に読み込む（リポジトリには含めない）
