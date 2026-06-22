import { fetchApi } from "../api";

export interface Beneficiary {
  id: string;
  entityId: string;
  type: "MEMBER" | "DEPENDENT" | "EXTERNAL";
  displayName: string;
  notes?: string | null;
  annualCap?: number | null;
  membershipId?: string | null;
  dependentId?: string | null;
}

export function getBeneficiaries(entityId: string): Promise<Beneficiary[]> {
  return fetchApi(`/beneficiaries?entityId=${entityId}`);
}

export function createBeneficiary(
  entityId: string,
  data: {
    type: "MEMBER" | "DEPENDENT" | "EXTERNAL";
    membershipId?: string;
    dependentId?: string;
    displayName?: string;
    notes?: string;
    annualCap?: number;
  },
): Promise<Beneficiary> {
  return fetchApi(`/beneficiaries?entityId=${entityId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
