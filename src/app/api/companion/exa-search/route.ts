import { relayExaSearch } from "@/features/utopia-companion/server/relay-exa-search";

export async function POST(request: Request) {
  return relayExaSearch({ request });
}
