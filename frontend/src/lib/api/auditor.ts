import { fetchApi } from "../api";

export interface AuditorOperation {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  sourceAccount: { id: string; name: string } | null;
  targetAccount: { id: string; name: string } | null;
  createdAt: string;
  notes?: string;
}

export interface AuditorDocument {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  uploadedBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface AuditorDecision {
  id: string;
  title: string;
  type: string;
  status: string;
  result: string;
  amount?: number;
  creator: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface AuditorDispute {
  id: string;
  title: string;
  type: string;
  status: string;
  initiator: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface AuditorAuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  person: { id: string; name: string } | null;
  entity?: { id: string; name: string } | null;
  actor?: { id: string | null; name: string };
  title?: string;
  context?: string;
  effect?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | string;
  linkedRecords?: Array<{
    type: string;
    id: string;
    label: string;
    shortId: string;
  }>;
  changes?: Array<{
    field: string;
    before: unknown;
    after: unknown;
  }>;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

export interface AuditorReport {
  period: string;
  totalOperations: number;
  totalExceptions: number;
  totalConflicts: number;
  openAppeals: number;
  missingDocumentsRate: number;
}

export async function getAuditorOperations(entityId: string): Promise<AuditorOperation[]> {
  return fetchApi(`/auditor/${entityId}/operations`);
}

export async function getAuditorDocuments(entityId: string): Promise<AuditorDocument[]> {
  return fetchApi(`/auditor/${entityId}/documents`);
}

export async function getAuditorDecisions(entityId: string): Promise<AuditorDecision[]> {
  return fetchApi(`/auditor/${entityId}/decisions`);
}

export async function getAuditorExceptions(entityId: string): Promise<AuditorDecision[]> {
  return fetchApi(`/auditor/${entityId}/exceptions`);
}

export async function getAuditorConflicts(entityId: string): Promise<AuditorDecision[]> {
  return fetchApi(`/auditor/${entityId}/conflicts`);
}

export async function getAuditorAppeals(entityId: string): Promise<AuditorDispute[]> {
  return fetchApi(`/auditor/${entityId}/appeals`);
}

export async function getAuditorReport(entityId: string): Promise<AuditorReport> {
  return fetchApi(`/auditor/${entityId}/report`);
}

export async function getAuditorAuditLogs(entityId: string): Promise<AuditorAuditLog[]> {
  return fetchApi(`/auditor/${entityId}/audit-logs`);
}
