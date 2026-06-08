import type { ChatImageAttachment } from "@/features/local-llm/local-llm-chat-view/chat-message-types";

export async function readImageFile({ file }: { file: File }): Promise<ChatImageAttachment> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

  return {
    id: crypto.randomUUID(),
    dataUrl,
    name: file.name,
    mimeType: file.type,
  };
}
