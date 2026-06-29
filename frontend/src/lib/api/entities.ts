import { fetchApi } from "../api";

export type EntityPlatformStatus = 'ACTIVE' | 'SUSPENDED' | 'READ_ONLY' | 'PENDING_REVIEW';

export interface Entity {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  myMembershipId?: string | null;
  myRole?: string | null;
  _count?: { memberships: number };
  platformStatus?: EntityPlatformStatus | null;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  closureStatus?: string | null;
  closureRequestedAt?: string | null;
  closureReason?: string | null;
  isCampaign?: boolean | null;
  campaignEndsAt?: string | null;
  parentEntityId?: string | null;
  description?: string | null;
}

export interface EntityMember {
  id: string;
  role: string;
  isActive: boolean;
  person: { id: string; name: string; username: string };
}

export function getEntities(): Promise<Entity[]> {
  return fetchApi("/entities/mine");
}

export function getEntity(id: string): Promise<Entity> {
  return fetchApi(`/entities/${id}`);
}

export function getEntityMembers(entityId: string): Promise<EntityMember[]> {
  return fetchApi(`/entities/${entityId}/members`);
}

export interface DisputeRespondentOption {
  id: string;
  name: string;
}

export function getDisputeRespondentOptions(
  entityId: string,
): Promise<DisputeRespondentOption[]> {
  return fetchApi(`/entities/${entityId}/dispute-respondents`);
}

export interface EntityTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  defaultPolicy?: Record<string, unknown> | null;
  defaultWallets?: Record<string, unknown>[] | null;
  defaultPaths?: Record<string, unknown>[] | null;
}

export function getEntityTemplates(): Promise<EntityTemplate[]> {
  return fetchApi("/entity-templates");
}

export function createEntity(data: {
  name: string;
  type: string;
  description?: string;
  templateId?: string;
  defaultGovernanceType?: string;
  allowMultiplePaths?: boolean;
}) {
  return fetchApi("/entities", { method: "POST", body: JSON.stringify(data) });
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  approvalStatus: "PENDING" | "ACTIVE" | "REJECTED" | "ENDED";
  isActive: boolean;
  terms?: Record<string, unknown>;
  startedAt: string;
  endedAt?: string | null;
  sourceEntity?: { id: string; name: string; type: string };
  targetEntity?: { id: string; name: string; type: string };
}

export function getEntityRelationships(
  entityId: string,
): Promise<{ outgoing: EntityRelationship[]; incoming: EntityRelationship[] }> {
  return fetchApi(`/entity-relationships?entityId=${entityId}`);
}

export function createEntityRelationship(data: {
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  terms?: Record<string, unknown>;
}): Promise<EntityRelationship> {
  return fetchApi("/entity-relationships", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function approveEntityRelationship(id: string): Promise<EntityRelationship> {
  return fetchApi(`/entity-relationships/${id}/approve`, { method: "PATCH" });
}

export function rejectEntityRelationship(id: string): Promise<EntityRelationship> {
  return fetchApi(`/entity-relationships/${id}/reject`, { method: "PATCH" });
}

export function endEntityRelationship(id: string): Promise<void> {
  return fetchApi(`/entity-relationships/${id}`, { method: "DELETE" });
}

export function getSubEntitiesReport(id: string): Promise<unknown> { return fetchApi(`/entities/${id}/sub-entities-report`); }

// ── إدارة العضويات ──────────────────────────────────────────────────────
export function updateMemberRole(
  membershipId: string,
  role: string,
): Promise<EntityMember> {
  return fetchApi(`/memberships/${membershipId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function activateMembership(membershipId: string): Promise<EntityMember> {
  return fetchApi(`/memberships/${membershipId}/activate`, { method: "PATCH" });
}

export function removeMembership(membershipId: string): Promise<void> {
  return fetchApi(`/memberships/${membershipId}`, { method: "DELETE" });
}

export function exportEntityData(entityId: string): Promise<unknown> {
  return fetchApi(`/entities/${entityId}/export`);
}

export interface EntityPolicy {
  id: string;
  entityId: string;
  allowOpenMembership: boolean;
  requiresMemberApproval: boolean;
  allowMultiplePaths: boolean;
  allowSubEntities: boolean;
  allowEntityRelations: boolean;
  allowedGovernanceTypes: string[];
  defaultVoteType: string;
  decisionQuorumPercent: number;
  defaultTransparency: string;
  allowAppeals: boolean;
  appealTimeoutDays: number;
  version: number;
}

export function getEntityPolicy(entityId: string): Promise<EntityPolicy> {
  return fetchApi(`/entities/${entityId}/policy`);
}

export function updateEntityPolicy(
  entityId: string,
  data: Partial<EntityPolicy>,
): Promise<EntityPolicy> {
  return fetchApi(`/entities/${entityId}/policy`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface PolicyImpact {
  field: string;
  value: string;
  activeMembers: number;
  activeSubscriptions: number;
  pendingAppeals: number;
  openDecisions: number;
  affected: string[];
  appliesAt: string;
}

export function getPolicyImpact(
  entityId: string,
  field: string,
  value: string,
): Promise<PolicyImpact> {
  return fetchApi(`/entities/${entityId}/policy/impact?field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`);
}

export interface SuspensionAppeal {
  id: string;
  entityId: string;
  reason: string;
  status: string;
  response?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export function submitSuspensionAppeal(
  entityId: string,
  reason: string,
): Promise<SuspensionAppeal> {
  return fetchApi(`/entities/${entityId}/platform-appeal`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function getEntitySuspensionAppeals(
  entityId: string,
): Promise<SuspensionAppeal[]> {
  return fetchApi(`/entities/${entityId}/platform-appeals`);
}

export function updateEntity(
  entityId: string,
  data: { name?: string; description?: string; bankAccountNumber?: string; bankName?: string },
): Promise<Entity> {
  return fetchApi(`/entities/${entityId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface ClosureCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string | null;
}

export interface ClosureChecklist {
  checks: ClosureCheck[];
  canClose: boolean;
}

export function getClosureChecklist(entityId: string): Promise<ClosureChecklist> {
  return fetchApi(`/entities/${entityId}/closure-checklist`);
}

export function requestClosure(entityId: string, reason: string): Promise<{ id: string; closureStatus: string }> {
  return fetchApi(`/entities/${entityId}/request-closure`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
