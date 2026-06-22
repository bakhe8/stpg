import { fetchApi } from "../api";

export interface Document {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  privacyLevel: string;
  entityId?: string;
  walletId?: string | null;
  governancePathId?: string | null;
  decisionId?: string | null;
  disbursementRequestId?: string | null;
  appealId?: string | null;
  disputeId?: string | null;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: { name: string };
  wallet?: { id: string; name: string };
  governancePath?: { id: string; name: string };
  decision?: { id: string; title: string };
  disbursementRequest?: {
    id: string;
    beneficiaryName: string;
    status: string;
  };
  appeal?: { id: string; type: string; status: string };
  dispute?: { id: string; title: string; status: string };
}

export function getEntityDocuments(entityId: string): Promise<Document[]> {
  return fetchApi(`/documents?entityId=${entityId}`);
}

export function getMyDocuments(): Promise<Document[]> {
  return fetchApi("/documents/mine");
}

export function uploadDocument(data: {
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  entityId?: string;
  walletId?: string;
  governancePathId?: string;
  decisionId?: string;
  disbursementRequestId?: string;
  appealId?: string;
  disputeId?: string;
  privacyLevel?: string;
}): Promise<Document> {
  return fetchApi("/documents", { method: "POST", body: JSON.stringify(data) });
}

export function deleteDocument(id: string): Promise<void> {
  return fetchApi(`/documents/${id}`, { method: "DELETE" });
}
