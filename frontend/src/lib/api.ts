export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  console.error("CRITICAL: NEXT_PUBLIC_API_URL is missing. API calls may fail.");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
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
    const currentEntityId = localStorage.getItem("currentEntityId");
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
