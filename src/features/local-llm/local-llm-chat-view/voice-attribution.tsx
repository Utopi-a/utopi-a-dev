const linkClassName = "underline underline-offset-2 hover:text-foreground";

export function VoiceAttribution() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      読み上げ:{" "}
      <a
        href="https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small-MF"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        Irodori-TTS v4.1-Small-MF
      </a>
      {" · "}
      ライセンス:{" "}
      <a
        href="https://huggingface.co/ryusei-46/Irodori-TTS-v4.1-ONNX-WebGPU/blob/8259696dc5e4a408b4aed2e9f8e08f69d2e7af33/LICENSE"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        MIT
      </a>
      （Aratako）{" · "}
      ウェイトは ryusei-46 が{" "}
      <a
        href="https://huggingface.co/ryusei-46/Irodori-TTS-v4.1-ONNX-WebGPU"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        ONNX に変換したもの
      </a>
      で、合成は端末内（WebGPU）で行います。声はゆーとぴあちゃんの設定から{" "}
      <a
        href="https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        Qwen3-TTS
      </a>
      （Apache-2.0）で作った声を手本にした合成音声で、実在の人の声ではありません。
    </p>
  );
}
