import { fetchApi } from "../api";

export type MembershipApplicationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface MembershipApplication {
  id: string;
  personId: string;
  entityId: string;
  status: MembershipApplicationStatus;
  requestedRole: "MEMBER" | "ADMIN" | "FOUNDER";
  relationshipDescription?: string | null;
  sponsorName?: string | null;
  note?: string | null;
  reviewerNotes?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  entity?: { id: string; name: string; type: string };
  person?: {
    id: string;
    name: string;
    username: string;
    phoneNumber?: string | null;
    email?: string | null;
    isVerified: boolean;
  };
}

export function getMyMembershipApplications() {
  return fetchApi<MembershipApplication[]>("/membership-applications/mine");
}

export function getEntityMembershipApplications(entityId: string) {
  return fetchApi<MembershipApplication[]>(
    `/membership-applications/entity/${entityId}`,
  );
}

export function approveMembershipApplication(
  applicationId: string,
  reviewerNotes?: string,
) {
  return fetchApi(`/membership-applications/${applicationId}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ reviewerNotes }),
  });
}

export function rejectMembershipApplication(
  applicationId: string,
  reviewerNotes: string,
) {
  return fetchApi(`/membership-applications/${applicationId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reviewerNotes }),
  });
}

export function cancelMembershipApplication(applicationId: string) {
  return fetchApi(`/membership-applications/${applicationId}/cancel`, {
    method: "PATCH",
  });
}
