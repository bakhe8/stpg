export type SurfaceKind =
  | 'MEMBER'
  | 'MULTI_ENTITY_MEMBER'
  | 'CONDITIONAL_MEMBER'
  | 'SUSPENDED_MEMBER'
  | 'EXITED_MEMBER'
  | 'SUPPORTER_ONLY'
  | 'READ_ONLY_MEMBER'
  | 'PENDING_REVIEW_MEMBER'
  | 'FOUNDER'
  | 'ADMIN'
  | 'TREASURER'
  | 'COMMITTEE_MEMBER'
  | 'AUDITOR';

export type SurfaceTone = 'positive' | 'attention' | 'blocked' | 'neutral';
export type SurfacePriority = 'critical' | 'urgent' | 'normal' | 'info';

export interface SurfaceCtaDto {
  label: string;
  href: string;
}

export interface SurfaceMessageDto {
  tone: SurfaceTone;
  title: string;
  body?: string;
  nextStep?: string;
}

export interface SurfaceContextDto {
  id: string;
  kind: 'ENTITY' | 'CAMPAIGN' | 'SHARED_BENEFIT';
  label: string;
  roleLabel: string;
  stateLabel: string;
  isOperational: boolean;
}

export interface ContextSurfaceSummaryDto extends SurfaceContextDto {
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

export interface SurfaceActionDto {
  id: string;
  kind:
    | 'PAYMENT_DUE'
    | 'PAYMENT_OVERDUE'
    | 'PAYMENT_PROOF_REJECTED'
    | 'PAYMENT_PROOF_PENDING'
    | 'VOTE_REQUIRED'
    | 'COMMITTEE_REVIEW_REQUIRED'
    | 'DISBURSEMENT_REQUEST_STATUS'
    | 'MEMBERSHIP_APPLICATION_STATUS'
    | 'MEMBERSHIP_STATUS';
  priority: SurfacePriority;
  title: string;
  body: string;
  contextLabel?: string;
  amount?: number;
  dueDate?: string;
  cta: SurfaceCtaDto;
  secondaryCta?: SurfaceCtaDto;
  reason?: string;
  expectedAfterAction?: string;
}

export interface SurfaceUpdateDto {
  id: string;
  title: string;
  body: string;
  contextLabel?: string;
  occurredAt?: string;
  href?: string;
}

export interface MoneySurfaceSummaryDto {
  dueNow: number;
  overdue: number;
  paidThisPeriod: number;
  pendingProofs: number;
  rejectedProofs: number;
  displayText: string;
}

export interface FinanceSurfaceInsightDto {
  id: string;
  title: string;
  body: string;
  severity: SurfacePriority;
  contextLabel?: string;
  amount?: number;
  cta?: SurfaceCtaDto;
}

export interface FinanceSurfaceSummaryDto {
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
  insights: FinanceSurfaceInsightDto[];
}

export interface CommitteeSurfaceDecisionDto {
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
  voteChoice?: 'APPROVE' | 'REJECT' | 'ABSTAIN';
  voteCount: number;
  eligibleVoterCount: number;
  remainingForQuorum: number;
  whyShown: string;
  expectedAfterVote: string;
  cta: SurfaceCtaDto;
}

export interface CommitteeSurfaceSummaryDto {
  isVisible: boolean;
  committeeCount: number;
  pendingVoteCount: number;
  alreadyVotedCount: number;
  displayText: string;
  decisions: CommitteeSurfaceDecisionDto[];
}

export interface AuditorSurfaceLinkedRecordDto {
  type: string;
  id: string;
  label: string;
  shortId: string;
  href?: string;
}

export interface AuditorSurfaceChangeDto {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface AuditorSurfaceEventDto {
  id: string;
  title: string;
  actorName: string;
  contextLabel: string;
  occurredAt: string;
  actionLabel: string;
  targetLabel: string;
  severity: SurfacePriority;
  severityLabel: string;
  category: 'FINANCE' | 'GOVERNANCE' | 'MEMBERSHIP' | 'ACCESS' | 'OPERATIONS';
  effect: string;
  whyShown: string;
  linkedRecords: AuditorSurfaceLinkedRecordDto[];
  changes: AuditorSurfaceChangeDto[];
  cta: SurfaceCtaDto;
}

export interface AuditorSurfaceSummaryDto {
  isVisible: boolean;
  entityCount: number;
  eventCount: number;
  highRiskCount: number;
  financeEventCount: number;
  governanceEventCount: number;
  membershipEventCount: number;
  displayText: string;
  timeline: AuditorSurfaceEventDto[];
  cta: SurfaceCtaDto;
}

export type NonOperationalSurfaceStatusDto =
  | 'PENDING_REVIEW'
  | 'SUSPENDED'
  | 'READ_ONLY';

export interface NonOperationalSurfaceItemDto {
  id: string;
  entityId: string;
  entityName: string;
  status: NonOperationalSurfaceStatusDto;
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
  cta?: SurfaceCtaDto;
}

export interface NonOperationalSurfaceSummaryDto {
  isVisible: boolean;
  pendingReviewCount: number;
  suspendedCount: number;
  readOnlyCount: number;
  displayText: string;
  items: NonOperationalSurfaceItemDto[];
}

export interface SharedBenefitSurfaceItemDto {
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
  cta?: SurfaceCtaDto;
}

export interface SharedBenefitSurfaceSummaryDto {
  isVisible: boolean;
  itemCount: number;
  totalCurrentDeficit: number;
  totalOverdueAmount: number;
  displayText: string;
  items: SharedBenefitSurfaceItemDto[];
}

export interface BenefitSurfaceSummaryDto {
  title: string;
  items: Array<{
    id: string;
    title: string;
    state:
      | 'AVAILABLE'
      | 'SUPPORT_ONLY'
      | 'CONDITIONAL'
      | 'SUSPENDED'
      | 'EXITED'
      | 'READ_ONLY';
    body: string;
    contextLabel?: string;
  }>;
}

export interface BlockedCapabilityDto {
  id: string;
  title: string;
  reason: string;
  contextLabel?: string;
  canFix: boolean;
  fixCta?: SurfaceCtaDto;
}

export interface SurfaceExceptionDto {
  id: string;
  kind:
    | 'ENTITY_HEALTH'
    | 'SETUP_BLOCKER'
    | 'MEMBERSHIP_REVIEW'
    | 'DISBURSEMENT_REVIEW'
    | 'DISBURSEMENT_EXECUTION'
    | 'PAYMENT_MATCHING'
    | 'DISPUTE_ATTENTION'
    | 'COMMITTEE_DECISION'
    | 'TRUST_RISK';
  title: string;
  body: string;
  ownerRole: 'FOUNDER' | 'ADMIN' | 'TREASURER' | 'AUDITOR' | 'COMMITTEE';
  severity: SurfacePriority;
  contextLabel?: string;
  impact: string;
  whyShown: string;
  expectedAfterAction?: string;
  cta: SurfaceCtaDto;
}

export interface AdvancedToolLinkDto {
  href: string;
  label: string;
  reason: string;
  requiredRole: string;
}

export interface WorkSurfaceResponseDto {
  generatedAt: string;
  person: {
    id: string;
    displayName: string;
    accountState: 'OK' | 'UNVERIFIED' | 'READ_ONLY' | 'BLOCKED';
    accountMessage?: string;
  };
  surfaceKind: SurfaceKind;
  activeContexts: SurfaceContextDto[];
  contextSummaries: ContextSurfaceSummaryDto[];
  primaryMessage: SurfaceMessageDto;
  requiredActions: SurfaceActionDto[];
  quietUpdates: SurfaceUpdateDto[];
  moneySummary: MoneySurfaceSummaryDto;
  financeSummary: FinanceSurfaceSummaryDto;
  committeeSummary: CommitteeSurfaceSummaryDto;
  auditorSummary: AuditorSurfaceSummaryDto;
  nonOperationalSummary: NonOperationalSurfaceSummaryDto;
  sharedBenefitSummary: SharedBenefitSurfaceSummaryDto;
  benefitSummary: BenefitSurfaceSummaryDto;
  blockedCapabilities: BlockedCapabilityDto[];
  exceptions: SurfaceExceptionDto[];
  advancedTools: AdvancedToolLinkDto[];
  diagnostics: {
    source: 'work-surface-v1';
    legacyDashboardHref: string;
  };
}
