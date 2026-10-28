import { Loader2Icon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IRODORI_TOTAL_BYTES } from "@/features/local-llm/irodori-tts/irodori-model-files";
import type { IrodoriVoiceState } from "@/features/local-llm/irodori-tts/use-irodori-voice";

type VoiceToggleProps = {
  state: IrodoriVoiceState;
  onTurnOn: () => void;
  onTurnOff: () => void;
};

export function VoiceToggle({ state, onTurnOn, onTurnOff }: VoiceToggleProps) {
  if (state.status === "loading") {
    // 1% が 16 MB あり、回線が遅いと % では止まって見えるので、取得量を MB で出す
    const isFetched = state.total > 0 && state.loaded >= state.total;
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <Loader2Icon className="size-4 animate-spin" />
        {isFetched ? (
          "声を準備中…"
        ) : (
          <>
            声を取得中{" "}
            <span className="tabular-nums">
              {Math.floor(state.loaded / 1e6).toLocaleString()} /{" "}
              {Math.round(state.total / 1e6).toLocaleString()} MB
            </span>
          </>
        )}
      </Button>
    );
  }

  const isOn = state.status === "on";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {state.status === "error" ? <span className="text-destructive">{state.message}</span> : null}
      {state.status === "off" && !state.isDownloaded ? (
        <span>初回 約 {(IRODORI_TOTAL_BYTES / 1e9).toFixed(1)} GB</span>
      ) : null}
      <Button
        type="button"
        variant={isOn ? "default" : "outline"}
        size="sm"
        aria-pressed={isOn}
        onClick={isOn ? onTurnOff : onTurnOn}
      >
        {isOn ? <Volume2Icon className="size-4" /> : <VolumeOffIcon className="size-4" />}
        声で読み上げ
      </Button>
    </div>
  );
}
