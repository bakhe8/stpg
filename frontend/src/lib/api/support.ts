import { fetchApi } from "../api";

export interface SupportSession {
  id: string;
  entityId: string;
  platformAccountId: string;
  scope: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  platformAccount?: {
    name: string;
    email: string;
  };
}

export async function getActiveSessions(entityId: string): Promise<SupportSession[]> {
  return fetchApi(`/support/sessions/${entityId}`);
}

export async function createSupportSession(data: { entityId: string; platformAccountId: string; scope: string; hours: number }) {
  return fetchApi("/support/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function revokeSupportSession(sessionId: string, entityId: string) {
  return fetchApi(`/support/sessions/${sessionId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ entityId }),
  });
}
