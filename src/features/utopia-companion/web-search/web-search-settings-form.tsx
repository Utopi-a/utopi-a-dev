"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WEB_SEARCH_PROVIDERS,
  type WebSearchProvider,
  type WebSearchSettings,
} from "@/features/utopia-companion/web-search/web-search-settings";

/** ネット検索の API キーを入れる欄。キーはこのブラウザにだけ保存する */
export function WebSearchSettingsForm({
  settings,
  onSave,
  onClear,
}: {
  settings: WebSearchSettings | null;
  onSave: (settings: WebSearchSettings) => void;
  onClear: () => void;
}) {
  const keyId = useId();
  const [provider, setProvider] = useState<WebSearchProvider>(settings?.provider ?? "tavily");
  const [apiKey, setApiKey] = useState("");
  const providerInfo = WEB_SEARCH_PROVIDERS.find(({ id }) => id === provider);

  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">
        ネット検索
        {settings
          ? `（${WEB_SEARCH_PROVIDERS.find(({ id }) => id === settings.provider)?.label}）`
          : "（API キーを入れると使える）"}
      </summary>
      <form
        className="mt-2 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (apiKey.trim()) {
            onSave({ provider, apiKey });
            setApiKey("");
          }
        }}
      >
        <div className="flex gap-2" role="radiogroup" aria-label="検索に使うサービス">
          {WEB_SEARCH_PROVIDERS.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={provider === id ? "default" : "outline"}
              role="radio"
              aria-checked={provider === id}
              onClick={() => setProvider(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="flex flex-wrap gap-x-2">
          <label htmlFor={keyId}>{providerInfo?.label} の API キー</label>
          <a
            href={providerInfo?.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            キーを発行する
          </a>
        </p>
        <div className="flex gap-2">
          <Input
            id={keyId}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={settings ? "入れ直すときだけ" : ""}
          />
          <Button type="submit" size="sm" disabled={apiKey.trim().length === 0}>
            保存
          </Button>
        </div>
        <p>
          キーはこのブラウザにだけ保存し、検索のたびに{" "}
          {provider === "tavily"
            ? "Tavily へ直接"
            : "このサイトを通して Exa へ（中継では保存しません）"}
          送ります。
        </p>
        {settings ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            キーを消す
          </Button>
        ) : null}
      </form>
    </details>
  );
}
