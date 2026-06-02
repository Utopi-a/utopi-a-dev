# utopi-a.dev

Personal full-stack lab — portfolio, diary, experiments, and mini services.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM + PostgreSQL
- Better Auth (GitHub OAuth)
- Hono (RPC API on Route Handlers)
- Biome + Lefthook + Vitest

## Development

```bash
pnpm install
cp .env.example .env.local
# Fill DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, GitHub OAuth keys
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm check` | Biome format + lint |
| `pnpm test:run` | Vitest |
| `pnpm typecheck` | TypeScript |
| `pnpm db:generate` | Drizzle migration generate |
| `pnpm db:migrate` | Apply migrations |

## Routes

**Public:** `/`, `/work`, `/lab`, `/blog`

**App (protected):** `/dashboard`, `/diary`, `/settings`

**API:** `/api/auth/*`, `/api/rpc/health`, `/api/webhooks/stripe`
