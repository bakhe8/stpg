import { fetchApi } from "../api";

export interface BalanceTransferRequest {
  id: string;
  fromPathId: string;
  toPathId: string;
  amount: number | string;
  reason: string;
  status: string;
  decisionId?: string | null;
  transactionId?: string | null;
  reviewedAt?: string | null;
  executedAt?: string | null;
  createdAt: string;
  decision?: {
    id: string;
    status: string;
    result: string;
  } | null;
}

export function createBalanceTransferRequest(
  entityId: string,
  data: {
    fromPathId: string;
    toPathId: string;
    amount: number;
    reason: string;
  },
): Promise<BalanceTransferRequest> {
  return fetchApi("/balance-transfer-requests", {
    method: "POST",
    headers: { "X-Entity-ID": entityId },
    body: JSON.stringify(data),
  });
}

export function getPathBalanceTransferRequests(
  entityId: string,
  pathId: string,
): Promise<BalanceTransferRequest[]> {
  return fetchApi(`/balance-transfer-requests/path/${pathId}`, {
    headers: { "X-Entity-ID": entityId },
  });
}
