import type { ChatAudioClip } from "@/features/local-llm/local-llm-chat-view/chat-message-types";

// LFM3-Omni の音声エンコーダが受け取るサンプルレート
const HEARD_SAMPLE_RATE = 16_000;

/** 音声ファイルや録音を 16 kHz モノラルにする。16 kHz の OfflineAudioContext でデコードするとリサンプルされる */
export async function readAudioFile({
  file,
  name,
}: {
  file: Blob;
  name: string;
}): Promise<ChatAudioClip> {
  const context = new OfflineAudioContext(1, 1, HEARD_SAMPLE_RATE);
  const decoded = await context.decodeAudioData(await file.arrayBuffer());
  const samples = new Float32Array(decoded.length);
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const values = decoded.getChannelData(channel);
    for (let index = 0; index < samples.length; index++) {
      samples[index] += values[index] / decoded.numberOfChannels;
    }
  }

  return {
    id: crypto.randomUUID(),
    name,
    seconds: samples.length / HEARD_SAMPLE_RATE,
    samples,
  };
}
