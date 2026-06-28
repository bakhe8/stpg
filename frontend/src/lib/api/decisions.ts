import { fetchApi } from "../api";

export interface Decision {
  id: string;
  title: string;
  decisionType: string;
  status: string;
  result: string;
  executionStatus?: string;
  voteType: string;
  votersScope: string;
  quorumPercent?: number;
  approvalPercent?: number;
  amount?: number | null;
  closesAt: string;
  createdAt: string;
  canVote?: boolean;
  hasVoted?: boolean;
  governancePath?: {
    id: string;
    name: string;
    wallet?: { entityId: string };
  };
  _count?: { votes: number; appeals?: number };
}

export interface Vote {
  id: string;
  choice: string;
  notes?: string;
  person?: { id: string; name: string };
}

export function getDecisions(pathId?: string): Promise<Decision[]> {
  const qs = pathId ? `?pathId=${pathId}` : "";
  return fetchApi(`/decisions${qs}`);
}

export function getDecision(
  id: string,
): Promise<Decision & { votes?: Vote[] }> {
  return fetchApi(`/decisions/${id}`);
}

export function createDecision(data: Record<string, unknown>) {
  return fetchApi("/decisions", { method: "POST", body: JSON.stringify(data) });
}

export function castVote(decisionId: string, choice: string, notes?: string) {
  return fetchApi(`/decisions/${decisionId}/votes`, {
    method: "POST",
    body: JSON.stringify({ choice, notes }),
  });
}

export function closeDecision(decisionId: string) {
  return fetchApi(`/decisions/${decisionId}/close`, { method: "POST" });
}

export function retryExecution(decisionId: string) {
  return fetchApi(`/decisions/${decisionId}/retry-execution`, { method: "POST" });
}
