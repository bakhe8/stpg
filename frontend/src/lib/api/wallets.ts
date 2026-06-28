import { fetchApi } from "../api";

export interface Wallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  isActive: boolean;
  entityId: string;
  benefitType: WalletBenefitType;
  ledgerAccountId?: string;
}

export type WalletBenefitType = "SEPARABLE" | "SHARED";

export function createWallet(
  entityId: string,
  data: {
    name: string;
    description?: string;
    benefitType: WalletBenefitType;
  },
) {
  return fetchApi(`/entities/${entityId}/wallets`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface GovernancePath {
  id: string;
  name: string;
  walletId: string;
  isActive: boolean;
  type?: string;
  balance: number;
  currency: string;
  ledgerAccountId?: string;
  _count?: { subscriptions?: number; spendingItems?: number };
}

interface WalletResponse {
  id: string;
  name: string;
  entityId: string;
  benefitType?: WalletBenefitType;
  isActive: boolean;
  ledgerAccount?: {
    id: string;
    balance: number | string;
    currency: string;
  } | null;
}

interface GovernancePathResponse {
  id: string;
  name: string;
  walletId: string;
  type: string;
  isActive: boolean;
  _count?: { subscriptions?: number; spendingItems?: number };
  ledgerAccount?: {
    id: string;
    balance: number | string;
    currency: string;
  } | null;
}

function mapWallet(wallet: WalletResponse): Wallet {
  return {
    id: wallet.id,
    name: wallet.name,
    entityId: wallet.entityId,
    benefitType: wallet.benefitType ?? "SEPARABLE",
    isActive: wallet.isActive,
    balance: Number(wallet.ledgerAccount?.balance ?? 0),
    currency: wallet.ledgerAccount?.currency ?? "SAR",
    ledgerAccountId: wallet.ledgerAccount?.id,
  };
}

function mapPath(path: GovernancePathResponse): GovernancePath {
  return {
    id: path.id,
    name: path.name,
    walletId: path.walletId,
    type: path.type,
    isActive: path.isActive,
    balance: Number(path.ledgerAccount?.balance ?? 0),
    currency: path.ledgerAccount?.currency ?? "SAR",
    ledgerAccountId: path.ledgerAccount?.id,
    _count: path._count,
  };
}

export async function getEntityWallets(entityId: string): Promise<Wallet[]> {
  const wallets = await fetchApi<WalletResponse[]>(
    `/entities/${entityId}/wallets`,
  );
  return wallets.map(mapWallet);
}

export async function getWallet(id: string): Promise<Wallet> {
  return mapWallet(await fetchApi<WalletResponse>(`/wallets/${id}`));
}

export async function getWalletPaths(
  walletId: string,
): Promise<GovernancePath[]> {
  const paths = await fetchApi<GovernancePathResponse[]>(
    `/wallets/${walletId}/paths`,
  );
  return paths.map(mapPath);
}

export interface WalletRelationship {
  id: string;
  sourceWalletId: string;
  targetWalletId: string;
  relationshipType: string;
  contributionPercent?: number;
  hasVotingRights: boolean;
  hasOversightRights: boolean;
  approvalStatus: string;
  isActive: boolean;
  sourceWallet?: { name: string; entity?: { name: string } };
  targetWallet?: { name: string; entity?: { name: string } };
}

export async function getWalletRelationships(walletId: string): Promise<{
  incoming: WalletRelationship[];
  outgoing: WalletRelationship[];
}> {
  return fetchApi(`/wallet-relationships?walletId=${walletId}`);
}

export async function createWalletRelationship(data: {
  sourceWalletId: string;
  targetWalletId: string;
  relationshipType: string;
  contributionPercent?: number;
  hasVotingRights?: boolean;
  hasOversightRights?: boolean;
}) {
  return fetchApi('/wallet-relationships', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveWalletRelationship(id: string) {
  return fetchApi(`/wallet-relationships/${id}/approve`, {
    method: 'PATCH',
  });
}

export async function rejectWalletRelationship(id: string, reason?: string) {
  return fetchApi(`/wallet-relationships/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}
