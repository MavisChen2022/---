import { GMAIL_READONLY_SCOPE } from "./types";
import { clearTokens, saveTokens } from "./token-storage";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
}

export function getRedirectUri(): string {
  const base = import.meta.env.BASE_URL || "/";
  const path = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${path}`;
}

export function isOAuthConfigured(): boolean {
  return getGoogleClientId().length > 0;
}

export async function startOAuthLogin(): Promise<void> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("未設定 VITE_GOOGLE_CLIENT_ID");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    // Browser-only MVP: use Google's client-side token flow so no client_secret is needed.
    response_type: "token",
    scope: GMAIL_READONLY_SCOPE,
    include_granted_scopes: "true",
    prompt: "consent",
  });

  window.location.assign(`${AUTH_URL}?${params.toString()}`);
}

export function parseOAuthCallback(
  search: string,
  hash = typeof window !== "undefined" ? window.location.hash : "",
): {
  accessToken: string | null;
  expiresIn: number | null;
  error: string | null;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const expiresInRaw = hashParams.get("expires_in");
  return {
    accessToken: hashParams.get("access_token"),
    expiresIn: expiresInRaw ? parseInt(expiresInRaw, 10) : null,
    error: params.get("error") ?? hashParams.get("error"),
  };
}

export function clearOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("scope");
  url.searchParams.delete("authuser");
  url.searchParams.delete("prompt");
  url.searchParams.delete("error");
  window.history.replaceState({}, "", url.pathname + url.search);
}

export function saveOAuthTokenFromCallback(accessToken: string, expiresIn: number | null): void {
  saveTokens({
    accessToken,
    expiresAt: Date.now() + (expiresIn ?? 3600) * 1000,
  });
}

export function disconnectOAuth(): void {
  clearTokens();
}
