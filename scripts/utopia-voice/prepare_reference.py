"""手本の音声を Irodori-TTS の参照音声の形にそろえる（手順 2）。

使い方: python prepare_reference.py <入力 wav> <出力 wav>
48 kHz モノラルにし、積分ラウドネス（ITU-R BS.1770）を -16 LUFS にそろえ、ピークを 1 以下に収め、
末尾を hop（1920）の倍数まで反射で詰める。ONNX 版の config.json の reference の手順と同じ。
"""

import sys

import librosa
import numpy as np
import pyloudnorm as pyln
import soundfile as sf

SAMPLE_RATE = 48_000
HOP_LENGTH = 1920
TARGET_LUFS = -16.0

src, dst = sys.argv[1], sys.argv[2]
wav, _ = librosa.load(src, sr=SAMPLE_RATE, mono=True)
wav = pyln.normalize.loudness(wav, pyln.Meter(SAMPLE_RATE).integrated_loudness(wav), TARGET_LUFS)
peak = np.abs(wav).max()
if peak > 1:
    wav = wav / peak
pad = (-len(wav)) % HOP_LENGTH
if pad:
    wav = np.pad(wav, (0, pad), mode="reflect")
sf.write(dst, wav.astype(np.float32), SAMPLE_RATE, subtype="FLOAT")
print(f"{dst}: {len(wav) / SAMPLE_RATE:.2f} 秒")
