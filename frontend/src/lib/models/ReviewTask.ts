export type ReviewTaskType =
  | 'JOIN_REQUEST'
  | 'PAYMENT_RECEIPT'
  | 'DISBURSEMENT_APPROVAL'
  | 'DISPUTE_REVIEW'
  | 'RULE_CHANGE_REQUEST';

export interface ReviewTask {
  id: string; // The original ID of the record (e.g. receiptId, disputeId)
  type: ReviewTaskType;
  title: string;
  subtitle?: string;
  requestedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  urgency: 'HIGH' | 'NORMAL' | 'LOW';
  
  // Specific contextual info depending on task type
  context?: {
    entityId?: string;
    entityName?: string;
    walletId?: string;
    walletName?: string;
    pathId?: string;
    pathName?: string;
    amount?: number;
    currency?: string;
  };

  // Explanation of the rule that generated this review requirement
  ruleExplanation?: string;

  // The primary action path to handle this task
  actionUrl: string;
}
