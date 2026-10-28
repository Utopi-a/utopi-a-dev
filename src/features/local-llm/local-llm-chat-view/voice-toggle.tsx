import { Loader2Icon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IrodoriVoiceState } from "@/features/local-llm/irodori-tts/use-irodori-voice";

type VoiceToggleProps = {
  state: IrodoriVoiceState;
  onTurnOn: () => void;
  onTurnOff: () => void;
};

export function VoiceToggle({ state, onTurnOn, onTurnOff }: VoiceToggleProps) {
  if (state.status === "loading") {
    const percent = state.total > 0 ? Math.floor((state.loaded / state.total) * 100) : 0;
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <Loader2Icon className="size-4 animate-spin" />
        声を読み込み中 <span className="tabular-nums">{percent}%</span>
      </Button>
    );
  }

  const isOn = state.status === "on";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {state.status === "error" ? <span className="text-destructive">{state.message}</span> : null}
      {state.status === "off" && !state.isDownloaded ? <span>初回 約 1.6 GB</span> : null}
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
