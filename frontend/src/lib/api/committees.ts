import { fetchApi } from "../api";

export interface Committee {
  id: string;
  entityId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { members: number; paths: number };
  members?: CommitteeMember[];
  paths?: CommitteePath[];
}

export interface CommitteeMember {
  committeeId: string;
  membershipId: string;
  membership: {
    id: string;
    person: { id: string; name: string };
  };
}

export interface CommitteePath {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export function getCommittees(entityId: string): Promise<Committee[]> {
  return fetchApi(`/committees?entityId=${entityId}`);
}

export function getCommittee(id: string): Promise<Committee> {
  return fetchApi(`/committees/${id}`);
}

export function createCommittee(data: {
  entityId: string;
  name: string;
  description?: string;
}): Promise<Committee> {
  return fetchApi("/committees", { method: "POST", body: JSON.stringify(data) });
}

export function addCommitteeMember(
  committeeId: string,
  membershipId: string,
): Promise<CommitteeMember> {
  return fetchApi(`/committees/${committeeId}/members`, {
    method: "POST",
    body: JSON.stringify({ membershipId }),
  });
}

export function removeCommitteeMember(
  committeeId: string,
  membershipId: string,
): Promise<{ removed: boolean }> {
  return fetchApi(`/committees/${committeeId}/members/${membershipId}`, {
    method: "DELETE",
  });
}

export function assignPathToCommittee(
  committeeId: string,
  pathId: string,
): Promise<{ assigned: boolean }> {
  return fetchApi(`/committees/${committeeId}/paths/${pathId}/assign`, {
    method: "PATCH",
  });
}

export function unassignPathFromCommittee(
  committeeId: string,
  pathId: string,
): Promise<{ unassigned: boolean }> {
  return fetchApi(`/committees/${committeeId}/paths/${pathId}/unassign`, {
    method: "PATCH",
  });
}
