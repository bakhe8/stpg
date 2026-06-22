import { fetchApi } from "../api";

export interface FundHealth {
  entityId: string;
  healthScore: number;
  paymentCompliance: number;
  subscriptionHealth: number;
  activeMemberRate: number;
  healthLevel: string;
  alerts: string[];
  period: string;
  indicators: {
    liquidityRatio: number;
    collectionRate: number;
    disbursementVelocityDays: number;
    governanceEngagement: number;
    disputeResolutionRate: number;
    defaultRate: number;
    growthRate: number;
  };
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalBalance: number;
    activeSubs: number;
    suspendedSubs: number;
    exitedSubs: number;
  };
}

export interface MonthlyReport {
  entityId: string;
  period: string;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  snapshots: Array<{ accountId: string; balance: number; period: string }>;
}

export interface AuditorOverview {
  entityId: string;
  financialOperations: {
    totalTransactions: number;
    flaggedCount: number;
    largeThreshold: number;
    flaggedTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      description: string;
      reference: string | null;
      createdAt: string;
      originKind: string;
    }>;
  };
  attachmentsAndDocuments: {
    executedRequestsCount: number;
    missingDocumentsCount: number;
    missingDocuments: Array<{
      id: string;
      amount: number;
      beneficiaryName: string;
      pathName: string;
      spendingItemName: string;
      attachmentsCount: number;
      requiredDocumentsCount: number;
    }>;
  };
  disbursementDecisions: {
    emergencyDecisionsCount: number;
    emergencyDecisions: Array<{
      id: string;
      title: string;
      status: string;
      result: string;
      executionStatus: string;
      createdAt: string;
    }>;
  };
  exceptions: {
    count: number;
    items: Array<{
      id: string;
      amount: number;
      reviewerNotes: string | null;
      beneficiaryName: string;
      executedAt: string | null;
    }>;
  };
  conflictsOfInterest: {
    reviewerConflictsCount: number;
    beneficiaryConflictsCount: number;
  };
  openAppeals: {
    overdueCount: number;
    overdueItems: Array<{
      id: string;
      type: string;
      status: string;
      responseDeadline: string;
    }>;
  };
  disputes: {
    openCount: number;
  };
  auditTrail: {
    total: number;
    latest: Array<{
      id: string;
      action: string;
      targetType: string;
      targetId: string;
      createdAt: string;
    }>;
  };
  riskSummary: {
    critical: number;
    high: number;
    medium: number;
  };
}

interface LegacyFundHealthResponse {
  entityId: string;
  healthScore: number;
  healthLevel: string;
  indicators: {
    liquidityRatio: number;
    collectionRate: number;
    disbursementVelocityDays: number;
    governanceEngagement: number;
    disputeResolutionRate: number;
    defaultRate: number;
    growthRate: number;
  };
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalBalance: number;
    activeSubs: number;
    suspendedSubs: number;
    exitedSubs: number;
    paymentComplianceRate: number;
    subscriptionHealthRate: number;
  };
  alerts: string[];
}

interface EntityHealthResponse {
  entityId: string;
  healthScore: number;
  healthLevel: string;
  indicators: {
    paymentFatigueScore: number;
    votingFatigueScore: number;
    votingParticipationRate: number;
    weakPathsCount: number;
    zombieWalletsCount: number;
    belowSafetyThresholdCount: number;
    disputeRate: number;
    outOfBandRatio: number;
  };
  advancedIndicators: {
    paymentFatigue: {
      currentOverdueRate: number;
      previousOverdueRate: number;
      overloadedMembers: number;
      score: number;
    };
    votingFatigue: {
      generalDecisionsCount: number;
      avgParticipationRate: number;
      isBelowThreshold: boolean;
    };
    weakPaths: {
      maxSubscribers: number;
      paths: Array<{ id: string; name: string; subscribers: number }>;
    };
    zombieWallets: Array<{ id: string; name: string }>;
    belowSafetyThreshold: Array<{
      id: string;
      name: string;
      balance: number;
      threshold: number;
    }>;
    disputes: {
      appealsCurrent30: number;
      disputesCurrent30: number;
      disputeRate: number;
    };
    outOfBandDecisions: {
      outOfBandTransactions: number;
      totalTransactions90: number;
      ratio: number;
    };
  };
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalBalance: number;
    activeSubs: number;
    suspendedSubs: number;
    exitedSubs: number;
    paymentComplianceRate: number;
    subscriptionHealthRate: number;
    monthlyExpectedRevenue: number;
  };
  alerts: string[];
}

export interface SubscriptionOverlap {
  personId: string;
  hasOverlaps: boolean;
  overlapsCount: number;
  overlaps: Array<{
    purpose: string;
    entityCount: number;
    totalMonthlyAmount: number;
    subscriptions: Array<{
      entityId: string;
      entityName: string;
      walletName: string;
      pathName: string;
      monthlyAmount: number;
    }>;
  }>;
  note: string | null;
}

export interface AuditReport {
  entityId: string;
  period: string;
  generatedAt: string;
  dateRange: { from: string; to: string };
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    transactionsCount: number;
    reversalsCount: number;
  };
  activity: {
    decisionsClosedCount: number;
    appealsFiledCount: number;
    disputesOpenedCount: number;
    disbursementsExecutedCount: number;
  };
  riskIndicators: {
    outOfBandRatio: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  };
}

interface MonthlyReportResponse {
  entityId: string;
  period: string;
  summary: {
    totalIn: number;
    totalOut: number;
    netFlow: number;
  };
  balanceSnapshots: Array<{
    accountId: string;
    balance: number | string;
    period: string;
  }>;
}

export async function getFundHealth(entityId: string): Promise<FundHealth> {
  const health = await fetchApi<LegacyFundHealthResponse>(
    `/analytics/fund-health?entityId=${entityId}`,
  );
  return {
    entityId: health.entityId,
    healthScore: health.healthScore / 100,
    paymentCompliance: health.summary.paymentComplianceRate / 100,
    subscriptionHealth: health.summary.subscriptionHealthRate / 100,
    activeMemberRate:
      health.summary.totalMembers > 0
        ? health.summary.activeMembers / health.summary.totalMembers
        : 0,
    healthLevel: health.healthLevel,
    indicators: health.indicators,
    summary: health.summary,
    alerts: health.alerts,
    period: new Date().toISOString().slice(0, 7),
  };
}

export async function getMonthlyReport(
  entityId: string,
  period?: string,
): Promise<MonthlyReport> {
  const qs = period
    ? `?entityId=${entityId}&period=${period}`
    : `?entityId=${entityId}`;
  const report = await fetchApi<MonthlyReportResponse>(
    `/analytics/monthly-report${qs}`,
  );
  return {
    entityId: report.entityId,
    period: report.period,
    totalCredits: Number(report.summary.totalIn),
    totalDebits: Number(report.summary.totalOut),
    netFlow: Number(report.summary.netFlow),
    snapshots: report.balanceSnapshots.map((snapshot) => ({
      ...snapshot,
      balance: Number(snapshot.balance),
    })),
  };
}

export async function getAuditorOverview(
  entityId: string,
): Promise<AuditorOverview> {
  return fetchApi<AuditorOverview>(
    `/analytics/auditor-overview?entityId=${entityId}`,
  );
}

export async function getEntityHealth(
  entityId: string,
): Promise<EntityHealthResponse> {
  return fetchApi<EntityHealthResponse>(
    `/analytics/entities/${entityId}/health`,
  );
}

export async function getMemberSubscriptionOverlaps(): Promise<SubscriptionOverlap> {
  return fetchApi<SubscriptionOverlap>("/analytics/members/overlaps");
}

export async function generateAuditReport(
  entityId: string,
  period: string,
): Promise<AuditReport> {
  return fetchApi<AuditReport>(
    `/analytics/entities/${entityId}/audit/report/${period}`,
  );
}
