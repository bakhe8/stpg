// في الإنتاج: /api (مسار نسبي — Caddy يوجّه /api* للباكند)
// في التطوير المحلي: http://localhost:3001/api
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "/api"
    : "http://localhost:3001/api");

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function inferEntityIdFromEndpoint(
  endpoint: string,
  method = "GET",
): string | null {
  const [, queryString] = endpoint.split("?");
  if (queryString) {
    const queryEntityId = new URLSearchParams(queryString).get("entityId");
    if (queryEntityId && UUID_RE.test(queryEntityId)) return queryEntityId;
  }

  const path = endpoint.split("?")[0];
  if (
    method.toUpperCase() === "POST" &&
    /^\/entities\/[0-9a-f-]{36}\/(?:join|memberships)$/i.test(path)
  ) {
    return null;
  }

  const patterns = [
    /^\/entities\/([0-9a-f-]{36})(?:\/|$)/i,
    /^\/analytics\/entities\/([0-9a-f-]{36})(?:\/|$)/i,
    /^\/auditor\/([0-9a-f-]{36})(?:\/|$)/i,
    /^\/support\/sessions\/([0-9a-f-]{36})(?:\/|$)/i,
    /^\/membership-applications\/entity\/([0-9a-f-]{36})(?:\/|$)/i,
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match?.[1] && UUID_RE.test(match[1])) return match[1];
  }

  return null;
}

function persistAccessToken(accessToken: string) {
  localStorage.setItem("accessToken", accessToken);
  document.cookie = `accessToken=${accessToken}; path=/; max-age=900; samesite=lax`;
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { accessToken: string };
  persistAccessToken(data.accessToken);
  return data.accessToken;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const authToken = token ?? getToken();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  if (typeof window !== "undefined") {
    const inferredEntityId = inferEntityIdFromEndpoint(
      endpoint,
      options.method,
    );
    const currentEntityId =
      inferredEntityId ?? localStorage.getItem("currentEntityId");
    if (currentEntityId && !headers.has("X-Entity-ID")) {
      headers.set("X-Entity-ID", currentEntityId);
    }
  }

  let response = await fetch(url, { ...options, headers });
  if (response.status === 401 && !endpoint.startsWith("/auth/")) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set("Authorization", `Bearer ${refreshedToken}`);
      response = await fetch(url, { ...options, headers });
    } else {
      // Refresh failed — clear session and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("personId");
        window.location.replace("/login");
      }
      throw new Error("SESSION_EXPIRED");
    }
  }
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const msg = data?.message;
    const errorMessage = Array.isArray(msg)
      ? msg.join(", ")
      : msg || response.statusText || "UNEXPECTED_ERROR";
    throw new Error(String(errorMessage));
  }

  return data as T;
}
