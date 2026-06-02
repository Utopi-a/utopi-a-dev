import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">utopi-a.dev</h1>
        <p className="text-muted-foreground">
          Personal full-stack lab — portfolio, diary, experiments, and mini services.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>utopia-stack</CardTitle>
          <CardDescription>
            Next.js · Drizzle · Better Auth · Hono · shadcn/ui のスターター基盤
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Get started</Button>
          <Button variant="outline">View lab</Button>
        </CardContent>
      </Card>
    </div>
  );
}
