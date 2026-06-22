import { fetchApi } from "../api";

export interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  description?: string;
  reference?: string;
  createdAt: string;
  recordedBy?: { name: string };
}

export interface LedgerAccount {
  id: string;
  type: string;
  balance: number;
  currency: string;
}

export interface EntitySummary {
  entityId: string;
  wallets: Array<{
    id: string;
    name: string;
    balance: number;
    currency: string;
    paths: Array<{
      id: string;
      name: string;
      account?: LedgerAccount;
    }>;
  }>;
}

interface EntitySummaryResponse {
  id: string;
  ledgerAccount?: { balance: number | string; currency: string } | null;
  wallets: Array<{
    id: string;
    name: string;
    ledgerAccount?: { balance: number | string; currency: string } | null;
    governancePaths: Array<{
      id: string;
      name: string;
      ledgerAccount?: {
        id: string;
        balance: number | string;
        currency: string;
      } | null;
    }>;
  }>;
}

interface AccountTransactionsResponse {
  account: {
    id: string;
    type: string;
    balance: number | string;
  };
  entries: Array<{
    id: string;
    type: string;
    amount: number | string;
    createdAt: string;
    transaction: {
      id: string;
      description: string;
      reference?: string | null;
      createdAt: string;
    };
  }>;
}

export async function getEntitySummary(
  entityId: string,
): Promise<EntitySummary> {
  const entity = await fetchApi<EntitySummaryResponse>(
    `/ledger/summary?entityId=${entityId}`,
  );
  return {
    entityId: entity.id,
    wallets: entity.wallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      balance: Number(wallet.ledgerAccount?.balance ?? 0),
      currency: wallet.ledgerAccount?.currency ?? "SAR",
      paths: wallet.governancePaths.map((path) => ({
        id: path.id,
        name: path.name,
        account: path.ledgerAccount
          ? {
              id: path.ledgerAccount.id,
              type: "PATH",
              balance: Number(path.ledgerAccount.balance),
              currency: path.ledgerAccount.currency,
            }
          : undefined,
      })),
    })),
  };
}

export async function getAccountTransactions(
  accountId: string,
): Promise<LedgerEntry[]> {
  const response = await fetchApi<AccountTransactionsResponse>(
    `/ledger/accounts/${accountId}/transactions`,
  );
  return response.entries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    amount: Number(entry.amount),
    description: entry.transaction.description,
    reference: entry.transaction.reference ?? undefined,
    createdAt: entry.transaction.createdAt ?? entry.createdAt,
  }));
}

export function recordPayment(data: {
  subscriptionId: string;
  amount: number;
  reference: string;
  description?: string;
}): Promise<LedgerEntry> {
  return fetchApi("/ledger/payments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function recordDisbursement(data: {
  pathId: string;
  spendingItemId: string;
  decisionId: string;
  amount: number;
  description: string;
  reference?: string;
}): Promise<LedgerEntry> {
  return fetchApi("/ledger/disbursements", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function recordTransfer(data: {
  sourcePathId: string;
  targetPathId: string;
  decisionId: string;
  amount: number;
  description: string;
}): Promise<LedgerEntry> {
  return fetchApi("/ledger/transfers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
