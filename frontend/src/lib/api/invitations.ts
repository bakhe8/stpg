import { API_BASE_URL, fetchApi, getToken } from "../api";

export interface InvitationPreview {
  entityId: string;
  entityName: string;
  entityType: string;
  description?: string;
  logoUrl?: string;
  memberCount: number;
}

export interface JoinResult {
  accessToken: string;
  refreshToken: string;
  person: { id: string; name: string; isVerified: boolean };
  application: {
    id: string;
    entityId: string;
    status: "PENDING";
  };
}

export interface JoinApplicationContext {
  relationshipDescription?: string;
  sponsorName?: string;
  note?: string;
}

export function createInvitation(data: {
  entityId: string;
  expiresAt?: string;
  maxUses?: number;
}): Promise<{ token: string; invitationId: string }> {
  return fetchApi("/invitations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getInvitationPreview(token: string): Promise<InvitationPreview> {
  return fetchApi(`/invitations/${token}/preview`, {}, null);
}

export async function joinViaInvitation(
  token: string,
  data: {
    name: string;
    phoneNumber?: string;
    email?: string;
  } & JoinApplicationContext,
): Promise<JoinResult> {
  const res = await fetch(`${API_BASE_URL}/invitations/${token}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "JOIN_ERROR");
  }
  return res.json() as Promise<JoinResult>;
}

export async function joinMeViaInvitation(
  token: string,
  context: JoinApplicationContext,
): Promise<{
  message: string;
  entityId: string;
  applicationId: string;
  status: "PENDING";
}> {
  const authToken = getToken();
  const res = await fetch(`${API_BASE_URL}/invitations/${token}/join-me`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(context),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "JOIN_ERROR");
  }
  return res.json() as Promise<{
    message: string;
    entityId: string;
    applicationId: string;
    status: "PENDING";
  }>;
}
