import {
  AppealStatus,
  AppealType,
  AuditAction,
  BalanceTransferRequestStatus,
  BeneficiaryType,
  DecisionExecutionStatus,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  DisbursementRequestStatus,
  DisputeStatus,
  DisputeType,
  EntityPlatformStatus,
  EntityRelationshipType,
  EntityType,
  GovernancePathType,
  LedgerTransactionType,
  MemberRole,
  MoneyOriginKind,
  MoneyType,
  NotificationTargetType,
  NotificationType,
  PaymentDueStatus,
  PaymentMethod,
  PaymentRecordStatus,
  PlatformAccessType,
  PlatformRole,
  RelationshipStatus,
  RuleTargetType,
  RuleType,
  SubjectType,
  SubscriptionState,
  SupportSessionStatus,
  TransparencyLevel,
  VoteType,
  WalletBenefitType,
  WalletRelationshipType,
} from '@prisma/client';
import {
  createSeedDb,
  formatSeedDate,
  resolveSeedRuntimeOptions,
} from './seed-runtime';

type AuditFinding = {
  severity: 'warning';
  code: string;
  message: string;
  detail?: string;
};

type EnumCoverageSpec = {
  label: string;
  table: string;
  column: string;
  expected: string[];
};

type DistributionRow = {
  value: string;
  count: number;
};

const seedRuntime = resolveSeedRuntimeOptions();
const { pool, prisma } = createSeedDb(seedRuntime.connectionString);

const enumValues = <T extends Record<string, string>>(enumObject: T) =>
  Object.values(enumObject);

const coverageSpecs: EnumCoverageSpec[] = [
  {
    label: 'Platform Roles',
    table: 'platform_accounts',
    column: 'role',
    expected: enumValues(PlatformRole),
  },
  {
    label: 'Platform Access Types',
    table: 'platform_access_logs',
    column: 'accessType',
    expected: enumValues(PlatformAccessType),
  },
  {
    label: 'Entity Platform Statuses',
    table: 'entities',
    column: 'platformStatus',
    expected: enumValues(EntityPlatformStatus),
  },
  {
    label: 'Platform Suspension Appeal Statuses',
    table: 'platform_suspension_appeals',
    column: 'status',
    expected: ['PENDING', 'REVIEWED', 'RESOLVED'],
  },
  {
    label: 'Support Session Statuses',
    table: 'support_sessions',
    column: 'status',
    expected: enumValues(SupportSessionStatus),
  },
  {
    label: 'Entity Types',
    table: 'entities',
    column: 'type',
    expected: enumValues(EntityType),
  },
  {
    label: 'Membership Roles',
    table: 'memberships',
    column: 'role',
    expected: enumValues(MemberRole),
  },
  {
    label: 'Wallet Benefit Types',
    table: 'wallets',
    column: 'benefitType',
    expected: enumValues(WalletBenefitType),
  },
  {
    label: 'Governance Path Types',
    table: 'governance_paths',
    column: 'type',
    expected: enumValues(GovernancePathType),
  },
  {
    label: 'Subscription States',
    table: 'subscriptions',
    column: 'state',
    expected: enumValues(SubscriptionState),
  },
  {
    label: 'Decision Types',
    table: 'decisions',
    column: 'decisionType',
    expected: enumValues(DecisionType),
  },
  {
    label: 'Decision Subject Types',
    table: 'decisions',
    column: 'subjectType',
    expected: enumValues(SubjectType),
  },
  {
    label: 'Decision Results',
    table: 'decisions',
    column: 'result',
    expected: enumValues(DecisionResult),
  },
  {
    label: 'Decision Statuses',
    table: 'decisions',
    column: 'status',
    expected: enumValues(DecisionStatus),
  },
  {
    label: 'Decision Execution States',
    table: 'decisions',
    column: 'executionStatus',
    expected: enumValues(DecisionExecutionStatus),
  },
  {
    label: 'Decision Vote Types',
    table: 'decisions',
    column: 'voteType',
    expected: enumValues(VoteType),
  },
  {
    label: 'Appeal Types',
    table: 'appeals',
    column: 'type',
    expected: enumValues(AppealType),
  },
  {
    label: 'Appeal Statuses',
    table: 'appeals',
    column: 'status',
    expected: enumValues(AppealStatus),
  },
  {
    label: 'Dispute Types',
    table: 'disputes',
    column: 'type',
    expected: enumValues(DisputeType),
  },
  {
    label: 'Dispute Statuses',
    table: 'disputes',
    column: 'status',
    expected: enumValues(DisputeStatus),
  },
  {
    label: 'Entity Relationship Types',
    table: 'entity_relationships',
    column: 'type',
    expected: enumValues(EntityRelationshipType),
  },
  {
    label: 'Entity Relationship Statuses',
    table: 'entity_relationships',
    column: 'approvalStatus',
    expected: enumValues(RelationshipStatus),
  },
  {
    label: 'Wallet Relationship Types',
    table: 'wallet_relationships',
    column: 'relationshipType',
    expected: enumValues(WalletRelationshipType),
  },
  {
    label: 'Wallet Relationship Statuses',
    table: 'wallet_relationships',
    column: 'approvalStatus',
    expected: enumValues(RelationshipStatus),
  },
  {
    label: 'Ledger Transaction Types',
    table: 'ledger_transactions',
    column: 'type',
    expected: enumValues(LedgerTransactionType),
  },
  {
    label: 'Ledger Money Types',
    table: 'ledger_transactions',
    column: 'moneyType',
    expected: enumValues(MoneyType),
  },
  {
    label: 'Ledger Origin Kinds',
    table: 'ledger_transactions',
    column: 'originKind',
    expected: enumValues(MoneyOriginKind),
  },
  {
    label: 'Rule Types',
    table: 'rules',
    column: 'ruleType',
    expected: enumValues(RuleType),
  },
  {
    label: 'Rule Target Types',
    table: 'rules',
    column: 'targetType',
    expected: enumValues(RuleTargetType),
  },
  {
    label: 'Payment Due Statuses',
    table: 'payment_dues',
    column: 'status',
    expected: enumValues(PaymentDueStatus),
  },
  {
    label: 'Payment Record Statuses',
    table: 'payment_records',
    column: 'status',
    expected: enumValues(PaymentRecordStatus),
  },
  {
    label: 'Payment Methods',
    table: 'payment_records',
    column: 'paymentMethod',
    expected: enumValues(PaymentMethod),
  },
  {
    label: 'Disbursement Request Statuses',
    table: 'disbursement_requests',
    column: 'status',
    expected: enumValues(DisbursementRequestStatus),
  },
  {
    label: 'Balance Transfer Request Statuses',
    table: 'balance_transfer_requests',
    column: 'status',
    expected: enumValues(BalanceTransferRequestStatus),
  },
  {
    label: 'Beneficiary Types',
    table: 'beneficiaries',
    column: 'type',
    expected: enumValues(BeneficiaryType),
  },
  {
    label: 'Notification Types',
    table: 'notifications',
    column: 'type',
    expected: enumValues(NotificationType),
  },
  {
    label: 'Notification Target Types',
    table: 'notifications',
    column: 'targetType',
    expected: enumValues(NotificationTargetType),
  },
  {
    label: 'Audit Log Actions',
    table: 'audit_logs',
    column: 'action',
    expected: enumValues(AuditAction),
  },
  {
    label: 'Document Privacy Levels',
    table: 'documents',
    column: 'privacyLevel',
    expected: enumValues(TransparencyLevel),
  },
  {
    label: 'Spending Item Privacy Levels',
    table: 'spending_items',
    column: 'privacyLevel',
    expected: enumValues(TransparencyLevel),
  },
];

function pushFinding(
  findings: AuditFinding[],
  code: string,
  message: string,
  detail?: string,
) {
  findings.push({
    severity: 'warning',
    code,
    message,
    detail,
  });
}

async function queryCount(sql: string) {
  const result = await pool.query<{ count: number }>(sql);
  return Number(result.rows[0]?.count ?? 0);
}

async function queryDistribution(
  table: string,
  column: string,
): Promise<DistributionRow[]> {
  const result = await pool.query<DistributionRow>(
    `SELECT "${column}"::text AS value, COUNT(*)::int AS count FROM "${table}" GROUP BY 1 ORDER BY 1`,
  );

  return result.rows.map((row) => ({
    value: row.value,
    count: Number(row.count),
  }));
}

async function queryTableCounts() {
  const tables = await pool.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);

  const counts = await Promise.all(
    tables.rows.map(async ({ tablename }) => ({
      table: tablename,
      count: await queryCount(
        `SELECT COUNT(*)::int AS count FROM "${tablename}"`,
      ),
    })),
  );

  return counts;
}

async function main() {
  console.log(
    `Auditing STGP seeded dataset (profile=${seedRuntime.profile}, referenceDate=${formatSeedDate(seedRuntime.referenceDate)})...`,
  );

  const findings: AuditFinding[] = [];
  const coverageRows: Array<{
    area: string;
    covered: string;
    missing: string;
  }> = [];

  const [
    tableCounts,
    sharedWalletCount,
    walletOwnershipCount,
    secretVoteCount,
    weightedVoteCount,
    pendingClosureCount,
  ] = await Promise.all([
    queryTableCounts(),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM "wallets" WHERE "benefitType" = 'SHARED' AND "isActive" = true`,
    ),
    queryCount(`SELECT COUNT(*)::int AS count FROM "wallet_ownerships"`),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM "votes" WHERE "isSecret" = true`,
    ),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM "votes" WHERE "weight" <> 1`,
    ),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM "entities" WHERE "closureStatus" = 'PENDING_CLOSURE'`,
    ),
  ]);

  const emptyTables = tableCounts.filter((row) => row.count === 0);
  if (emptyTables.length > 0) {
    pushFinding(
      findings,
      'EMPTY_TABLES',
      'Some application tables are still empty after seeding.',
      emptyTables.map((row) => row.table).join(', '),
    );
  }

  if (sharedWalletCount > 0 && walletOwnershipCount === 0) {
    pushFinding(
      findings,
      'SHARED_WALLET_OWNERSHIP_GAP',
      'Shared wallets exist but wallet ownership rows are completely missing.',
      `${sharedWalletCount} active shared wallets, ${walletOwnershipCount} ownership rows.`,
    );
  }

  if (pendingClosureCount < 2) {
    pushFinding(
      findings,
      'ENTITY_CLOSURE_COVERAGE_GAP',
      'The implemented pending-closure workflow needs at least two seeded entities.',
      `${pendingClosureCount} pending closure entities.`,
    );
  }

  const individualCapPathCount = await queryCount(
    `SELECT COUNT(*)::int AS count FROM "governance_paths" WHERE "type" = 'INDIVIDUAL_WITH_CAP'`,
  );
  const individualCapDecisionCount = await queryCount(
    `SELECT COUNT(*)::int AS count FROM "decisions" WHERE "voteType" = 'INDIVIDUAL_WITH_CAP'`,
  );
  if (individualCapPathCount > 0 && individualCapDecisionCount === 0) {
    pushFinding(
      findings,
      'INDIVIDUAL_CAP_FLOW_GAP',
      'Individual-with-cap paths exist, but no decision currently exercises that vote flow.',
      `${individualCapPathCount} paths, ${individualCapDecisionCount} decisions.`,
    );
  }

  const twoThirdsDecisionCount = await queryCount(
    `SELECT COUNT(*)::int AS count FROM "decisions" WHERE "voteType" = 'TWO_THIRDS'`,
  );
  if (twoThirdsDecisionCount === 0) {
    pushFinding(
      findings,
      'TWO_THIRDS_VOTE_GAP',
      'No decision currently exercises the TWO_THIRDS vote path.',
    );
  }

  const walletSubjectDecisionCount = await queryCount(
    `SELECT COUNT(*)::int AS count FROM "decisions" WHERE "subjectType" = 'WALLET'`,
  );
  const entitySubjectDecisionCount = await queryCount(
    `SELECT COUNT(*)::int AS count FROM "decisions" WHERE "subjectType" = 'ENTITY'`,
  );
  if (walletSubjectDecisionCount === 0 || entitySubjectDecisionCount === 0) {
    pushFinding(
      findings,
      'DECISION_SUBJECT_GAP',
      'Entity-level and wallet-level decisions are not both represented in the dataset.',
      `entitySubject=${entitySubjectDecisionCount}, walletSubject=${walletSubjectDecisionCount}.`,
    );
  }

  const emergencyReviewLinkGapCount = await queryCount(
    `SELECT COUNT(*)::int AS count FROM "decisions" WHERE "voteType" = 'EMERGENCY_THEN_REVIEW' AND "relatedDecisionId" IS NULL`,
  );
  if (emergencyReviewLinkGapCount > 0) {
    pushFinding(
      findings,
      'EMERGENCY_REVIEW_LINK_GAP',
      'Some emergency-then-review decisions are missing their linked review decision.',
      `${emergencyReviewLinkGapCount} decisions.`,
    );
  }

  const tribeEntityCount = await queryCount(
    `SELECT COUNT(*)::int AS count FROM "entities" WHERE "type" = 'TRIBE'`,
  );
  if (tribeEntityCount === 0) {
    pushFinding(
      findings,
      'TRIBE_ENTITY_GAP',
      'The dataset does not currently include any TRIBE entity.',
    );
  }

  for (const spec of coverageSpecs) {
    const distribution = await queryDistribution(spec.table, spec.column);
    const coveredValues = new Set(distribution.map((row) => row.value));
    const missingValues = spec.expected.filter(
      (value) => !coveredValues.has(value),
    );

    coverageRows.push({
      area: spec.label,
      covered: `${coveredValues.size}/${spec.expected.length}`,
      missing: missingValues.length > 0 ? missingValues.join(', ') : '-',
    });

    if (missingValues.length > 0) {
      pushFinding(
        findings,
        `ENUM_COVERAGE_${spec.table}_${spec.column}`.toUpperCase(),
        `Coverage is incomplete for ${spec.label}.`,
        `Missing: ${missingValues.join(', ')}`,
      );
    }
  }

  console.table({
    profile: seedRuntime.profile,
    referenceDate: formatSeedDate(seedRuntime.referenceDate),
    tables: tableCounts.length,
    emptyTables: emptyTables.length,
    sharedWallets: sharedWalletCount,
    walletOwnerships: walletOwnershipCount,
    secretVotes: secretVoteCount,
    weightedVotes: weightedVoteCount,
    pendingClosures: pendingClosureCount,
    findings: findings.length,
  });

  if (emptyTables.length > 0) {
    console.log('Empty tables:');
    console.table(emptyTables);
  }

  console.log('Enum coverage matrix:');
  console.table(coverageRows);

  if (findings.length > 0) {
    console.log('Audit findings:');
    console.table(findings);
  } else {
    console.log('No audit gaps detected.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
