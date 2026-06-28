import { fetchApi } from "../api";

export interface Appeal {
  id: string;
  decisionId: string;
  type: string;
  reason: string;
  requestedAction?: string | null;
  status: string;
  responseDeadline?: string;
  reviewerNotes?: string | null;
  createdAt: string;
  appealedBy?: { id: string; name: string };
  decision?: { id: string; title: string; decisionType: string };
}

export function fileAppeal(data: {
  decisionId: string;
  type: string;
  reason: string;
  evidence?: string[];
  requestedAction?: string;
}): Promise<Appeal> {
  return fetchApi("/appeals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getDecisionAppeals(decisionId: string): Promise<Appeal[]> {
  return fetchApi(`/appeals?decisionId=${decisionId}`);
}

export function respondToAppeal(
  id: string,
  data: { status: string; reviewerNotes: string },
): Promise<Appeal> {
  return fetchApi(`/appeals/${id}/respond`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
