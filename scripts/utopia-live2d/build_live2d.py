"""パーツの PSD から PSD2Live（MCP）で Live2D モデルを組み、Web 用に書き出す。

PSD2Live をヘッドレスの MCP サーバーとして起動しておき（README 参照）、
    python build_live2d.py <PSD の絶対パス> <書き出し先の絶対パス>
で実行する。自動リギングに加えて、揺れもの・頬染め・設定資料の表情 6 種をここで足す。
"""
import json
import sys
import uuid
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
# PSD2Live に同梱の MCP クライアント（README の手順で clone しておく）
sys.path.insert(0, str(REPO / "tmp/live2d-work/psd2live"))
from mcp_proxy import Client  # noqa: E402

# 揺れを付けるレイヤー名と揺れ方
SWINGS = [
    {"id": "ahoge", "layer": "front hair 4", "preset": "hair", "kind": "lateral", "magnitude": 0.2},
    {"id": "ribbon", "layer": "headwear", "preset": "accessory", "kind": "lateral", "magnitude": 0.3},
    {"id": "earring", "layer": "earwear-l", "preset": "accessory", "kind": "lateral", "magnitude": 0.45},
    {"id": "side_hair_r", "layer": "front hair 2", "preset": "hair", "kind": "lateral", "magnitude": 0.18},
    {"id": "side_hair_l", "layer": "back hair 2", "preset": "hair", "kind": "lateral", "magnitude": 0.18},
]

# 設定資料 00 の表情バリエーション。ID はページの表情ボタン（utopia-expressions.ts）と揃える
EXPRESSIONS = {
    "smile": [("ParamMouthForm", "ADD", 0.8), ("ParamEyeLOpen", "MULTIPLY", 0.85), ("ParamEyeROpen", "MULTIPLY", 0.85),
              ("ParamBrowLY", "ADD", 0.2), ("ParamBrowRY", "ADD", 0.2), ("ParamCheek", "ADD", 0.2)],
    "grin": [("ParamEyeLOpen", "MULTIPLY", 0.0), ("ParamEyeROpen", "MULTIPLY", 0.0), ("ParamMouthForm", "ADD", 1.0),
             ("ParamMouthOpenY", "ADD", 0.55), ("ParamBrowLY", "ADD", 0.35), ("ParamBrowRY", "ADD", 0.35),
             ("ParamCheek", "ADD", 0.35)],
    "surprised": [("ParamEyeLOpen", "OVERWRITE", 1.0), ("ParamEyeROpen", "OVERWRITE", 1.0), ("ParamBrowLY", "ADD", 0.9),
                  ("ParamBrowRY", "ADD", 0.9), ("ParamMouthOpenY", "ADD", 0.6), ("ParamMouthForm", "ADD", -0.5)],
    "shy": [("ParamCheek", "OVERWRITE", 1.0), ("ParamEyeLOpen", "MULTIPLY", 0.8), ("ParamEyeROpen", "MULTIPLY", 0.8),
            ("ParamEyeBallX", "ADD", -0.35), ("ParamEyeBallY", "ADD", -0.45), ("ParamMouthForm", "ADD", 0.35)],
    "pout": [("ParamBrowLY", "ADD", -0.5), ("ParamBrowRY", "ADD", -0.5), ("ParamEyeLOpen", "MULTIPLY", 0.72),
             ("ParamEyeROpen", "MULTIPLY", 0.72), ("ParamMouthForm", "ADD", -1.0), ("ParamCheek", "ADD", 0.45)],
}


def request_id():
    return f"build-{uuid.uuid4().hex}"


def edit(client: Client, operation: str, **request):
    request.setdefault("state", client.state())
    request.setdefault("request_id", request_id())
    return client.call(operation, request)[0]


def meshes_by_layer(client: Client):
    targets = {}
    offset = 0
    while True:
        data, _ = client.call("workspace_inspect", {"scope": "objects", "limit": 64, "offset": offset})
        for item in data.get("items", []):
            if item.get("target", "").startswith("mesh:") and item.get("name") not in targets:
                targets[item["name"]] = item["target"].removeprefix("mesh:")
        if not data.get("next"):
            return targets
        offset += 64


def layer_ids(client: Client):
    data, _ = client.call("workspace_inspect", {"scope": "layers", "limit": 64})
    return {item["name"]: item["id"] for item in data.get("items", [])}


def main(psd: str, output: str):
    with Client(timeout=900) as client:
        edit(client, "project_import_psd", path=psd, discard_unsaved=True)
        edit(client, "settings_update", changes={"atlasSize": 2048})

        # 照れの頬染めは ParamCheek で出し入れする
        edit(client, "parameter_create", parameter_id="ParamCheek", name="照れ", min=0, max=1, default=0)
        layers = layer_ids(client)
        edit(client, "layer_set_variant", layer_id=layers["腮红"], variant="toggle", parameter="ParamCheek")
        # レイヤーの分類や差分の変更は、リグを生成し直したときに反映される
        edit(client, "rig_generate")

        # 読み込み中に出す静止画。口の差し替え設定の前に描く（設定後は描画機能が口のレイヤーを見つけられない）。既定のポーズを書き出す（物理演算の揺れは含まない）
        _, images = client.call("view_render_model", {
            "viewport": {"mode": "canvas_rect", "left": 0, "top": 0, "width": 2048, "height": 3072},
            "background": "transparent", "target_long_edge": 1350,
        })
        (Path(output) / "poster.png").write_bytes(images[0])

        # 開いた口は差し替えで出す。自動生成の唇の輪郭は閉じたとき閉じ口の線と二重に見えるため
        edit(client, "layer_set_variant", layer_id=layers["mouth open"], variant="toggle", parameter="ParamMouthOpenY")
        edit(client, "rig_generate")

        for preset in ["front_hair", "back_hair", "clothing"]:
            edit(client, "model_apply_preset", preset=preset)
            print("preset", preset)

        meshes = meshes_by_layer(client)
        for swing in SWINGS:
            edit(client, "swing_put", id=swing["id"], name=swing["id"], targets=[meshes[swing["layer"]]],
                 kind=swing["kind"], preset=swing["preset"], magnitude=swing["magnitude"])
            print("swing", swing["id"])

        # 自動生成の標準表情（笑顔・悲しみなど）は消し、設定資料の 6 種に置き換える
        existing, _ = client.call("expression_list", {})
        for item in existing.get("expressions", []):
            if item["id"] not in EXPRESSIONS:
                edit(client, "expression_delete", id=item["id"])
        for expression_id, entries in EXPRESSIONS.items():
            edit(client, "expression_put", expression={
                "id": expression_id, "name": expression_id, "fade_in": 0.4, "fade_out": 0.4,
                "entries": [{"parameter": p, "blend": b, "value": v} for p, b, v in entries],
            })
            print("expression", expression_id)

        result = edit(client, "project_export_model", output_directory=output)
        print(json.dumps(result, ensure_ascii=False)[:600])
        edit(client, "project_save_as", path=str(Path(output) / "utopia.psd2live"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
