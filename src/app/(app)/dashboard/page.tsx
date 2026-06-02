import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {session ? `Signed in as ${session.user.email}` : "Not signed in"}
        </CardContent>
      </Card>
    </div>
  );
}
