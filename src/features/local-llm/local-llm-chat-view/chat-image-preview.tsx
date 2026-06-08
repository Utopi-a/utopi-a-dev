type ChatImagePreviewProps = {
  src: string;
  alt: string;
  className?: string;
};

export function ChatImagePreview({ src, alt, className }: ChatImagePreviewProps) {
  return (
    // Data URL previews are ephemeral local attachments; next/image is not a fit here.
    <img src={src} alt={alt} className={className} />
  );
}
