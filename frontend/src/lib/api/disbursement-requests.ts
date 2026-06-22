import { fetchApi } from "../api";

export interface DisbursementRequest {
  id: string;
  governancePathId: string;
  spendingItemId: string;
  requestedById: string;
  beneficiaryId?: string;
  beneficiaryName: string;
  beneficiaryNotes?: string;
  amount: number;
  description: string;
  attachments: string[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED" | "CANCELLED";
  reviewedById?: string;
  reviewerNotes?: string;
  decisionId?: string;
  transactionId?: string;
  requestedAt: string;
  reviewedAt?: string;
  executedAt?: string;
  beneficiary?: {
    id: string;
    type: "MEMBER" | "DEPENDENT" | "EXTERNAL";
    displayName: string;
    annualCap?: number;
  };
  spendingItem?: { id: string; name: string };
  governancePath?: { id: string; name: string };
}

export interface CreateDisbursementRequestInput {
  spendingItemId: string;
  beneficiaryId?: string;
  beneficiaryName?: string;
  beneficiaryNotes?: string;
  amount: number;
  description: string;
  attachments?: string[];
}

export function getDisbursementRequests(pathId: string): Promise<DisbursementRequest[]> {
  return fetchApi(`/disbursement-requests?pathId=${pathId}`);
}

export function getDisbursementRequest(id: string): Promise<DisbursementRequest> {
  return fetchApi(`/disbursement-requests/${id}`);
}

export function createDisbursementRequest(
  pathId: string,
  data: CreateDisbursementRequestInput,
): Promise<DisbursementRequest> {
  return fetchApi(`/disbursement-requests?pathId=${pathId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function approveDisbursementRequest(
  id: string,
  decisionId?: string,
  reviewerNotes?: string,
): Promise<DisbursementRequest> {
  return fetchApi(`/disbursement-requests/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ decisionId, reviewerNotes }),
  });
}

export function rejectDisbursementRequest(
  id: string,
  reviewerNotes: string,
): Promise<DisbursementRequest> {
  return fetchApi(`/disbursement-requests/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reviewerNotes }),
  });
}

export function executeDisbursementRequest(
  id: string,
  reference?: string,
): Promise<DisbursementRequest> {
  return fetchApi(`/disbursement-requests/${id}/execute`, {
    method: "PATCH",
    body: JSON.stringify({ reference }),
  });
}

export function cancelDisbursementRequest(id: string): Promise<DisbursementRequest> {
  return fetchApi(`/disbursement-requests/${id}/cancel`, { method: "PATCH" });
}
