import { fetchApi } from "../api";

export interface MemberPreference {
  id: string;
  membershipId: string;
  acceptedGovernanceTypes: string[];
  maxSpendingCapAccepted?: number | string | null;
  requiresAuditAccess: boolean;
  requiresCommitteeApproval: boolean;
  notes?: string | null;
}

export function getMembershipPreferences(
  membershipId: string,
): Promise<MemberPreference | null> {
  return fetchApi(`/memberships/${membershipId}/preferences`);
}
