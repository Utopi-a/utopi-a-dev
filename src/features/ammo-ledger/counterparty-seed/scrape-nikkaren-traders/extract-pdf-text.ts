import pdfParse from "pdf-parse";

export async function extractPdfText({ buffer }: { buffer: Buffer }): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}
