import type { GmailTokens } from "./types";

const ACCESS_KEY = "gmail_access_token";
const EXPIRES_KEY = "gmail_token_expires_at";
const PKCE_VERIFIER_KEY = "gmail_pkce_verifier";

export function saveTokens(tokens: GmailTokens): void {
  sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
  sessionStorage.setItem(EXPIRES_KEY, String(tokens.expiresAt));
}

export function getTokens(): GmailTokens | null {
  const accessToken = sessionStorage.getItem(ACCESS_KEY);
  const expiresRaw = sessionStorage.getItem(EXPIRES_KEY);
  if (!accessToken || !expiresRaw) return null;
  const expiresAt = parseInt(expiresRaw, 10);
  if (Number.isNaN(expiresAt)) return null;
  return { accessToken, expiresAt };
}

export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
}

export function isTokenValid(tokens: GmailTokens | null = getTokens()): boolean {
  if (!tokens) return false;
  return Date.now() < tokens.expiresAt - 60_000;
}

export function savePkceVerifier(verifier: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
}

export function consumePkceVerifier(): string | null {
  const v = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  return v;
}
