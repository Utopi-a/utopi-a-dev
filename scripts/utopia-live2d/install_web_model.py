"""PSD2Live が書き出した Live2D モデル一式を、サイトの public/utopia-live2d/ に配置する。

ファイル名を utopia.* にそろえ、テクスチャは WebP にして軽くする。編集用の .cmo3 などは配置しない。
    python install_web_model.py <PSD2Live の書き出し先>
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[2]
TARGET = REPO / "public/utopia-live2d"


def main(source_dir: str):
    source = Path(source_dir)
    model_file = next(source.glob("*.model3.json"))
    stem = model_file.name.removesuffix(".model3.json")
    model = json.loads(model_file.read_text())
    references = model["FileReferences"]

    shutil.rmtree(TARGET, ignore_errors=True)
    (TARGET / "textures").mkdir(parents=True)

    def copy(relative: str) -> str:
        renamed = Path(relative).name.replace(stem, "utopia", 1)
        shutil.copyfile(source / relative, TARGET / renamed)
        return renamed

    references["Moc"] = copy(references["Moc"])
    for key in ("Physics", "DisplayInfo", "Pose"):
        if key in references:
            references[key] = copy(references[key])
    for expression in references.get("Expressions", []):
        expression["File"] = copy(expression["File"])
    for motions in references.get("Motions", {}).values():
        for motion in motions:
            motion["File"] = copy(motion["File"])

    textures = []
    for index, relative in enumerate(references["Textures"]):
        path = f"textures/texture_{index:02d}.webp"
        Image.open(source / relative).save(TARGET / path, "WEBP", quality=92, alpha_quality=100, method=6)
        textures.append(path)
    references["Textures"] = textures

    Image.open(source / "poster.png").save(TARGET / "poster.webp", "WEBP", quality=86, method=6)
    (TARGET / "utopia.model3.json").write_text(json.dumps(model, ensure_ascii=False, indent=2) + "\n")
    size = sum(f.stat().st_size for f in TARGET.rglob("*") if f.is_file())
    print(f"installed {TARGET} ({size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main(sys.argv[1])
