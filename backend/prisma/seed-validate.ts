import {
  EntityPlatformStatus,
  MembershipApplicationStatus,
  PaymentRecordStatus,
  PaymentDueStatus,
  PlatformAccessType,
  PlatformRole,
  SupportSessionStatus,
  VoteType,
} from '@prisma/client';
import {
  createSeedDb,
  formatSeedDate,
  resolveSeedRuntimeOptions,
} from './seed-runtime';

type ValidationFinding = {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  count?: number;
  sample?: string;
};

const BASE_PERSON_COUNT = 24;
const BASE_MEMBERSHIP_COUNT = 39;

const seedRuntime = resolveSeedRuntimeOptions();
const { pool, prisma } = createSeedDb(seedRuntime.connectionString);

const countBy = <T>(items: T[], selector: (item: T) => string) => {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
};

const sampleList = (items: string[], limit = 3) =>
  items.slice(0, limit).join(' | ');

function pushFinding(
  findings: ValidationFinding[],
  severity: ValidationFinding['severity'],
  code: string,
  message: string,
  count?: number,
  sample?: string,
) {
  findings.push({ severity, code, message, count, sample });
}

async function main() {
  console.log(
    `Validating STGP seed dataset (profile=${seedRuntime.profile}, referenceDate=${formatSeedDate(seedRuntime.referenceDate)})...`,
  );

  const [
    personsCount,
    membershipsCount,
    entities,
    activeMemberships,
    committees,
    committeeMemberships,
    subscriptions,
    paymentDues,
    paymentRecords,
    beneficiaries,
    householdMemberships,
    sharedWallets,
    decisions,
    votes,
    documents,
    walletCount,
    pathCount,
    notifications,
    loginAuditLogs,
    balanceSnapshots,
    ledgerTransactions,
    platformAccounts,
    platformAccessLogs,
    supportSessions,
    platformSuspensionAppeals,
    membershipApplications,
    invitations,
    wallets,
    memberPreferences,
    entityPolicies,
  ] = await Promise.all([
    prisma.person.count(),
    prisma.membership.count(),
    prisma.entity.findMany({
      select: {
        id: true,
        name: true,
        isCampaign: true,
        isActive: true,
        platformStatus: true,
        suspendedAt: true,
        suspendedReason: true,
        bankAccountNumber: true,
        bankName: true,
        campaignEndsAt: true,
        closureStatus: true,
        closureRequestedAt: true,
        closureReason: true,
      },
    }),
    prisma.membership.findMany({
      where: { isActive: true },
      select: {
        id: true,
        entityId: true,
        role: true,
        person: {
          select: {
            id: true,
            name: true,
            username: true,
            phoneNumber: true,
          },
        },
      },
    }),
    prisma.committee.findMany({
      select: {
        id: true,
        name: true,
        entityId: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.committeeMembership.findMany({
      select: {
        committee: { select: { name: true, entityId: true } },
        membership: {
          select: {
            entityId: true,
            person: { select: { name: true } },
          },
        },
      },
    }),
    prisma.subscription.findMany({
      select: {
        id: true,
        state: true,
        agreedAmount: true,
        activeAt: true,
        exitedAt: true,
        membership: {
          select: {
            id: true,
            entityId: true,
            person: { select: { id: true, name: true } },
          },
        },
        governancePath: {
          select: {
            name: true,
            wallet: {
              select: {
                entityId: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.paymentDue.findMany({
      select: {
        id: true,
        status: true,
        transactionId: true,
      },
    }),
    prisma.paymentRecord.findMany({
      select: {
        id: true,
        status: true,
        amount: true,
        paymentMethod: true,
        gatewayTransactionId: true,
        subscriptionId: true,
        paymentDueId: true,
        transactionId: true,
        paymentDue: {
          select: {
            subscriptionId: true,
            status: true,
            amountDue: true,
          },
        },
        subscription: {
          select: {
            membership: {
              select: { personId: true },
            },
          },
        },
      },
    }),
    prisma.beneficiary.findMany({
      select: {
        id: true,
        displayName: true,
        type: true,
        membershipId: true,
        dependentId: true,
      },
    }),
    prisma.householdMembership.findMany({
      select: {
        household: {
          select: {
            name: true,
            entityId: true,
          },
        },
        membership: {
          select: {
            entityId: true,
            person: { select: { name: true } },
          },
        },
      },
    }),
    prisma.wallet.findMany({
      where: { benefitType: 'SHARED', isActive: true },
      select: {
        id: true,
        name: true,
        entity: { select: { name: true } },
        governancePaths: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    }),
    prisma.decision.findMany({
      select: { id: true, title: true, voteType: true },
    }),
    prisma.vote.findMany({
      include: {
        decision: {
          select: {
            id: true,
            title: true,
            voteType: true,
          },
        },
      },
    }),
    prisma.document.findMany({
      select: { name: true, privacyLevel: true, uploadedById: true },
    }),
    prisma.wallet.count(),
    prisma.governancePath.count(),
    prisma.notification.findMany({
      select: {
        personId: true,
        type: true,
        targetType: true,
        targetId: true,
        body: true,
        sentAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { action: 'LOGIN' },
      select: { personId: true, createdAt: true },
    }),
    prisma.balanceSnapshot.findMany({
      select: { accountId: true, period: true },
    }),
    prisma.ledgerTransaction.findMany({
      select: {
        id: true,
        type: true,
        originKind: true,
        originEntityId: true,
        description: true,
        originNote: true,
        amount: true,
        isReversed: true,
        createdAt: true,
        entries: {
          select: {
            type: true,
            amount: true,
            account: {
              select: {
                walletId: true,
                governancePath: { select: { walletId: true } },
                spendingItem: {
                  select: {
                    governancePath: { select: { walletId: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.platformAccount.findMany({
      select: { id: true, email: true, role: true, isActive: true },
    }),
    prisma.platformAccessLog.findMany({
      select: {
        id: true,
        platformAccountId: true,
        entityId: true,
        accessType: true,
        reason: true,
        dataScope: true,
        notifiedEntityAdmin: true,
        startedAt: true,
        endedAt: true,
      },
    }),
    prisma.supportSession.findMany({
      select: {
        id: true,
        entityId: true,
        platformAccountId: true,
        status: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.platformSuspensionAppeal.findMany({
      select: {
        id: true,
        entityId: true,
        submittedById: true,
        reason: true,
        status: true,
        response: true,
        resolvedAt: true,
        createdAt: true,
      },
    }),
    prisma.membershipApplication.findMany({
      select: {
        id: true,
        personId: true,
        entityId: true,
        status: true,
        reviewedById: true,
        reviewerNotes: true,
      },
    }),
    prisma.invitation.findMany({
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
      },
    }),
    prisma.wallet.findMany({
      select: {
        id: true,
        name: true,
        entityId: true,
        isActive: true,
        ledgerAccount: { select: { balance: true } },
      },
    }),
    prisma.memberPreference.findMany({
      select: {
        membershipId: true,
        requiresAuditAccess: true,
        requiresCommitteeApproval: true,
        acceptedGovernanceTypes: true,
      },
    }),
    prisma.entityPolicy.findMany({
      select: {
        entityId: true,
        allowAppeals: true,
        appealTimeoutDays: true,
      },
    }),
  ]);

  const findings: ValidationFinding[] = [];
  const pendingClosureEntities = entities.filter(
    (entity) => entity.closureStatus === 'PENDING_CLOSURE',
  );
  const closureReadiness = await Promise.all(
    pendingClosureEntities.map(async (entity) => {
      const [openDisbursements, openDisputes] = await Promise.all([
        prisma.disbursementRequest.count({
          where: {
            status: { in: ['PENDING', 'APPROVED'] },
            governancePath: { wallet: { entityId: entity.id } },
          },
        }),
        prisma.dispute.count({
          where: {
            entityId: entity.id,
            status: { in: ['OPEN', 'UNDER_MEDIATION', 'ESCALATED'] },
          },
        }),
      ]);
      const balance = wallets
        .filter((wallet) => wallet.entityId === entity.id)
        .reduce(
          (total, wallet) => total + Number(wallet.ledgerAccount?.balance ?? 0),
          0,
        );

      return { entity, openDisbursements, openDisputes, balance };
    }),
  );
  const activeMembershipsByEntity = countBy(
    activeMemberships,
    (membership) => membership.entityId,
  );
  const committeesByEntity = countBy(
    committees,
    (committee) => committee.entityId,
  );
  const activeWalletsByEntity = countBy(
    wallets.filter((wallet) => wallet.isActive),
    (wallet) => wallet.entityId,
  );
  const expectedMinPersons =
    BASE_PERSON_COUNT +
    seedRuntime.profileConfig.familyExtraCount +
    seedRuntime.profileConfig.buildingExtraCount +
    seedRuntime.profileConfig.neighborhoodExtraCount +
    seedRuntime.profileConfig.campaignExtraCount +
    seedRuntime.profileConfig.youthExtraCount;
  const expectedMinMemberships =
    BASE_MEMBERSHIP_COUNT +
    seedRuntime.profileConfig.familyExtraCount +
    seedRuntime.profileConfig.buildingExtraCount +
    seedRuntime.profileConfig.neighborhoodExtraCount +
    seedRuntime.profileConfig.campaignExtraCount +
    seedRuntime.profileConfig.youthExtraCount * 2;

  if (personsCount < expectedMinPersons) {
    pushFinding(
      findings,
      'error',
      'PERSON_COUNT_TOO_LOW',
      `Expected at least ${expectedMinPersons} persons for profile "${seedRuntime.profile}".`,
      personsCount,
    );
  }

  if (membershipsCount < expectedMinMemberships) {
    pushFinding(
      findings,
      'error',
      'MEMBERSHIP_COUNT_TOO_LOW',
      `Expected at least ${expectedMinMemberships} memberships for profile "${seedRuntime.profile}".`,
      membershipsCount,
    );
  }

  const invalidBankAccounts = entities.filter(
    (entity) =>
      !entity.bankName?.trim() ||
      !entity.bankAccountNumber ||
      !/^SA\d{22}$/.test(entity.bankAccountNumber),
  );
  if (invalidBankAccounts.length > 0) {
    pushFinding(
      findings,
      'error',
      'ENTITY_BANK_ACCOUNT_INVALID',
      'Every seeded entity must have a bank name and a synthetic Saudi IBAN for transfer UI coverage.',
      invalidBankAccounts.length,
      sampleList(invalidBankAccounts.map((entity) => entity.name)),
    );
  }

  const unsupportedClosureStates = entities.filter(
    (entity) =>
      entity.closureStatus !== null &&
      entity.closureStatus !== 'PENDING_CLOSURE',
  );
  if (unsupportedClosureStates.length > 0) {
    pushFinding(
      findings,
      'error',
      'ENTITY_CLOSURE_STATE_UNSUPPORTED',
      'Seed data must not invent closure states that the implemented workflow cannot produce.',
      unsupportedClosureStates.length,
      sampleList(
        unsupportedClosureStates.map(
          (entity) => `${entity.name}:${entity.closureStatus}`,
        ),
      ),
    );
  }

  if (pendingClosureEntities.length < 2) {
    pushFinding(
      findings,
      'error',
      'ENTITY_CLOSURE_COVERAGE_LOW',
      'At least two entities must exercise the implemented pending-closure workflow.',
      pendingClosureEntities.length,
    );
  }

  const invalidClosureRequests = closureReadiness.filter(
    ({ entity, openDisbursements, openDisputes, balance }) =>
      !entity.closureRequestedAt ||
      !entity.closureReason?.trim() ||
      openDisbursements > 0 ||
      openDisputes > 0 ||
      balance > 0,
  );
  if (invalidClosureRequests.length > 0) {
    pushFinding(
      findings,
      'error',
      'ENTITY_CLOSURE_REQUEST_INVALID',
      'Pending closure entities must include a reason and date, have no open financial cases, and have no positive wallet balance.',
      invalidClosureRequests.length,
      sampleList(
        invalidClosureRequests.map(
          ({ entity, openDisbursements, openDisputes, balance }) =>
            `${entity.name}: balance=${balance}, disbursements=${openDisbursements}, disputes=${openDisputes}`,
        ),
      ),
    );
  }

  const preferenceMembershipIds = new Set(
    memberPreferences.map((preference) => preference.membershipId),
  );
  if (
    memberPreferences.length !== membershipsCount ||
    preferenceMembershipIds.size !== membershipsCount
  ) {
    pushFinding(
      findings,
      'error',
      'MEMBER_PREFERENCE_COVERAGE_INCOMPLETE',
      'Every seeded membership must have exactly one preference profile for policy impact scenarios.',
      memberPreferences.length,
    );
  }

  const preferenceDiversity = {
    requiresAudit: memberPreferences.filter(
      (preference) => preference.requiresAuditAccess,
    ).length,
    requiresCommittee: memberPreferences.filter(
      (preference) => preference.requiresCommitteeApproval,
    ).length,
    flexible: memberPreferences.filter(
      (preference) =>
        !preference.requiresAuditAccess &&
        !preference.requiresCommitteeApproval,
    ).length,
  };
  if (Object.values(preferenceDiversity).some((count) => count < 2)) {
    pushFinding(
      findings,
      'error',
      'MEMBER_PREFERENCE_DIVERSITY_LOW',
      'Preference data must include multiple audit-required, committee-required, and flexible members.',
      Math.min(...Object.values(preferenceDiversity)),
    );
  }

  const appealEnabledPolicies = entityPolicies.filter(
    (policy) => policy.allowAppeals,
  );
  const appealDisabledPolicies = entityPolicies.filter(
    (policy) => !policy.allowAppeals,
  );
  if (appealEnabledPolicies.length < 2 || appealDisabledPolicies.length < 2) {
    pushFinding(
      findings,
      'error',
      'ENTITY_APPEAL_POLICY_DIVERSITY_LOW',
      'Entity policies must include multiple appeal-enabled and appeal-disabled scenarios.',
      appealDisabledPolicies.length,
    );
  }

  const activeOwners = platformAccounts.filter(
    (account) => account.isActive && account.role === 'OWNER',
  );
  if (activeOwners.length !== 1) {
    pushFinding(
      findings,
      'error',
      'PLATFORM_OWNER_COUNT_INVALID',
      'The development dataset must contain exactly one active platform owner.',
      activeOwners.length,
    );
  }

  const platformRoleCounts = countBy(
    platformAccounts,
    (account) => account.role,
  );
  for (const role of Object.values(PlatformRole)) {
    const count = platformRoleCounts.get(role) ?? 0;
    const minimum = role === PlatformRole.OWNER ? 1 : 2;
    if (count < minimum) {
      pushFinding(
        findings,
        'error',
        'PLATFORM_ROLE_COVERAGE_LOW',
        `Platform role ${role} must have at least ${minimum} seeded account(s).`,
        count,
      );
    }

    if (
      !platformAccounts.some(
        (account) => account.role === role && account.isActive,
      )
    ) {
      pushFinding(
        findings,
        'error',
        'PLATFORM_ROLE_HAS_NO_ACTIVE_ACCOUNT',
        `Platform role ${role} must have an active login-ready account.`,
      );
    }
  }

  if (!platformAccounts.some((account) => !account.isActive)) {
    pushFinding(
      findings,
      'error',
      'PLATFORM_INACTIVE_ACCOUNT_MISSING',
      'The dataset must include an inactive platform account to exercise denied login.',
    );
  }

  const invalidPlatformLogs = platformAccessLogs.filter(
    (log) =>
      !log.reason.trim() ||
      !log.dataScope.trim() ||
      !log.notifiedEntityAdmin ||
      !platformAccounts.some(
        (account) => account.id === log.platformAccountId && account.isActive,
      ) ||
      !entities.some((entity) => entity.id === log.entityId),
  );
  if (invalidPlatformLogs.length > 0) {
    pushFinding(
      findings,
      'error',
      'PLATFORM_ACCESS_LOG_INVALID',
      'Every platform access must have a reason, scope, active account, valid entity, and entity-admin notification.',
      invalidPlatformLogs.length,
      sampleList(invalidPlatformLogs.map((log) => log.id)),
    );
  }

  const platformAccessCoverage = new Set(
    platformAccessLogs.map((log) => log.accessType),
  );
  for (const accessType of Object.values(PlatformAccessType)) {
    const count = platformAccessLogs.filter(
      (log) => log.accessType === accessType,
    ).length;
    if (!platformAccessCoverage.has(accessType) || count < 2) {
      pushFinding(
        findings,
        'error',
        'PLATFORM_ACCESS_COVERAGE_LOW',
        `Platform access scenario ${accessType} must have at least two records.`,
        count,
      );
    }
  }

  const platformAccountRoleById = new Map(
    platformAccounts.map((account) => [account.id, account.role]),
  );
  const invalidAccessRoleLogs = platformAccessLogs.filter((log) => {
    const role = platformAccountRoleById.get(log.platformAccountId);
    if (
      log.accessType === PlatformAccessType.ADMIN_ACTION ||
      log.accessType === PlatformAccessType.BREAK_GLASS
    ) {
      return role !== PlatformRole.OWNER && role !== PlatformRole.SUPER_ADMIN;
    }
    if (log.accessType === PlatformAccessType.SUPPORT) {
      return (
        role !== PlatformRole.SUPPORT &&
        role !== PlatformRole.SUPER_ADMIN &&
        role !== PlatformRole.OWNER
      );
    }
    return false;
  });
  if (invalidAccessRoleLogs.length > 0) {
    pushFinding(
      findings,
      'error',
      'PLATFORM_ACCESS_ROLE_MISMATCH',
      'Platform access scenarios must be performed by roles allowed for that access type.',
      invalidAccessRoleLogs.length,
      sampleList(invalidAccessRoleLogs.map((log) => log.id)),
    );
  }

  const supportSessionCounts = countBy(
    supportSessions,
    (session) => session.status,
  );
  for (const status of Object.values(SupportSessionStatus)) {
    const count = supportSessionCounts.get(status) ?? 0;
    if (count < 2) {
      pushFinding(
        findings,
        'error',
        'SUPPORT_SESSION_COVERAGE_LOW',
        `Support session status ${status} must have at least two records.`,
        count,
      );
    }
  }

  const invalidSupportSessions = supportSessions.filter((session) => {
    const account = platformAccounts.find(
      (candidate) => candidate.id === session.platformAccountId,
    );
    const hasValidTimeState =
      session.createdAt < session.expiresAt &&
      (session.status !== SupportSessionStatus.ACTIVE ||
        session.expiresAt > seedRuntime.referenceDate) &&
      (session.status !== SupportSessionStatus.EXPIRED ||
        session.expiresAt <= seedRuntime.referenceDate);

    return (
      !session.scope.trim() ||
      !entities.some((entity) => entity.id === session.entityId) ||
      !account?.isActive ||
      ![
        PlatformRole.SUPPORT,
        PlatformRole.SUPER_ADMIN,
        PlatformRole.OWNER,
      ].includes(account.role) ||
      !hasValidTimeState
    );
  });
  if (invalidSupportSessions.length > 0) {
    pushFinding(
      findings,
      'error',
      'SUPPORT_SESSION_INVALID',
      'Support sessions require an active platform support-capable account, valid entity, scope, and status-consistent time window.',
      invalidSupportSessions.length,
      sampleList(invalidSupportSessions.map((session) => session.id)),
    );
  }

  const missingPlatformAccessNotifications = platformAccessLogs.flatMap(
    (log) => {
      const expectedRecipients = activeMemberships
        .filter(
          (membership) =>
            membership.entityId === log.entityId &&
            (membership.role === 'FOUNDER' || membership.role === 'ADMIN'),
        )
        .map((membership) => membership.person.id);

      return expectedRecipients.filter(
        (personId) =>
          !notifications.some(
            (notification) =>
              notification.personId === personId &&
              notification.type === 'PLATFORM_ACCESS' &&
              notification.targetType === 'ENTITY' &&
              notification.targetId === log.entityId &&
              notification.sentAt.getTime() === log.startedAt.getTime() &&
              notification.body.includes(log.reason),
          ),
      );
    },
  );
  if (missingPlatformAccessNotifications.length > 0) {
    pushFinding(
      findings,
      'error',
      'PLATFORM_ACCESS_NOTIFICATION_MISSING',
      'Every active founder and admin must receive a notification for platform access to their entity.',
      missingPlatformAccessNotifications.length,
      sampleList(missingPlatformAccessNotifications),
    );
  }

  const invalidPlatformStateEntities = entities.filter((entity) => {
    if (entity.platformStatus === EntityPlatformStatus.ACTIVE) {
      return entity.suspendedAt !== null || entity.suspendedReason !== null;
    }
    return !entity.suspendedAt || !entity.suspendedReason?.trim();
  });
  if (invalidPlatformStateEntities.length > 0) {
    pushFinding(
      findings,
      'error',
      'ENTITY_PLATFORM_STATE_DETAILS_INVALID',
      'Non-active platform states require a timestamp and reason; active entities must clear both fields.',
      invalidPlatformStateEntities.length,
      sampleList(invalidPlatformStateEntities.map((entity) => entity.id)),
    );
  }

  const platformAppealCounts = countBy(
    platformSuspensionAppeals,
    (appeal) => appeal.status,
  );
  for (const status of ['PENDING', 'REVIEWED', 'RESOLVED']) {
    const count = platformAppealCounts.get(status) ?? 0;
    if (count < 2) {
      pushFinding(
        findings,
        'error',
        'PLATFORM_APPEAL_COVERAGE_LOW',
        `Platform suspension appeal status ${status} must have at least two records.`,
        count,
      );
    }
  }

  const platformAppealSubmitterRoles = new Map(
    activeMemberships.map((membership) => [
      `${membership.entityId}:${membership.person.id}`,
      membership.role,
    ]),
  );
  const invalidPlatformAppeals = platformSuspensionAppeals.filter((appeal) => {
    const role = platformAppealSubmitterRoles.get(
      `${appeal.entityId}:${appeal.submittedById}`,
    );
    const entity = entities.find(
      (candidate) => candidate.id === appeal.entityId,
    );
    const hasValidResolution =
      appeal.status === 'PENDING'
        ? appeal.response === null && appeal.resolvedAt === null
        : Boolean(appeal.response?.trim() && appeal.resolvedAt);

    return (
      !appeal.reason.trim() ||
      (role !== 'FOUNDER' && role !== 'ADMIN') ||
      !entity ||
      entity.platformStatus === EntityPlatformStatus.ACTIVE ||
      !['PENDING', 'REVIEWED', 'RESOLVED'].includes(appeal.status) ||
      !hasValidResolution ||
      Boolean(appeal.resolvedAt && appeal.resolvedAt < appeal.createdAt)
    );
  });
  if (invalidPlatformAppeals.length > 0) {
    pushFinding(
      findings,
      'error',
      'PLATFORM_APPEAL_INVALID',
      'Platform suspension appeals require a non-active entity, an active founder/admin submitter, and status-consistent response dates.',
      invalidPlatformAppeals.length,
      sampleList(invalidPlatformAppeals.map((appeal) => appeal.id)),
    );
  }

  const duplicatePendingPlatformAppeals = Array.from(
    countBy(
      platformSuspensionAppeals.filter((appeal) => appeal.status === 'PENDING'),
      (appeal) => appeal.entityId,
    ),
  ).filter(([, count]) => count > 1);
  if (duplicatePendingPlatformAppeals.length > 0) {
    pushFinding(
      findings,
      'error',
      'PLATFORM_APPEAL_DUPLICATE_PENDING',
      'An entity may have only one pending platform suspension appeal.',
      duplicatePendingPlatformAppeals.length,
      sampleList(duplicatePendingPlatformAppeals.map(([entityId]) => entityId)),
    );
  }

  const platformStatusCoverage = new Set(
    entities.map((entity) => entity.platformStatus),
  );
  for (const status of Object.values(EntityPlatformStatus)) {
    if (!platformStatusCoverage.has(status)) {
      pushFinding(
        findings,
        'error',
        'ENTITY_PLATFORM_STATUS_COVERAGE_LOW',
        `Missing entity platform status ${status}.`,
      );
    }
  }

  const applicationCounts = countBy(
    membershipApplications,
    (application) => application.status,
  );
  for (const status of Object.values(MembershipApplicationStatus)) {
    const count = applicationCounts.get(status) ?? 0;
    if (count < 2) {
      pushFinding(
        findings,
        'error',
        'MEMBERSHIP_APPLICATION_COVERAGE_LOW',
        `Membership application status ${status} must have at least two records.`,
        count,
      );
    }
  }

  const activeMembershipKeys = new Set(
    activeMemberships.map(
      (membership) => `${membership.person.id}:${membership.entityId}`,
    ),
  );
  const invalidPendingApplications = membershipApplications.filter(
    (application) =>
      (application.status === MembershipApplicationStatus.PENDING ||
        application.status === MembershipApplicationStatus.UNDER_REVIEW) &&
      activeMembershipKeys.has(
        `${application.personId}:${application.entityId}`,
      ),
  );
  if (invalidPendingApplications.length > 0) {
    pushFinding(
      findings,
      'error',
      'PENDING_APPLICATION_HAS_ACTIVE_MEMBERSHIP',
      'Pending applicants must not receive tenant membership or access.',
      invalidPendingApplications.length,
      sampleList(invalidPendingApplications.map((item) => item.id)),
    );
  }

  const invalidApprovedApplications = membershipApplications.filter(
    (application) =>
      application.status === MembershipApplicationStatus.APPROVED &&
      !activeMembershipKeys.has(
        `${application.personId}:${application.entityId}`,
      ),
  );
  if (invalidApprovedApplications.length > 0) {
    pushFinding(
      findings,
      'error',
      'APPROVED_APPLICATION_WITHOUT_MEMBERSHIP',
      'Every approved membership application must resolve to an active membership.',
      invalidApprovedApplications.length,
      sampleList(invalidApprovedApplications.map((item) => item.id)),
    );
  }

  const reviewerRoleByEntityAndPerson = new Map(
    activeMemberships.map((membership) => [
      `${membership.entityId}:${membership.person.id}`,
      membership.role,
    ]),
  );
  const invalidApplicationReviewers = membershipApplications.filter(
    (application) => {
      if (!application.reviewedById) return false;
      const role = reviewerRoleByEntityAndPerson.get(
        `${application.entityId}:${application.reviewedById}`,
      );
      return role !== 'FOUNDER' && role !== 'ADMIN';
    },
  );
  if (invalidApplicationReviewers.length > 0) {
    pushFinding(
      findings,
      'error',
      'MEMBERSHIP_APPLICATION_REVIEWER_INVALID',
      'Membership applications must be reviewed by an active founder or admin in the same entity.',
      invalidApplicationReviewers.length,
      sampleList(invalidApplicationReviewers.map((item) => item.id)),
    );
  }

  const invitationCoverage = {
    active: invitations.filter(
      (invitation) =>
        invitation.isActive &&
        (!invitation.expiresAt ||
          invitation.expiresAt > seedRuntime.referenceDate) &&
        (invitation.maxUses === null ||
          invitation.usedCount < invitation.maxUses),
    ).length,
    expired: invitations.filter(
      (invitation) =>
        invitation.expiresAt &&
        invitation.expiresAt <= seedRuntime.referenceDate,
    ).length,
    exhausted: invitations.filter(
      (invitation) =>
        invitation.maxUses !== null &&
        invitation.usedCount >= invitation.maxUses,
    ).length,
    revoked: invitations.filter((invitation) => !invitation.isActive).length,
  };
  for (const [scenario, count] of Object.entries(invitationCoverage)) {
    if (count === 0) {
      pushFinding(
        findings,
        'error',
        'INVITATION_COVERAGE_LOW',
        `Missing invitation scenario ${scenario}.`,
      );
    }
  }

  const activeMembershipIds = new Set(
    activeMemberships.map((membership) => membership.id),
  );
  const subscribedMembershipIds = new Set(
    subscriptions.map((subscription) => subscription.membership.id),
  );
  const activeMembershipsWithoutHistory = Array.from(
    activeMembershipIds,
  ).filter((membershipId) => !subscribedMembershipIds.has(membershipId));
  if (activeMembershipsWithoutHistory.length > 0) {
    pushFinding(
      findings,
      'error',
      'ACTIVE_MEMBER_WITHOUT_SUBSCRIPTION_HISTORY',
      'Every active membership must have at least one subscription state in its operational history.',
      activeMembershipsWithoutHistory.length,
      sampleList(activeMembershipsWithoutHistory),
    );
  }

  const membersMissingLoginIdentity = activeMemberships.filter(
    (membership) =>
      membership.person.username.trim().length === 0 ||
      !membership.person.phoneNumber?.trim(),
  );
  if (membersMissingLoginIdentity.length > 0) {
    pushFinding(
      findings,
      'error',
      'ACTIVE_MEMBER_LOGIN_IDENTITY_MISSING',
      'Every active member must have both a username and phone number for development and OTP login.',
      membersMissingLoginIdentity.length,
      sampleList(
        membersMissingLoginIdentity.map((membership) => membership.person.name),
      ),
    );
  }

  const activePersonIds = new Set(
    activeMemberships.map((membership) => membership.person.id),
  );
  const notifiedPersonIds = new Set(
    notifications.map((notification) => notification.personId),
  );
  const loginHistoryPersonIds = new Set(
    loginAuditLogs.flatMap((log) => (log.personId ? [log.personId] : [])),
  );
  const documentOwnerIds = new Set(
    documents.map((document) => document.uploadedById),
  );
  const exposedAnnualStatements = documents.filter(
    (document) =>
      document.name.startsWith('كشف المشاركة السنوي -') &&
      document.privacyLevel !== 'HIDDEN_SENSITIVE',
  );
  if (exposedAnnualStatements.length > 0) {
    pushFinding(
      findings,
      'error',
      'ANNUAL_STATEMENT_PRIVACY_INVALID',
      'Annual member statements must be visible only to their owner and privileged roles.',
      exposedAnnualStatements.length,
      sampleList(exposedAnnualStatements.map((document) => document.name)),
    );
  }

  for (const [code, message, coveredIds] of [
    [
      'ACTIVE_MEMBER_NOTIFICATION_HISTORY_MISSING',
      'Every active person must have notification history.',
      notifiedPersonIds,
    ],
    [
      'ACTIVE_MEMBER_LOGIN_HISTORY_MISSING',
      'Every active person must have at least one recorded login event.',
      loginHistoryPersonIds,
    ],
    [
      'ACTIVE_MEMBER_DOCUMENT_HISTORY_MISSING',
      'Every active person must own at least one operational document or statement.',
      documentOwnerIds,
    ],
  ] as const) {
    const missing = Array.from(activePersonIds).filter(
      (personId) => !coveredIds.has(personId),
    );
    if (missing.length > 0) {
      pushFinding(
        findings,
        'error',
        code,
        message,
        missing.length,
        sampleList(missing),
      );
    }
  }

  const billablePersonIds = new Set(
    subscriptions
      .filter(
        (subscription) =>
          subscription.activeAt &&
          subscription.agreedAmount &&
          Number(subscription.agreedAmount) > 0 &&
          !['INTERESTED', 'CONDITIONAL'].includes(subscription.state),
      )
      .map((subscription) => subscription.membership.person.id),
  );
  const paymentHistoryPersonIds = new Set(
    paymentRecords.map((record) => record.subscription.membership.personId),
  );
  const billablePeopleWithoutPayments = Array.from(billablePersonIds).filter(
    (personId) => !paymentHistoryPersonIds.has(personId),
  );
  if (billablePeopleWithoutPayments.length > 0) {
    pushFinding(
      findings,
      'error',
      'BILLABLE_MEMBER_PAYMENT_HISTORY_MISSING',
      'Every person with a billable subscription must have payment record history.',
      billablePeopleWithoutPayments.length,
      sampleList(billablePeopleWithoutPayments),
    );
  }

  const snapshotPeriods = new Set(
    balanceSnapshots.map((snapshot) => snapshot.period),
  );
  if (snapshotPeriods.size < 12) {
    pushFinding(
      findings,
      'error',
      'MONTHLY_BALANCE_HISTORY_INCOMPLETE',
      'Operational data must contain at least 12 distinct monthly balance snapshot periods.',
      snapshotPeriods.size,
      sampleList(Array.from(snapshotPeriods).sort()),
    );
  }

  const unbalancedTransactions = ledgerTransactions.filter((transaction) => {
    const debit = transaction.entries
      .filter((entry) => entry.type === 'DEBIT')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const credit = transaction.entries
      .filter((entry) => entry.type === 'CREDIT')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    return transaction.entries.length < 2 || Math.abs(debit - credit) > 0.001;
  });
  if (unbalancedTransactions.length > 0) {
    pushFinding(
      findings,
      'error',
      'LEDGER_TRANSACTION_UNBALANCED',
      'Every ledger transaction must contain balanced debit and credit entries.',
      unbalancedTransactions.length,
      sampleList(unbalancedTransactions.map((transaction) => transaction.id)),
    );
  }

  const transactionWalletIds = (
    transaction: (typeof ledgerTransactions)[number],
  ) =>
    new Set(
      transaction.entries
        .map(
          (entry) =>
            entry.account.walletId ??
            entry.account.governancePath?.walletId ??
            entry.account.spendingItem?.governancePath.walletId ??
            null,
        )
        .filter((walletId): walletId is string => walletId !== null),
    );

  const twoYearsAgo = new Date(seedRuntime.referenceDate);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const zombieWallets = wallets.filter(
    (wallet) =>
      wallet.isActive &&
      Number(wallet.ledgerAccount?.balance ?? 0) > 0 &&
      !ledgerTransactions.some(
        (transaction) =>
          transaction.createdAt >= twoYearsAgo &&
          transactionWalletIds(transaction).has(wallet.id),
      ),
  );
  if (zombieWallets.length === 0) {
    pushFinding(
      findings,
      'error',
      'FUND_HEALTH_ZOMBIE_WALLET_MISSING',
      'Fund health coverage requires an active positive-balance wallet with no activity for more than two years.',
    );
  }

  const twelveMonthsAgo = new Date(
    seedRuntime.referenceDate.getTime() - 365 * 24 * 60 * 60 * 1000,
  );
  const belowSafetyWallets = wallets.filter((wallet) => {
    if (!wallet.isActive || !/طوارئ|emergency/i.test(wallet.name)) return false;
    const disbursements = ledgerTransactions.filter(
      (transaction) =>
        transaction.type === 'DISBURSEMENT' &&
        !transaction.isReversed &&
        transaction.createdAt >= twelveMonthsAgo &&
        transactionWalletIds(transaction).has(wallet.id),
    );
    if (disbursements.length === 0) return false;
    const average =
      disbursements.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0,
      ) / disbursements.length;
    return Number(wallet.ledgerAccount?.balance ?? 0) < average * 3;
  });
  if (belowSafetyWallets.length === 0) {
    pushFinding(
      findings,
      'error',
      'FUND_HEALTH_SAFETY_THRESHOLD_MISSING',
      'Fund health coverage requires an emergency wallet below three times its average recent disbursement.',
    );
  }

  const ninetyDaysAgo = new Date(
    seedRuntime.referenceDate.getTime() - 90 * 24 * 60 * 60 * 1000,
  );
  const recentTransactionsByEntity = new Map<
    string,
    typeof ledgerTransactions
  >();
  for (const transaction of ledgerTransactions) {
    if (!transaction.originEntityId || transaction.createdAt < ninetyDaysAgo) {
      continue;
    }
    const current =
      recentTransactionsByEntity.get(transaction.originEntityId) ?? [];
    current.push(transaction);
    recentTransactionsByEntity.set(transaction.originEntityId, current);
  }
  const highOutOfBandEntities = Array.from(
    recentTransactionsByEntity.entries(),
  ).filter(([, transactions]) => {
    const outOfBand = transactions.filter(
      (transaction) =>
        transaction.type === 'REVERSAL' ||
        transaction.originKind === 'UNSPECIFIED' ||
        /تسوية|واتساب|retroactive/i.test(transaction.description) ||
        /manual|خارج النظام/i.test(transaction.originNote ?? ''),
    ).length;
    return transactions.length > 0 && outOfBand / transactions.length > 0.2;
  });
  if (highOutOfBandEntities.length === 0) {
    pushFinding(
      findings,
      'error',
      'FUND_HEALTH_OUT_OF_BAND_MISSING',
      'Fund health coverage requires an entity whose recent out-of-band transaction ratio exceeds 20%.',
    );
  }

  const invalidCommitteeMemberships = committeeMemberships.filter(
    (link) => link.committee.entityId !== link.membership.entityId,
  );
  if (invalidCommitteeMemberships.length > 0) {
    pushFinding(
      findings,
      'error',
      'COMMITTEE_ENTITY_MISMATCH',
      'Some committee members belong to a different entity than the committee.',
      invalidCommitteeMemberships.length,
      sampleList(
        invalidCommitteeMemberships.map(
          (link) => `${link.membership.person.name} -> ${link.committee.name}`,
        ),
      ),
    );
  }

  const oversizedCommittees = committees.filter(
    (committee) =>
      committee._count.members >=
      (activeMembershipsByEntity.get(committee.entityId) ?? 0),
  );
  if (oversizedCommittees.length > 0) {
    pushFinding(
      findings,
      'error',
      'COMMITTEE_OVERSIZED',
      'Every entity must have more active members than the members of any one committee.',
      oversizedCommittees.length,
      sampleList(
        oversizedCommittees.map(
          (committee) =>
            `${committee.name} (${committee._count.members}/${activeMembershipsByEntity.get(committee.entityId) ?? 0})`,
        ),
      ),
    );
  }

  if (personsCount <= committees.length) {
    pushFinding(
      findings,
      'error',
      'GLOBAL_COMMITTEE_COUNT_UNREALISTIC',
      'The total number of people must be greater than the total number of committees.',
      committees.length,
    );
  }

  const unrealisticEntityStructures = entities.filter((entity) => {
    const memberCount = activeMembershipsByEntity.get(entity.id) ?? 0;
    const committeeCount = committeesByEntity.get(entity.id) ?? 0;
    const walletCountForEntity = activeWalletsByEntity.get(entity.id) ?? 0;
    return memberCount <= committeeCount || memberCount <= walletCountForEntity;
  });
  if (unrealisticEntityStructures.length > 0) {
    pushFinding(
      findings,
      'error',
      'ENTITY_STRUCTURE_RATIO_UNREALISTIC',
      'Each entity must have more active members than its committees and active wallets.',
      unrealisticEntityStructures.length,
      sampleList(
        unrealisticEntityStructures.map((entity) => {
          const members = activeMembershipsByEntity.get(entity.id) ?? 0;
          const entityCommittees = committeesByEntity.get(entity.id) ?? 0;
          const entityWallets = activeWalletsByEntity.get(entity.id) ?? 0;
          return `${entity.name}: members=${members}, committees=${entityCommittees}, wallets=${entityWallets}`;
        }),
      ),
    );
  }

  const invalidHouseholdLinks = householdMemberships.filter(
    (link) => link.household.entityId !== link.membership.entityId,
  );
  if (invalidHouseholdLinks.length > 0) {
    pushFinding(
      findings,
      'error',
      'HOUSEHOLD_ENTITY_MISMATCH',
      'Some household memberships point to members outside the household entity.',
      invalidHouseholdLinks.length,
      sampleList(
        invalidHouseholdLinks.map(
          (link) => `${link.membership.person.name} -> ${link.household.name}`,
        ),
      ),
    );
  }

  const crossEntitySubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.membership.entityId !==
      subscription.governancePath.wallet.entityId,
  );
  if (crossEntitySubscriptions.length > 0) {
    pushFinding(
      findings,
      'error',
      'SUBSCRIPTION_ENTITY_MISMATCH',
      'Some subscriptions point to paths outside the member entity.',
      crossEntitySubscriptions.length,
      sampleList(
        crossEntitySubscriptions.map(
          (subscription) =>
            `${subscription.membership.person.name} -> ${subscription.governancePath.name}/${subscription.governancePath.wallet.name}`,
        ),
      ),
    );
  }

  const invalidBeneficiaries = beneficiaries.filter((beneficiary) => {
    if (beneficiary.type === 'MEMBER') {
      return !beneficiary.membershipId || !!beneficiary.dependentId;
    }

    if (beneficiary.type === 'DEPENDENT') {
      return !beneficiary.dependentId || !!beneficiary.membershipId;
    }

    return !!beneficiary.membershipId || !!beneficiary.dependentId;
  });
  if (invalidBeneficiaries.length > 0) {
    pushFinding(
      findings,
      'error',
      'BENEFICIARY_STATE_INVALID',
      'Some beneficiaries do not match their declared type.',
      invalidBeneficiaries.length,
      sampleList(
        invalidBeneficiaries.map(
          (beneficiary) => `${beneficiary.displayName} (${beneficiary.type})`,
        ),
      ),
    );
  }

  const mismatchedPaymentRecords = paymentRecords.filter(
    (record) => record.subscriptionId !== record.paymentDue.subscriptionId,
  );
  if (mismatchedPaymentRecords.length > 0) {
    pushFinding(
      findings,
      'error',
      'PAYMENT_RECORD_LINK_INVALID',
      'Some payment records point to dues owned by a different subscription.',
      mismatchedPaymentRecords.length,
    );
  }

  const underpaidRecords = paymentRecords.filter(
    (record) => Number(record.amount) < Number(record.paymentDue.amountDue),
  );
  const overpaidRecords = paymentRecords.filter(
    (record) => Number(record.amount) > Number(record.paymentDue.amountDue),
  );
  const exactPaymentRecords = paymentRecords.filter(
    (record) => Number(record.amount) === Number(record.paymentDue.amountDue),
  );
  if (
    underpaidRecords.length < 2 ||
    overpaidRecords.length < 2 ||
    exactPaymentRecords.length < 2
  ) {
    pushFinding(
      findings,
      'error',
      'PAYMENT_AMOUNT_COMPARISON_COVERAGE_LOW',
      'Payment matching UI requires multiple underpaid, overpaid, and exact records.',
      underpaidRecords.length + overpaidRecords.length,
    );
  }

  const invalidConfirmedRecords = paymentRecords.filter(
    (record) =>
      record.status === PaymentRecordStatus.CONFIRMED &&
      (!record.transactionId ||
        record.paymentDue.status !== PaymentDueStatus.PAID),
  );
  if (invalidConfirmedRecords.length > 0) {
    pushFinding(
      findings,
      'error',
      'PAYMENT_CONFIRMATION_INCOMPLETE',
      'Some confirmed payment records are missing a linked transaction or a paid due.',
      invalidConfirmedRecords.length,
    );
  }

  const invalidSettledDues = paymentDues.filter(
    (due) =>
      due.status === PaymentDueStatus.PAID &&
      (!due.transactionId || due.transactionId.length === 0),
  );
  if (invalidSettledDues.length > 0) {
    pushFinding(
      findings,
      'error',
      'PAID_DUE_WITHOUT_TRANSACTION',
      'Some paid dues do not carry a transaction reference.',
      invalidSettledDues.length,
    );
  }

  const invalidSharedWallets = sharedWallets.filter(
    (wallet) => wallet.governancePaths.length > 1,
  );
  if (invalidSharedWallets.length > 0) {
    pushFinding(
      findings,
      'error',
      'SHARED_WALLET_MULTI_PATH',
      'Shared-benefit wallets must expose a single active governance path.',
      invalidSharedWallets.length,
      sampleList(
        invalidSharedWallets.map(
          (wallet) =>
            `${wallet.entity.name} / ${wallet.name} (${wallet.governancePaths.length} paths)`,
        ),
      ),
    );
  }

  const oneFamilyVotes = votes.filter(
    (vote) => vote.decision.voteType === VoteType.ONE_FAMILY_ONE_VOTE,
  );
  const oneFamilyVotesMissingHousehold = oneFamilyVotes.filter(
    (vote) => !vote.householdId,
  );
  if (oneFamilyVotesMissingHousehold.length > 0) {
    pushFinding(
      findings,
      'error',
      'ONE_FAMILY_VOTE_MISSING_HOUSEHOLD',
      'Some ONE_FAMILY_ONE_VOTE records are missing householdId.',
      oneFamilyVotesMissingHousehold.length,
      sampleList(
        oneFamilyVotesMissingHousehold.map((vote) => vote.decision.title),
      ),
    );
  }

  const duplicateOneFamilyVotes = Array.from(
    countBy(
      oneFamilyVotes.filter((vote) => !!vote.householdId),
      (vote) => `${vote.decisionId}:${vote.householdId ?? 'none'}`,
    ),
  ).filter(([, count]) => count > 1);
  if (duplicateOneFamilyVotes.length > 0) {
    pushFinding(
      findings,
      'error',
      'ONE_FAMILY_DUPLICATE_VOTE',
      'Some households voted more than once on the same decision.',
      duplicateOneFamilyVotes.length,
    );
  }

  const expiredCampaignsReady = entities.filter(
    (entity) =>
      entity.isCampaign &&
      entity.isActive &&
      entity.campaignEndsAt !== null &&
      entity.campaignEndsAt <= seedRuntime.referenceDate,
  );
  const archivedExpiredCampaigns = entities.filter(
    (entity) =>
      entity.isCampaign &&
      !entity.isActive &&
      entity.campaignEndsAt !== null &&
      entity.campaignEndsAt <= seedRuntime.referenceDate,
  );
  if (
    expiredCampaignsReady.length === 0 &&
    archivedExpiredCampaigns.length === 0
  ) {
    pushFinding(
      findings,
      'warning',
      'CAMPAIGN_ARCHIVAL_COVERAGE_LOW',
      'No active expired campaign is present to exercise archival flows.',
    );
  }

  const oneFamilyDecisionCount = decisions.filter(
    (decision) => decision.voteType === VoteType.ONE_FAMILY_ONE_VOTE,
  ).length;
  if (oneFamilyDecisionCount === 0) {
    pushFinding(
      findings,
      'warning',
      'ONE_FAMILY_COVERAGE_LOW',
      'No ONE_FAMILY_ONE_VOTE decision exists in the dataset.',
    );
  }

  if (sharedWallets.length === 0) {
    pushFinding(
      findings,
      'warning',
      'SHARED_WALLET_COVERAGE_LOW',
      'No shared-benefit wallet exists to exercise shared-benefit analytics.',
    );
  }

  const documentPrivacyCoverage = new Set(
    documents.map((document) => document.privacyLevel),
  );
  for (const requiredPrivacyLevel of [
    'VISIBLE_TO_AUDITOR',
    'HIDDEN_SENSITIVE',
    'AGGREGATED_ONLY',
  ]) {
    if (!documentPrivacyCoverage.has(requiredPrivacyLevel as never)) {
      pushFinding(
        findings,
        'warning',
        'DOCUMENT_PRIVACY_COVERAGE_LOW',
        `Missing document coverage for privacy level ${requiredPrivacyLevel}.`,
      );
    }
  }

  const dueStatusCoverage = new Set(paymentDues.map((due) => due.status));
  for (const requiredStatus of [
    PaymentDueStatus.PAID,
    PaymentDueStatus.PENDING,
    PaymentDueStatus.OVERDUE,
    PaymentDueStatus.WAIVED,
  ]) {
    if (!dueStatusCoverage.has(requiredStatus)) {
      pushFinding(
        findings,
        'warning',
        'PAYMENT_DUE_COVERAGE_LOW',
        `Missing payment due status ${requiredStatus}.`,
      );
    }
  }

  const paymentRecordCoverage = new Set(
    paymentRecords.map((record) => record.status),
  );
  for (const requiredStatus of [
    PaymentRecordStatus.PROCESSING,
    PaymentRecordStatus.CONFIRMED,
    PaymentRecordStatus.SUBMITTED,
    PaymentRecordStatus.REJECTED,
    PaymentRecordStatus.CANCELLED,
  ]) {
    if (!paymentRecordCoverage.has(requiredStatus)) {
      pushFinding(
        findings,
        'warning',
        'PAYMENT_RECORD_COVERAGE_LOW',
        `Missing payment record status ${requiredStatus}.`,
      );
    }
  }

  const invalidProcessingPayments = paymentRecords.filter(
    (record) =>
      record.status === PaymentRecordStatus.PROCESSING &&
      (record.paymentMethod === 'MANUAL' || !record.gatewayTransactionId),
  );
  if (invalidProcessingPayments.length > 0) {
    pushFinding(
      findings,
      'error',
      'PROCESSING_PAYMENT_INVALID',
      'Processing payments must represent an electronic gateway attempt with a gateway transaction id.',
      invalidProcessingPayments.length,
      sampleList(invalidProcessingPayments.map((record) => record.id)),
    );
  }

  const membershipDistribution = entities.map((entity) => ({
    entity: entity.name,
    platformStatus: entity.platformStatus,
    activeMemberships: activeMembershipsByEntity.get(entity.id) ?? 0,
    committees: committeesByEntity.get(entity.id) ?? 0,
    wallets: activeWalletsByEntity.get(entity.id) ?? 0,
  }));

  const dueStatusDistribution = Array.from(
    countBy(paymentDues, (due) => due.status),
  ).map(([status, count]) => ({
    status,
    count,
  }));

  const paymentRecordDistribution = Array.from(
    countBy(paymentRecords, (record) => record.status),
  ).map(([status, count]) => ({
    status,
    count,
  }));

  const privacyDistribution = Array.from(
    countBy(documents, (document) => document.privacyLevel),
  ).map(([privacyLevel, count]) => ({
    privacyLevel,
    count,
  }));

  const summary = {
    profile: seedRuntime.profile,
    referenceDate: formatSeedDate(seedRuntime.referenceDate),
    persons: personsCount,
    memberships: membershipsCount,
    memberPreferences: memberPreferences.length,
    membershipApplications: membershipApplications.length,
    invitations: invitations.length,
    platformAccounts: platformAccounts.length,
    platformAccessLogs: platformAccessLogs.length,
    supportSessions: supportSessions.length,
    platformSuspensionAppeals: platformSuspensionAppeals.length,
    pendingClosureEntities: pendingClosureEntities.length,
    loginReadyMembers: new Set(
      activeMemberships.map((membership) => membership.person.id),
    ).size,
    entities: entities.length,
    wallets: walletCount,
    paths: pathCount,
    committees: committees.length,
    subscriptions: subscriptions.length,
    beneficiaries: beneficiaries.length,
    paymentDues: paymentDues.length,
    paymentRecords: paymentRecords.length,
    oneFamilyDecisions: oneFamilyDecisionCount,
    expiredCampaignsReady: expiredCampaignsReady.length,
    archivedExpiredCampaigns: archivedExpiredCampaigns.length,
    sharedWallets: sharedWallets.length,
    zombieWallets: zombieWallets.length,
    belowSafetyWallets: belowSafetyWallets.length,
    highOutOfBandEntities: highOutOfBandEntities.length,
    operationalPeriods: snapshotPeriods.size,
    balanceSnapshots: balanceSnapshots.length,
    loginEvents: loginAuditLogs.length,
    notifications: notifications.length,
    balancedTransactions:
      ledgerTransactions.length - unbalancedTransactions.length,
  };

  console.table(summary);
  console.log('Active membership distribution by entity:');
  console.table(membershipDistribution);
  console.log('Payment due status coverage:');
  console.table(dueStatusDistribution);
  console.log('Payment record status coverage:');
  console.table(paymentRecordDistribution);
  console.log('Document privacy coverage:');
  console.table(privacyDistribution);

  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  if (warnings.length > 0) {
    console.log('Validation warnings:');
    console.table(warnings);
  }

  if (errors.length > 0) {
    console.error('Seed validation failed.');
    console.table(errors);
    process.exitCode = 1;
    return;
  }

  console.log('Seed validation passed.');
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
