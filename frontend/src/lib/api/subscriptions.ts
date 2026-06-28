import { fetchApi } from "../api";

export interface Subscription {
  id: string;
  membershipId: string;
  governancePathId: string;
  state:
    | "INTERESTED"
    | "CONDITIONAL"
    | "ACTIVE"
    | "SUSPENDED"
    | "EXITED"
    | "SUPPORTER_ONLY";
  agreedAmount?: number | null;
  notes?: string | null;
  interestedAt: string;
  activeAt?: string | null;
  suspendedAt?: string | null;
  exitedAt?: string | null;
  membership?: {
    id: string;
    entityId: string;
    role?: string;
    person: { id: string; name: string; username: string };
  };
  governancePath?: { id: string; name: string; type: string; walletId?: string };
}

export function getSubscriptions(params: {
  pathId?: string;
  membershipId?: string;
  entityId?: string;
}): Promise<Subscription[]> {
  const qs = params.entityId
    ? `?entityId=${params.entityId}`
    : params.pathId
      ? `?pathId=${params.pathId}`
      : params.membershipId
        ? `?membershipId=${params.membershipId}`
        : "";
  return fetchApi(`/subscriptions${qs}`);
}

export function createSubscription(
  pathId: string,
  data: { membershipId: string; agreedAmount?: number; notes?: string },
): Promise<Subscription> {
  return fetchApi(`/paths/${pathId}/subscribe`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function confirmSubscription(id: string): Promise<Subscription> {
  return fetchApi(`/subscriptions/${id}/confirm`, { method: "PUT" });
}

export function activateSubscription(id: string): Promise<Subscription> {
  return fetchApi(`/subscriptions/${id}/activate`, { method: "PATCH" });
}

export function suspendSubscription(id: string): Promise<Subscription> {
  return fetchApi(`/subscriptions/${id}/suspend`, { method: "PATCH" });
}

export function exitSubscription(id: string): Promise<void> {
  return fetchApi(`/subscriptions/${id}`, { method: "DELETE" });
}

export interface PaymentDue {
  id: string;
  subscriptionId: string;
  periodLabel: string;
  dueDate: string;
  amountDue: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "WAIVED";
  settledAt?: string | null;
  subscription?: {
    id: string;
    membership?: {
      id?: string;
      entityId: string;
      person?: { id: string; name: string; username: string };
    };
    governancePath: { id: string; name: string; type?: string; walletId?: string };
  };
}

export function getMyPaymentDues(): Promise<PaymentDue[]> {
  return fetchApi("/subscriptions/payment-dues/my");
}

export function getEntityPaymentDues(entityId: string): Promise<PaymentDue[]> {
  return fetchApi(`/subscriptions/payment-dues?entityId=${entityId}`);
}

export interface PaymentRecord {
  id: string;
  subscriptionId: string;
  paymentDueId: string;
  submittedById: string;
  amount: number;
  reference: string;
  description?: string | null;
  attachments: string[];
  status: "PROCESSING" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  reviewedById?: string | null;
  reviewerNotes?: string | null;
  transactionId?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  confirmedAt?: string | null;
  paymentDue: {
    id: string;
    periodLabel: string;
    dueDate: string;
    amountDue: number;
    status: "PENDING" | "PAID" | "OVERDUE" | "WAIVED";
  };
  subscription: {
    id: string;
    governancePath: { id: string; name: string };
    membership: {
      entityId: string;
      person: { id: string; name: string; username: string };
    };
  };
}

export function getMyPaymentRecords(): Promise<PaymentRecord[]> {
  return fetchApi("/subscriptions/payment-records/my");
}

export function getEntityPaymentRecords(
  entityId: string,
): Promise<PaymentRecord[]> {
  return fetchApi(`/subscriptions/payment-records?entityId=${entityId}`);
}

export function submitPaymentRecord(data: {
  paymentDueId: string;
  reference: string;
  description?: string;
  attachments?: string[];
}): Promise<PaymentRecord> {
  return fetchApi("/subscriptions/payment-records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function approvePaymentRecord(
  id: string,
  data: { reviewerNotes?: string },
): Promise<PaymentRecord> {
  return fetchApi(`/subscriptions/payment-records/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function rejectPaymentRecord(
  id: string,
  data: { reviewerNotes: string },
): Promise<PaymentRecord> {
  return fetchApi(`/subscriptions/payment-records/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function cancelPaymentRecord(id: string): Promise<PaymentRecord> {
  return fetchApi(`/subscriptions/payment-records/${id}/cancel`, {
    method: "PATCH",
  });
}

export interface CompatibilityResult {
  isEligible: boolean;
  score: number;
  recommendedState: string;
  conflicts: Array<{ field: string; description: string; severity: string }>;
}

export function getSubscriptionCompatibility(
  subscriptionId: string,
): Promise<CompatibilityResult> {
  return fetchApi(`/subscriptions/${subscriptionId}/compatibility`);
}
