import type { LocalLlmModelDefinition } from "@/features/local-llm/model-registry/local-llm-models";

type ModelAttributionProps = {
  model: LocalLlmModelDefinition;
};

export function ModelAttribution({ model }: ModelAttributionProps) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      モデル:{" "}
      <a
        href={model.huggingFaceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        {model.label}
      </a>
      {" · "}
      ライセンス:{" "}
      <a
        href={model.license.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        {model.license.name}
      </a>
      （{model.license.holder}）{" · "}
      ウェイトは{" "}
      <a
        href="https://huggingface.co"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Hugging Face
      </a>{" "}
      から取得し、推論は端末内で実行します。
      {model.kind === "fusor-lfm3-omni" ? (
        <>
          {" "}
          ウェイトは{" "}
          <a
            href="https://huggingface.co/fusorlabs/lfm3-omni-2b-web"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            fusorlabs が 7bit に変換したもの
          </a>
          で、推論ランタイムは{" "}
          <a
            href="https://github.com/fusor-rs/fusor-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            fusor-ai
          </a>
          （
          <a
            href="/lfm3-omni/fusor/LICENSE"
            className="underline underline-offset-2 hover:text-foreground"
          >
            MIT
          </a>
          ・
          <a
            href="/lfm3-omni/fusor/THIRD_PARTY_LICENSES.txt"
            className="underline underline-offset-2 hover:text-foreground"
          >
            同梱ライブラリのライセンス
          </a>
          ）をソースからビルドして使っています。
        </>
      ) : null}
    </p>
  );
}
