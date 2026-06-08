import { Label } from "@/components/ui/label";
import {
  LOCAL_LLM_MODELS,
  type LocalLlmModelDefinition,
} from "@/features/local-llm/model-registry/local-llm-models";
import { cn } from "@/lib/cn";

type ModelSelectorProps = {
  selectedModelId: string;
  disabled?: boolean;
  onSelectModel: (args: { modelId: string }) => void;
};

function formatModalities({ model }: { model: LocalLlmModelDefinition }) {
  if (model.modalities.includes("image")) {
    return "テキスト + 画像";
  }
  return "テキスト";
}

export function ModelSelector({
  selectedModelId,
  disabled = false,
  onSelectModel,
}: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="local-llm-model">モデル</Label>
      <select
        id="local-llm-model"
        value={selectedModelId}
        disabled={disabled}
        className={cn(
          "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        onChange={(event) => onSelectModel({ modelId: event.target.value })}
      >
        {LOCAL_LLM_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}（{formatModalities({ model })} · {model.estimatedDownload}）
          </option>
        ))}
      </select>
    </div>
  );
}
