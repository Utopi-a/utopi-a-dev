import { PublicPageShell } from "@/components/layout/public-page-shell";
import { BlogPlaceholder } from "@/features/portfolio/blog-placeholder/blog-placeholder";

export default function BlogPage() {
  return (
    <PublicPageShell width="content">
      <BlogPlaceholder />
    </PublicPageShell>
  );
}
