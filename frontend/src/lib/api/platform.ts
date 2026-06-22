import { API_BASE_URL } from "../api";

export interface PlatformAccount {
  id: string;
  name: string;
  role: "OWNER" | "SUPER_ADMIN" | "SUPPORT" | "ANALYST";
}

export interface PlatformLoginResponse {
  accessToken: string;
  account: PlatformAccount;
}

export interface PlatformEntity {
  id: string;
  name: string;
  type: string;
  platformStatus: "ACTIVE" | "SUSPENDED" | "READ_ONLY" | "PENDING_REVIEW";
  suspendedAt: string | null;
  suspendedReason: string | null;
  foundedAt: string;
  _count: { memberships: number };
}

export interface PlatformAccessLogEntry {
  id: string;
  accessType: "READ" | "SUPPORT" | "ADMIN_ACTION" | "BREAK_GLASS";
  dataScope: string;
  reason: string;
  startedAt: string;
  endedAt: string | null;
  notifiedEntityAdmin: boolean;
  platformAccount: { name: string; role: string };
}

function getPlatformToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("platformAccessToken");
}

async function platformFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getPlatformToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export async function platformLogin(
  email: string,
  password: string,
): Promise<PlatformLoginResponse> {
  const data = await platformFetch<PlatformLoginResponse>(
    "/platform-auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  localStorage.setItem("platformAccessToken", data.accessToken);
  localStorage.setItem("platformAccount", JSON.stringify(data.account));
  document.cookie = `platformAccessToken=${data.accessToken}; path=/platform; max-age=3600; samesite=lax`;
  return data;
}

export function getPlatformAccount(): PlatformAccount | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("platformAccount");
  return raw ? (JSON.parse(raw) as PlatformAccount) : null;
}

export function platformLogout() {
  localStorage.removeItem("platformAccessToken");
  localStorage.removeItem("platformAccount");
  document.cookie = "platformAccessToken=; path=/platform; max-age=0";
}

export function getEntitiesList(params?: {
  status?: string;
  page?: number;
}): Promise<{ entities: PlatformEntity[]; total: number; page: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  return platformFetch(`/platform/entities?${q.toString()}`);
}

export function suspendEntity(
  entityId: string,
  reason: string,
  statusType: string,
): Promise<PlatformEntity> {
  return platformFetch(`/platform/entities/${entityId}/suspend`, {
    method: "PATCH",
    body: JSON.stringify({ reason, statusType }),
  });
}

export function activateEntity(entityId: string): Promise<PlatformEntity> {
  return platformFetch(`/platform/entities/${entityId}/activate`, {
    method: "PATCH",
  });
}

export function getPlatformAccessLogs(
  entityId: string,
  token: string,
): Promise<PlatformAccessLogEntry[]> {
  // هذا يُستدعى من Tenant context لذا يستخدم tenant token
  return fetch(`${API_BASE_URL}/entities/${entityId}/platform-access-logs`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }).then((r) => r.json()) as Promise<PlatformAccessLogEntry[]>;
}

export interface PlatformSuspensionAppeal {
  id: string;
  entityId: string;
  submittedById: string;
  reason: string;
  status: "PENDING" | "REVIEWED" | "RESOLVED";
  response: string | null;
  createdAt: string;
  resolvedAt: string | null;
  submittedBy: { name: string; username: string };
}

export function getAppeals(params?: {
  status?: string;
  page?: number;
}): Promise<{ appeals: PlatformSuspensionAppeal[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  return platformFetch(`/platform/appeals?${q.toString()}`);
}

export function respondToAppeal(
  appealId: string,
  response: string,
  status: "REVIEWED" | "RESOLVED",
): Promise<PlatformSuspensionAppeal> {
  return platformFetch(`/platform/appeals/${appealId}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ response, status }),
  });
}
