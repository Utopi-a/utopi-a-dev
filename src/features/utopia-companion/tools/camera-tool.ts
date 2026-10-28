import { defineTool } from "@/features/utopia-companion/companion-tool";

const LOOK_WORDS =
  /見て|みて|見える|見えて|映って|うつって|これ|それ|あれ|カメラ|何持|なに持|どう見え/;

/** カメラを一緒に見ているときだけ渡す、カメラをいま見る道具 */
export function createCameraTool({ look }: { look: (question: string) => Promise<string> }) {
  return defineTool({
    name: "look_at_camera",
    description:
      "いまカメラに映っているものを見て、質問に答える。相手が「これ何？」「見て」など、カメラの前のものについて聞いたときに使う。",
    parameters: { question: "映っているものについて知りたいこと" },
    describe: () => "カメラを見てる…",
    run: async ({ question }) => look(question),
    isRelevant: (userText) => LOOK_WORDS.test(userText),
  });
}
