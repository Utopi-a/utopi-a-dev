"""Qwen3-TTS VoiceDesign で、説明文から声の候補を量産する（手順 1）。

使い方: python design_voice.py <出力先>
説明文（INSTRUCTS）と種（SEEDS）の組み合わせごとに、同じセリフを読ませた wav を書き出す。
"""

import sys
import time
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

# 手本は 10〜20 秒あるとよい。一人称や口調も声の雰囲気に効くので、キャラクターのセリフにする
TEXT = (
    "こんにちは、ボクはゆーとぴあ。今日はどんなことを一緒に考えようか。"
    "ボク、気になることがあると、ついつい調べちゃうんだよね。"
)

# 設定集 v1.3（19 歳、ほんわか・穏やか・好奇心がある、少し不思議な雰囲気）と、ボクっ娘から書いた説明。
# 採用した qb3 は b の種 3。子どもの声として書くと、他社の声作りでは断られるので、19 歳の女性として書く
INSTRUCTS = {
    "a": "19歳の女性。ほんわかとして穏やかな、少し不思議な雰囲気の声。やわらかく澄んだ少し高めの声で、"
    "ゆっくりマイペースに、好奇心をにじませて話す。一人称はボク。",
    "b": "A 19-year-old young woman with a soft, slightly airy, gentle anime-style voice. Calm, dreamy and a "
    "little mysterious, curious and friendly. Speaks Japanese at a relaxed pace with light, warm intonation, "
    "like a tomboyish girl who calls herself 'boku'.",
    "c": "19歳の女性。少し中性的でボーイッシュな、透明感のある声。落ち着いていて、ふわっとした話し方で、"
    "親しげにやさしく話す。",
    "d": "19歳の女性。甘くやわらかいアニメ風の声で、ほんわかした不思議ちゃん。のんびり、楽しそうに、"
    "近い距離感で話す。",
}

SEEDS = [1, 2, 3]

model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    device_map="mps" if torch.backends.mps.is_available() else "cpu",
    dtype=torch.bfloat16,
    attn_implementation="sdpa",
)

for key, instruct in INSTRUCTS.items():
    for seed in SEEDS:
        torch.manual_seed(seed)
        started = time.time()
        wavs, sr = model.generate_voice_design(text=TEXT, language="Japanese", instruct=instruct)
        path = OUT / f"q{key}{seed}.wav"
        sf.write(path, wavs[0], sr)
        print(f"{path.name}: {len(wavs[0]) / sr:.1f} 秒の音声を {time.time() - started:.1f} 秒で生成", flush=True)
