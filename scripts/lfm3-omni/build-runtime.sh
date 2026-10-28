#!/usr/bin/env bash
# LFM3-Omni-2B のブラウザランタイム（fusor-ai の lfm3-runtime、単スレッド版 2 種）を
# 固定コミットのソースから使い捨ての Docker コンテナでビルドし、public/lfm3-omni/fusor/ に置く。
#
#   scripts/lfm3-omni/build-runtime.sh
#
# 作者が Hugging Face Space に置いているビルド済みバイナリは手元ビルドで出所を確かめられないため使わない。
# ツールも作者のインストールスクリプト（wasm-bindgen をチェックサムなしで取得する）は使わず、
# crates.io（Cargo.lock の checksum 付き）とハッシュを固定した binaryen から入れる。
# COOP/COEP なしで動く単スレッド版だけを作る（threads は crossOriginIsolated なページでしか使えない）。
set -euo pipefail

FUSOR_AI_REPO="https://github.com/fusor-rs/fusor-ai.git"
# 重みバンドル fusorlabs/lfm3-omni-2b-web@09f4fc6d を作ったのと同じ fusor-ai。ランタイムは同じ fusor-ai で
# compile したバンドルしか読めない。
FUSOR_AI_COMMIT="67bbe1ebeb140f11262f15996b79825bbe1cf461"
RUST_IMAGE="rust:1.99.0-bookworm"
WASM_BINDGEN_VERSION="0.2.129"
CARGO_ABOUT_VERSION="0.9.3"
BINARYEN_VERSION="version_133"
BINARYEN_SHA256_AARCH64="89c07ea56faf38d0fbecf36ca8ec0721756716185f265b568e133d427f299bf8"
BINARYEN_SHA256_X86_64="2dc9c7813f5375db93d96ead4b78222fcc3e2677bbb832297af4797782a37489"
# packages/host/loader.js の BUILDS のうち、スレッドを使わないもの
VARIANTS="web-single web-single-relaxed"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/lfm3-omni/fusor"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet "$FUSOR_AI_REPO" "$WORK/fusor-ai"
git -C "$WORK/fusor-ai" checkout --quiet "$FUSOR_AI_COMMIT"

mkdir -p "$WORK/out"
docker run --rm \
  -v "$WORK/fusor-ai:/src:ro" \
  -v "$WORK/out:/out" \
  -e VARIANTS="$VARIANTS" \
  -e WASM_BINDGEN_VERSION="$WASM_BINDGEN_VERSION" \
  -e CARGO_ABOUT_VERSION="$CARGO_ABOUT_VERSION" \
  -e BINARYEN_VERSION="$BINARYEN_VERSION" \
  -e BINARYEN_SHA256_AARCH64="$BINARYEN_SHA256_AARCH64" \
  -e BINARYEN_SHA256_X86_64="$BINARYEN_SHA256_X86_64" \
  "$RUST_IMAGE" bash -euo pipefail -c '
    # ソースは読み取り専用でマウントし、ビルドはコンテナ内のコピーで行う
    cp -R /src /build && cd /build
    rustup target add wasm32-unknown-unknown
    cargo install --quiet --locked --root /tools wasm-bindgen-cli --version "$WASM_BINDGEN_VERSION"
    cargo install --quiet --locked --root /tools cargo-about --version "$CARGO_ABOUT_VERSION" --features cli
    case "$(uname -m)" in
      aarch64) arch=aarch64; sha="$BINARYEN_SHA256_AARCH64" ;;
      x86_64) arch=x86_64; sha="$BINARYEN_SHA256_X86_64" ;;
    esac
    curl -sSfL -o /tmp/binaryen.tgz \
      "https://github.com/WebAssembly/binaryen/releases/download/$BINARYEN_VERSION/binaryen-$BINARYEN_VERSION-$arch-linux.tar.gz"
    echo "$sha  /tmp/binaryen.tgz" | sha256sum -c -
    tar -xzf /tmp/binaryen.tgz -C /tmp

    # 以下は fusor-ai の scripts/build-runtime.sh と同じ手順（単スレッド版の分だけ）
    for variant in $VARIANTS; do
      config=()
      opt=(-O3 -ocimfs=20 --enable-simd --enable-bulk-memory --enable-sign-ext
        --enable-nontrapping-float-to-int --enable-mutable-globals --enable-reference-types
        --enable-multivalue)
      if [ "$variant" = web-single-relaxed ]; then
        config=(--config "target.wasm32-unknown-unknown.rustflags=[\"-C\", \"target-feature=+relaxed-simd\"]")
        opt+=(--enable-relaxed-simd)
      fi
      cargo "${config[@]}" build --locked -p lfm3-runtime --target wasm32-unknown-unknown --profile wasm \
        --target-dir "target/runtimes/$variant"
      /tools/bin/wasm-bindgen --target web --no-typescript --out-dir "/out/runtime/$variant" \
        --out-name lfm3_runtime "target/runtimes/$variant/wasm32-unknown-unknown/wasm/lfm3_runtime.wasm"
      "/tmp/binaryen-$BINARYEN_VERSION/bin/wasm-opt" "${opt[@]}" \
        "/out/runtime/$variant/lfm3_runtime_bg.wasm" -o "/out/runtime/$variant/lfm3_runtime_bg.wasm"
    done

    cp packages/host/loader.js /out/loader.js
    cp LICENSE /out/LICENSE
    # WASM に静的リンクされた crate のライセンス表記
    cat > /tmp/about.toml <<EOF
accepted = ["MIT", "Apache-2.0", "Apache-2.0 WITH LLVM-exception", "BSD-2-Clause", "BSD-3-Clause",
  "ISC", "Zlib", "Unicode-3.0", "Unicode-DFS-2016", "CC0-1.0", "BSL-1.0", "MPL-2.0", "0BSD", "Unlicense"]
targets = ["wasm32-unknown-unknown"]
EOF
    cat > /tmp/about.hbs <<'"'"'EOF'"'"'
Third-party licenses of the LFM3-Omni-2B browser runtime (fusor-ai lfm3-runtime)
{{#each licenses}}
================================================================================
{{name}}
Used by:{{#each used_by}} {{crate.name}} {{crate.version}}{{/each}}

{{{text}}}
{{/each}}
EOF
    cd models/lfm3/runtime
    /tools/bin/cargo-about generate --locked -c /tmp/about.toml /tmp/about.hbs > /out/THIRD_PARTY_LICENSES.txt
  '

# fusor-ai の import チェック（ネットワーク・ストレージ・時計・乱数を持たないこと）を、ビルドした WASM に掛ける
for variant in $VARIANTS; do
  flags="--no-relaxed"
  [ "$variant" = web-single-relaxed ] && flags=""
  node "$WORK/fusor-ai/scripts/check-wasm-imports.mjs" "$WORK/out/runtime/$variant/lfm3_runtime_bg.wasm" \
    --glue "$WORK/out/runtime/$variant/lfm3_runtime.js" $flags
done

rm -rf "$OUT/runtime" "$OUT/loader.js" "$OUT/LICENSE" "$OUT/THIRD_PARTY_LICENSES.txt"
mkdir -p "$OUT"
cp -R "$WORK/out/." "$OUT/"
echo "$FUSOR_AI_COMMIT" > "$OUT/FUSOR_AI_COMMIT"
(cd "$OUT" && find runtime loader.js -type f | sort | xargs shasum -a 256)
