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
    </p>
  );
}
