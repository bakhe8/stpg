import { fetchApi } from "../api";

export interface GovernancePath {
  id: string;
  name: string;
  description?: string;
  type: string;
  isActive: boolean;
  walletId: string;
  balance: number;
  currency: string;
  ledgerAccountId?: string;
  wallet?: { id: string; name: string; entityId: string };
}

export interface SpendingItem {
  id: string;
  name: string;
  description?: string;
  maxAmountPerRequest?: number;
  maxAmountPerYear?: number;
  requiresCommitteeApproval: boolean;
  allowsException: boolean;
  privacyLevel?: string;
  isActive: boolean;
  governancePathId: string;
  ledgerAccount?: { balance: number };
}

interface GovernancePathResponse extends Omit<
  GovernancePath,
  "balance" | "currency" | "ledgerAccountId"
> {
  ledgerAccount?: {
    id: string;
    balance: number | string;
    currency: string;
  } | null;
}

export async function getPath(id: string): Promise<GovernancePath> {
  const path = await fetchApi<GovernancePathResponse>(`/paths/${id}`);
  return {
    ...path,
    balance: Number(path.ledgerAccount?.balance ?? 0),
    currency: path.ledgerAccount?.currency ?? "SAR",
    ledgerAccountId: path.ledgerAccount?.id,
  };
}

export function getPathSpendingItems(pathId: string): Promise<SpendingItem[]> {
  return fetchApi(`/paths/${pathId}/spending-items`);
}

export function createSpendingItem(
  pathId: string,
  data: {
    name: string;
    description?: string;
    maxAmountPerRequest?: number;
    maxAmountPerYear?: number;
    requiresCommitteeApproval?: boolean;
    privacyLevel?: string;
  },
): Promise<SpendingItem> {
  return fetchApi(`/paths/${pathId}/spending-items`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
