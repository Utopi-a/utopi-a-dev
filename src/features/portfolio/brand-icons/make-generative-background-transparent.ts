import { isGenerativeBackgroundColor } from "@/features/portfolio/brand-icons/is-generative-background-color";

export function makeGenerativeBackgroundTransparent({ data }: { data: Uint8Array }): Uint8Array {
  const output = new Uint8Array(data);

  for (let index = 0; index < output.length; index += 4) {
    const r = output[index];
    const g = output[index + 1];
    const b = output[index + 2];

    if (!isGenerativeBackgroundColor({ r, g, b })) {
      continue;
    }

    output[index + 3] = 0;
  }

  return output;
}
