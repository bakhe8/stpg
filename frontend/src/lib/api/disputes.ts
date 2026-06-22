import { fetchApi } from "../api";

export interface Dispute {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  entityId: string;
  walletId?: string | null;
  governancePathId?: string | null;
  linkedAppealId?: string | null;
  policyVersionId?: string | null;
  initiatorId: string;
  respondentId?: string;
  arbitratorId?: string;
  resolution?: string;
  deadline?: string;
  closedAt?: string;
  createdAt: string;
  initiator?: { name: string };
  respondent?: { name: string };
  arbitrator?: { name: string };
}

export function getMyDisputes(): Promise<Dispute[]> {
  return fetchApi("/disputes/mine");
}

export function getEntityDisputes(entityId: string): Promise<Dispute[]> {
  return fetchApi(`/disputes?entityId=${entityId}`);
}

export function getDispute(id: string): Promise<Dispute> {
  return fetchApi(`/disputes/${id}`);
}

export function openDispute(data: {
  entityId: string;
  walletId?: string;
  governancePathId?: string;
  title: string;
  description: string;
  type: string;
  respondentId?: string;
  linkedAppealId?: string;
  deadline?: string;
}): Promise<Dispute> {
  return fetchApi("/disputes", { method: "POST", body: JSON.stringify(data) });
}

export function resolveDispute(
  id: string,
  data: { status: string; resolution?: string; arbitratorNotes?: string },
): Promise<Dispute> {
  return fetchApi(`/disputes/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function escalateDispute(id: string): Promise<Dispute> {
  return fetchApi(`/disputes/${id}/escalate`, { method: "PATCH" });
}
