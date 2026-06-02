type SocialProviderConfig = {
  clientId: string;
  clientSecret: string;
};

function readPair({
  clientIdKey,
  clientSecretKey,
}: {
  clientIdKey: string;
  clientSecretKey: string;
}): SocialProviderConfig | undefined {
  const clientId = process.env[clientIdKey];
  const clientSecret = process.env[clientSecretKey];
  if (!clientId || !clientSecret) {
    return undefined;
  }
  return { clientId, clientSecret };
}

export function buildSocialProviders() {
  const providers: Record<string, SocialProviderConfig> = {};

  const github = readPair({
    clientIdKey: "GITHUB_CLIENT_ID",
    clientSecretKey: "GITHUB_CLIENT_SECRET",
  });
  if (github) {
    providers.github = github;
  }

  const google = readPair({
    clientIdKey: "GOOGLE_CLIENT_ID",
    clientSecretKey: "GOOGLE_CLIENT_SECRET",
  });
  if (google) {
    providers.google = google;
  }

  const discord = readPair({
    clientIdKey: "DISCORD_CLIENT_ID",
    clientSecretKey: "DISCORD_CLIENT_SECRET",
  });
  if (discord) {
    providers.discord = discord;
  }

  const twitter = readPair({
    clientIdKey: "TWITTER_CLIENT_ID",
    clientSecretKey: "TWITTER_CLIENT_SECRET",
  });
  if (twitter) {
    providers.twitter = twitter;
  }

  return Object.keys(providers).length > 0 ? providers : undefined;
}
