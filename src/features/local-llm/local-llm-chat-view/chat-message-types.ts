export type ChatImageAttachment = {
  id: string;
  dataUrl: string;
  name: string;
  mimeType: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: ChatImageAttachment[];
};
