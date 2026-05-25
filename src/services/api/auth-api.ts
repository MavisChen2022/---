import { apiFetch, getApiBaseUrl } from "./config";

export interface AuthStatus {
  connected: boolean;
  email: string | null;
  status: "ok" | "auth_error";
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  return apiFetch<AuthStatus>("/api/auth/status");
}

export function startBackendOAuthLogin(): void {
  window.location.assign(`${getApiBaseUrl()}/api/auth/login`);
}

export async function logoutBackendSession(): Promise<void> {
  await apiFetch<{ connected: false }>("/api/auth/logout", { method: "POST" });
}

export function consumeOAuthErrorFromUrl(): string | null {
  const url = new URL(window.location.href);
  const error = url.searchParams.get("oauth_error");
  if (error) {
    url.searchParams.delete("oauth_error");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }
  return error;
}
