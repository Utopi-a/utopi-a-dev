/**
 * 読み上げに使う、ゆーとぴあちゃんの声。作り方・作り直し方は scripts/utopia-voice/README.md。
 * 手本の潜在はこのキャプションで合成した音声から作ったので、2 つは一緒に変える。
 */
export const UTOPIA_VOICE = {
  caption:
    "ほんわかした雰囲気の、少し不思議な女の子の声。やわらかく少し高めの声で、穏やかにゆっくり、好奇心をにじませて話している。",
  /** 手本の声を DACVAE で符号化した潜在（float32・リトルエンディアン、フレーム × 32） */
  referenceLatentPath: "/utopia-voice/irodori-reference-latent.bin",
} as const;

export type IrodoriVoice = { caption: string; referenceLatentPath: string };
