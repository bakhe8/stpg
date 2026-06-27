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
