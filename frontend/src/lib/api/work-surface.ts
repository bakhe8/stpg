import { fetchApi } from "../api";

export type SurfaceKind =
  | "MEMBER"
  | "MULTI_ENTITY_MEMBER"
  | "CONDITIONAL_MEMBER"
  | "SUSPENDED_MEMBER"
  | "EXITED_MEMBER"
  | "SUPPORTER_ONLY"
  | "READ_ONLY_MEMBER"
  | "PENDING_REVIEW_MEMBER"
  | "FOUNDER"
  | "ADMIN"
  | "TREASURER"
  | "COMMITTEE_MEMBER"
  | "AUDITOR";

export type SurfaceTone = "positive" | "attention" | "blocked" | "neutral";
export type SurfacePriority = "critical" | "urgent" | "normal" | "info";

export interface SurfaceCta {
  label: string;
  href: string;
}

export interface SurfaceMessage {
  tone: SurfaceTone;
  title: string;
  body?: string;
  nextStep?: string;
}

export interface SurfaceContext {
  id: string;
  kind: "ENTITY" | "CAMPAIGN" | "SHARED_BENEFIT";
  label: string;
  roleLabel: string;
  stateLabel: string;
  isOperational: boolean;
}

export interface ContextSurfaceSummary extends SurfaceContext {
  dueNow: number;
  overdue: number;
  pendingProofs: number;
  rejectedProofs: number;
  benefitCount: number;
  blockedCount: number;
  actionCount: number;
  moneyText: string;
  benefitText: string;
  attentionText?: string;
}

export interface SurfaceAction {
  id: string;
  kind:
    | "PAYMENT_DUE"
    | "PAYMENT_OVERDUE"
    | "PAYMENT_PROOF_REJECTED"
    | "PAYMENT_PROOF_PENDING"
    | "VOTE_REQUIRED"
    | "COMMITTEE_REVIEW_REQUIRED"
    | "DISBURSEMENT_REQUEST_STATUS"
    | "MEMBERSHIP_APPLICATION_STATUS"
    | "MEMBERSHIP_STATUS";
  priority: SurfacePriority;
  title: string;
  body: string;
  contextLabel?: string;
  amount?: number;
  dueDate?: string;
  cta: SurfaceCta;
  secondaryCta?: SurfaceCta;
  reason?: string;
  expectedAfterAction?: string;
}

export interface SurfaceUpdate {
  id: string;
  title: string;
  body: string;
  contextLabel?: string;
  occurredAt?: string;
  href?: string;
}

export interface MoneySurfaceSummary {
  dueNow: number;
  overdue: number;
  paidThisPeriod: number;
  pendingProofs: number;
  rejectedProofs: number;
  displayText: string;
}

export interface FinanceSurfaceInsight {
  id: string;
  title: string;
  body: string;
  severity: SurfacePriority;
  contextLabel?: string;
  amount?: number;
  cta?: SurfaceCta;
}

export interface FinanceSurfaceSummary {
  isVisible: boolean;
  entityCount: number;
  pendingPaymentCount: number;
  pendingPaymentAmount: number;
  overdueDueCount: number;
  overdueDueAmount: number;
  rejectedPaymentCount: number;
  rejectedPaymentAmount: number;
  approvedDisbursementCount: number;
  approvedDisbursementAmount: number;
  blockedDisbursementCount: number;
  blockedDisbursementAmount: number;
  availableBalance: number;
  displayText: string;
  insights: FinanceSurfaceInsight[];
}

export interface CommitteeSurfaceDecision {
  id: string;
  title: string;
  body: string;
  contextLabel: string;
  committeeName: string;
  pathName?: string;
  decisionTypeLabel: string;
  priority: SurfacePriority;
  closesAt: string;
  hasVoted: boolean;
  voteChoice?: "APPROVE" | "REJECT" | "ABSTAIN";
  voteCount: number;
  eligibleVoterCount: number;
  remainingForQuorum: number;
  whyShown: string;
  expectedAfterVote: string;
  cta: SurfaceCta;
}

export interface CommitteeSurfaceSummary {
  isVisible: boolean;
  committeeCount: number;
  pendingVoteCount: number;
  alreadyVotedCount: number;
  displayText: string;
  decisions: CommitteeSurfaceDecision[];
}

export interface AuditorSurfaceLinkedRecord {
  type: string;
  id: string;
  label: string;
  shortId: string;
  href?: string;
}

export interface AuditorSurfaceChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface AuditorSurfaceEvent {
  id: string;
  title: string;
  actorName: string;
  contextLabel: string;
  occurredAt: string;
  actionLabel: string;
  targetLabel: string;
  severity: SurfacePriority;
  severityLabel: string;
  category: "FINANCE" | "GOVERNANCE" | "MEMBERSHIP" | "ACCESS" | "OPERATIONS";
  effect: string;
  whyShown: string;
  linkedRecords: AuditorSurfaceLinkedRecord[];
  changes: AuditorSurfaceChange[];
  cta: SurfaceCta;
}

export interface AuditorSurfaceSummary {
  isVisible: boolean;
  entityCount: number;
  eventCount: number;
  highRiskCount: number;
  financeEventCount: number;
  governanceEventCount: number;
  membershipEventCount: number;
  displayText: string;
  timeline: AuditorSurfaceEvent[];
  cta: SurfaceCta;
}

export type NonOperationalSurfaceStatus =
  | "PENDING_REVIEW"
  | "SUSPENDED"
  | "READ_ONLY";

export interface NonOperationalSurfaceItem {
  id: string;
  entityId: string;
  entityName: string;
  status: NonOperationalSurfaceStatus;
  statusLabel: string;
  tone: SurfaceTone;
  roleLabel: string;
  title: string;
  whatThisMeans: string;
  blockedActions: string[];
  allowedActions: string[];
  nextStep: string;
  canAct: boolean;
  whyShown: string;
  cta?: SurfaceCta;
}

export interface NonOperationalSurfaceSummary {
  isVisible: boolean;
  pendingReviewCount: number;
  suspendedCount: number;
  readOnlyCount: number;
  displayText: string;
  items: NonOperationalSurfaceItem[];
}

export interface SharedBenefitSurfaceItem {
  id: string;
  entityId: string;
  entityName: string;
  walletId: string;
  serviceName: string;
  roleLabel: string;
  tone: SurfaceTone;
  title: string;
  benefitText: string;
  coveragePercent: number;
  coverageText: string;
  expectedMonthlySupport: number;
  currentDeficitAmount: number;
  overdueAmount: number;
  activeSupporterCount: number;
  nonSupportingCount: number;
  totalMemberCount: number;
  userContributionText: string;
  sharedImpactText: string;
  nextStep: string;
  whyShown: string;
  canManage: boolean;
  cta?: SurfaceCta;
}

export interface SharedBenefitSurfaceSummary {
  isVisible: boolean;
  itemCount: number;
  totalCurrentDeficit: number;
  totalOverdueAmount: number;
  displayText: string;
  items: SharedBenefitSurfaceItem[];
}

export interface BenefitSurfaceSummary {
  title: string;
  items: Array<{
    id: string;
    title: string;
    state:
      | "AVAILABLE"
      | "SUPPORT_ONLY"
      | "CONDITIONAL"
      | "SUSPENDED"
      | "EXITED"
      | "READ_ONLY";
    body: string;
    contextLabel?: string;
  }>;
}

export interface BlockedCapability {
  id: string;
  title: string;
  reason: string;
  contextLabel?: string;
  canFix: boolean;
  fixCta?: SurfaceCta;
}

export interface SurfaceException {
  id: string;
  kind:
    | "ENTITY_HEALTH"
    | "SETUP_BLOCKER"
    | "MEMBERSHIP_REVIEW"
    | "DISBURSEMENT_REVIEW"
    | "DISBURSEMENT_EXECUTION"
    | "PAYMENT_MATCHING"
    | "DISPUTE_ATTENTION"
    | "COMMITTEE_DECISION"
    | "TRUST_RISK";
  title: string;
  body: string;
  ownerRole: "FOUNDER" | "ADMIN" | "TREASURER" | "AUDITOR" | "COMMITTEE";
  severity: SurfacePriority;
  contextLabel?: string;
  impact: string;
  whyShown: string;
  expectedAfterAction?: string;
  cta: SurfaceCta;
}

export interface AdvancedToolLink {
  href: string;
  label: string;
  reason: string;
  requiredRole: string;
}

export interface WorkSurface {
  generatedAt: string;
  person: {
    id: string;
    displayName: string;
    accountState: "OK" | "UNVERIFIED" | "READ_ONLY" | "BLOCKED";
    accountMessage?: string;
  };
  surfaceKind: SurfaceKind;
  activeContexts: SurfaceContext[];
  contextSummaries: ContextSurfaceSummary[];
  primaryMessage: SurfaceMessage;
  requiredActions: SurfaceAction[];
  quietUpdates: SurfaceUpdate[];
  moneySummary: MoneySurfaceSummary;
  financeSummary: FinanceSurfaceSummary;
  committeeSummary: CommitteeSurfaceSummary;
  auditorSummary: AuditorSurfaceSummary;
  nonOperationalSummary: NonOperationalSurfaceSummary;
  sharedBenefitSummary: SharedBenefitSurfaceSummary;
  benefitSummary: BenefitSurfaceSummary;
  blockedCapabilities: BlockedCapability[];
  exceptions: SurfaceException[];
  advancedTools: AdvancedToolLink[];
  diagnostics: {
    source: "work-surface-v1";
    legacyDashboardHref: string;
  };
}

export function getMyWorkSurface(): Promise<WorkSurface> {
  return fetchApi("/work-surface/me");
}
