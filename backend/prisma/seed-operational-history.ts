import { createHash } from 'node:crypto';
import {
  AuditAction,
  DecisionExecutionStatus,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  DisbursementRequestStatus,
  LedgerAccountType,
  LedgerEntryType,
  LedgerTransactionType,
  MoneyOriginKind,
  MoneyType,
  NotificationTargetType,
  NotificationType,
  PaymentDueStatus,
  PaymentRecordStatus,
  Prisma,
  type PrismaClient,
  SubjectType,
  SubscriptionState,
  TransparencyLevel,
  VoteChoice,
  VoteType,
  VotersScope,
} from '@prisma/client';

const DAY = 24 * 60 * 60 * 1000;
const SEED_NAMESPACE = 'stgp-full-seed-v1';

type SeedOperationalHistoryOptions = {
  prisma: PrismaClient;
  referenceDate: Date;
  months?: number;
};

type OperationalDue = {
  id: string;
  subscriptionId: string;
  personId: string;
  username: string;
  membershipId: string;
  entityId: string;
  entityName: string;
  walletId: string;
  pathId: string;
  pathName: string;
  pathType: string;
  pathAccountId: string;
  reviewerId: string | null;
  periodLabel: string;
  dueDate: Date;
  amountDue: string;
  status: PaymentDueStatus;
};

function stableUuid(key: string): string {
  const hash = createHash('sha1')
    .update(`${SEED_NAMESPACE}:${key}`)
    .digest('hex')
    .slice(0, 32)
    .split('');

  hash[12] = '5';
  hash[16] = ['8', '9', 'a', 'b'][Number.parseInt(hash[16], 16) % 4];

  return `${hash.slice(0, 8).join('')}-${hash.slice(8, 12).join('')}-${hash
    .slice(12, 16)
    .join('')}-${hash.slice(16, 20).join('')}-${hash.slice(20).join('')}`;
}

const seedId = (scope: string, key: string) => stableUuid(`${scope}:${key}`);

const scoreFor = (...parts: string[]) =>
  Number.parseInt(
    createHash('sha1').update(parts.join(':')).digest('hex').slice(0, 8),
    16,
  );

const formatPeriod = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY);

const clampDate = (date: Date, maximum: Date) =>
  date > maximum ? new Date(maximum) : date;

function operationalMonths(referenceDate: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - (count - index - 1),
      1,
      12,
    );
    return month;
  });
}

function endOfOperationalMonth(month: Date, referenceDate: Date) {
  const end = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return end > referenceDate ? new Date(referenceDate) : end;
}

async function createInBatches<T>(
  items: T[],
  action: (batch: T[]) => Promise<unknown>,
  batchSize = 300,
) {
  for (let index = 0; index < items.length; index += batchSize) {
    await action(items.slice(index, index + batchSize));
  }
}

function paymentStatusFor(
  score: number,
  isCurrentPeriod: boolean,
  state: SubscriptionState,
  dueDate: Date,
  referenceDate: Date,
) {
  if (state === SubscriptionState.SUSPENDED && dueDate <= referenceDate) {
    return PaymentDueStatus.OVERDUE;
  }

  if (isCurrentPeriod) {
    const bucket = score % 20;
    if (bucket < 13) return PaymentDueStatus.PAID;
    if (bucket < 16) return PaymentDueStatus.PENDING;
    if (bucket < 19) return PaymentDueStatus.OVERDUE;
    return PaymentDueStatus.WAIVED;
  }

  const bucket = score % 20;
  if (bucket < 16) return PaymentDueStatus.PAID;
  if (bucket < 18) return PaymentDueStatus.OVERDUE;
  return PaymentDueStatus.WAIVED;
}

function paymentRecordStatusFor(due: OperationalDue) {
  if (due.status === PaymentDueStatus.PAID) {
    return PaymentRecordStatus.CONFIRMED;
  }
  if (due.status === PaymentDueStatus.PENDING) {
    return scoreFor(due.id, 'record') % 3 === 0
      ? PaymentRecordStatus.CANCELLED
      : PaymentRecordStatus.SUBMITTED;
  }
  if (
    due.status === PaymentDueStatus.OVERDUE &&
    scoreFor(due.id, 'record') % 3 === 0
  ) {
    return PaymentRecordStatus.REJECTED;
  }
  return null;
}

function paymentMoneyType(pathType: string) {
  return pathType === 'DONATION_ONLY'
    ? {
        type: LedgerTransactionType.DONATION,
        moneyType: MoneyType.DONATION,
      }
    : {
        type: LedgerTransactionType.SUBSCRIPTION_PAYMENT,
        moneyType: MoneyType.SUBSCRIPTION,
      };
}

function disbursementMoneyType(entityType: string) {
  if (entityType === 'BUILDING') return MoneyType.SERVICE_FEE;
  if (entityType === 'NEIGHBORHOOD' || entityType === 'COMMUNITY') {
    return MoneyType.PROJECT_CONTRIBUTION;
  }
  return MoneyType.CASE_DONATION;
}

async function recomputeBalancesAndSnapshots(
  prisma: PrismaClient,
  referenceDate: Date,
  months: Date[],
) {
  const [accounts, entries] = await Promise.all([
    prisma.ledgerAccount.findMany({
      select: {
        id: true,
        type: true,
        entityId: true,
        walletId: true,
        governancePathId: true,
        governancePath: { select: { walletId: true } },
        wallet: { select: { entityId: true } },
      },
    }),
    prisma.ledgerEntry.findMany({
      select: {
        accountId: true,
        type: true,
        amount: true,
        transaction: { select: { createdAt: true } },
      },
    }),
  ]);

  const pathAccountsByWallet = new Map<string, string[]>();
  const walletAccountsByEntity = new Map<string, string[]>();

  for (const account of accounts) {
    const walletId = account.governancePath?.walletId;
    if (walletId) {
      const accountIds = pathAccountsByWallet.get(walletId) ?? [];
      accountIds.push(account.id);
      pathAccountsByWallet.set(walletId, accountIds);
    }
    const entityId = account.wallet?.entityId;
    if (entityId) {
      const accountIds = walletAccountsByEntity.get(entityId) ?? [];
      accountIds.push(account.id);
      walletAccountsByEntity.set(entityId, accountIds);
    }
  }

  const directBalancesAt = (cutoff: Date) => {
    const balances = new Map<string, number>();
    for (const entry of entries) {
      if (entry.transaction.createdAt > cutoff) continue;
      const current = balances.get(entry.accountId) ?? 0;
      const amount = Number(entry.amount);
      balances.set(
        entry.accountId,
        current + (entry.type === LedgerEntryType.CREDIT ? amount : -amount),
      );
    }
    return balances;
  };

  const allBalancesAt = (cutoff: Date) => {
    const balances = directBalancesAt(cutoff);

    for (const account of accounts.filter(
      (item) => item.type === LedgerAccountType.WALLET && item.walletId,
    )) {
      const balance = (
        pathAccountsByWallet.get(account.walletId!) ?? []
      ).reduce((sum, accountId) => sum + (balances.get(accountId) ?? 0), 0);
      balances.set(account.id, balance);
    }

    for (const account of accounts.filter(
      (item) => item.type === LedgerAccountType.ENTITY && item.entityId,
    )) {
      const balance = (
        walletAccountsByEntity.get(account.entityId!) ?? []
      ).reduce((sum, accountId) => sum + (balances.get(accountId) ?? 0), 0);
      balances.set(account.id, balance);
    }

    return balances;
  };

  const currentBalances = allBalancesAt(referenceDate);
  await createInBatches(
    accounts,
    async (batch) => {
      await Promise.all(
        batch.map((account) =>
          prisma.ledgerAccount.update({
            where: { id: account.id },
            data: {
              balance: (currentBalances.get(account.id) ?? 0).toFixed(2),
            },
          }),
        ),
      );
    },
    30,
  );

  await prisma.balanceSnapshot.deleteMany();

  const snapshots: Prisma.BalanceSnapshotCreateManyInput[] = [];
  for (const month of months) {
    const cutoff = endOfOperationalMonth(month, referenceDate);
    const balances = allBalancesAt(cutoff);
    const period = formatPeriod(month);

    for (const account of accounts) {
      snapshots.push({
        id: seedId('balance-snapshot', `${account.id}:${period}`),
        accountId: account.id,
        balance: (balances.get(account.id) ?? 0).toFixed(2),
        period,
        takenAt: cutoff,
      });
    }
  }

  await createInBatches(snapshots, (batch) =>
    prisma.balanceSnapshot.createMany({ data: batch }),
  );

  return snapshots.length;
}

export async function seedOperationalHistory({
  prisma,
  referenceDate,
  months: monthCount = 12,
}: SeedOperationalHistoryOptions) {
  const months = operationalMonths(referenceDate, monthCount);
  const currentPeriod = formatPeriod(referenceDate);

  const [
    subscriptions,
    activeMemberships,
    existingDues,
    existingConfirmedRecords,
    reviewers,
    entities,
    beneficiaries,
  ] = await Promise.all([
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
            personId: true,
            entityId: true,
            person: { select: { username: true, name: true } },
            entity: { select: { name: true, type: true } },
          },
        },
        governancePath: {
          select: {
            id: true,
            name: true,
            type: true,
            walletId: true,
            ledgerAccount: { select: { id: true } },
          },
        },
      },
    }),
    prisma.membership.findMany({
      where: { isActive: true },
      select: {
        id: true,
        personId: true,
        entityId: true,
        joinedAt: true,
        role: true,
        person: {
          select: {
            id: true,
            username: true,
            name: true,
            createdAt: true,
          },
        },
        entity: { select: { id: true, name: true, type: true } },
      },
    }),
    prisma.paymentDue.findMany({
      select: { subscriptionId: true, periodLabel: true },
    }),
    prisma.paymentRecord.findMany({
      where: { status: PaymentRecordStatus.CONFIRMED },
      select: {
        subscription: {
          select: {
            membership: { select: { personId: true } },
          },
        },
      },
    }),
    prisma.membership.findMany({
      where: {
        isActive: true,
        role: { in: ['FOUNDER', 'ADMIN', 'TREASURER'] },
      },
      orderBy: { joinedAt: 'asc' },
      select: { entityId: true, personId: true },
    }),
    prisma.entity.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        foundedAt: true,
        memberships: {
          where: { isActive: true },
          orderBy: { joinedAt: 'asc' },
          select: { personId: true, joinedAt: true },
        },
        wallets: {
          where: { isActive: true },
          select: {
            id: true,
            policy: { select: { extraRules: true } },
            governancePaths: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                createdAt: true,
                ledgerAccount: { select: { id: true } },
                spendingItems: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    name: true,
                    ledgerAccount: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.beneficiary.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, entityId: true, displayName: true },
    }),
  ]);

  const reviewerByEntity = new Map<string, string>();
  for (const reviewer of reviewers) {
    if (!reviewerByEntity.has(reviewer.entityId)) {
      reviewerByEntity.set(reviewer.entityId, reviewer.personId);
    }
  }

  const existingDueKeys = new Set(
    existingDues.map((due) => `${due.subscriptionId}:${due.periodLabel}`),
  );
  const paidPersonIds = new Set(
    existingConfirmedRecords.map(
      (record) => record.subscription.membership.personId,
    ),
  );
  const generatedDues: OperationalDue[] = [];

  for (const subscription of subscriptions) {
    if (
      !subscription.activeAt ||
      !subscription.agreedAmount ||
      Number(subscription.agreedAmount) <= 0 ||
      subscription.state === SubscriptionState.INTERESTED ||
      subscription.state === SubscriptionState.CONDITIONAL ||
      !subscription.governancePath.ledgerAccount
    ) {
      continue;
    }

    for (const month of months) {
      const score = scoreFor(subscription.id, formatPeriod(month));
      const dueDate = new Date(
        month.getFullYear(),
        month.getMonth(),
        5 + (score % 11),
        12,
      );

      if (
        dueDate < subscription.activeAt ||
        (subscription.exitedAt && dueDate > subscription.exitedAt) ||
        dueDate > referenceDate
      ) {
        continue;
      }

      const label = formatPeriod(month);
      if (existingDueKeys.has(`${subscription.id}:${label}`)) {
        continue;
      }

      generatedDues.push({
        id: seedId('payment-due', `history:${subscription.id}:${label}`),
        subscriptionId: subscription.id,
        personId: subscription.membership.personId,
        username: subscription.membership.person.username,
        membershipId: subscription.membership.id,
        entityId: subscription.membership.entityId,
        entityName: subscription.membership.entity.name,
        walletId: subscription.governancePath.walletId,
        pathId: subscription.governancePath.id,
        pathName: subscription.governancePath.name,
        pathType: subscription.governancePath.type,
        pathAccountId: subscription.governancePath.ledgerAccount.id,
        reviewerId:
          reviewerByEntity.get(subscription.membership.entityId) ?? null,
        periodLabel: label,
        dueDate,
        amountDue: Number(subscription.agreedAmount).toFixed(2),
        status: paymentStatusFor(
          score,
          label === currentPeriod,
          subscription.state,
          dueDate,
          referenceDate,
        ),
      });
    }
  }

  const duesByPerson = new Map<string, OperationalDue[]>();
  for (const due of generatedDues) {
    const personDues = duesByPerson.get(due.personId) ?? [];
    personDues.push(due);
    duesByPerson.set(due.personId, personDues);
  }
  for (const [personId, personDues] of duesByPerson) {
    if (
      !paidPersonIds.has(personId) &&
      !personDues.some((due) => due.status === PaymentDueStatus.PAID)
    ) {
      personDues.sort(
        (left, right) => +left.dueDate - +right.dueDate,
      )[0].status = PaymentDueStatus.PAID;
    }
  }

  const paymentTransactions: Prisma.LedgerTransactionCreateManyInput[] = [];
  const paymentEntries: Prisma.LedgerEntryCreateManyInput[] = [];
  const paymentRecords: Prisma.PaymentRecordCreateManyInput[] = [];
  const dueRows: Prisma.PaymentDueCreateManyInput[] = [];
  const latestDueByPerson = new Map<string, OperationalDue>();
  const latestPaidDueByPerson = new Map<string, OperationalDue>();
  const collectionAccountId = seedId(
    'external-account',
    'operational-history-collections',
  );

  await prisma.ledgerAccount.upsert({
    where: { id: collectionAccountId },
    update: { type: LedgerAccountType.EXTERNAL, currency: 'SAR' },
    create: {
      id: collectionAccountId,
      type: LedgerAccountType.EXTERNAL,
      currency: 'SAR',
      balance: '0.00',
    },
  });

  for (const due of generatedDues) {
    const transactionId =
      due.status === PaymentDueStatus.PAID
        ? seedId('transaction', `history-payment:${due.id}`)
        : null;
    const settlementDelay = scoreFor(due.id, 'settled') % 13;
    const settledAt =
      due.status === PaymentDueStatus.PAID
        ? clampDate(addDays(due.dueDate, settlementDelay), referenceDate)
        : due.status === PaymentDueStatus.WAIVED
          ? clampDate(addDays(due.dueDate, 4), referenceDate)
          : null;

    dueRows.push({
      id: due.id,
      subscriptionId: due.subscriptionId,
      periodLabel: due.periodLabel,
      dueDate: due.dueDate,
      amountDue: due.amountDue,
      status: due.status,
      settledAt,
      transactionId,
      createdAt: due.dueDate,
    });

    const latestDue = latestDueByPerson.get(due.personId);
    if (!latestDue || latestDue.dueDate < due.dueDate) {
      latestDueByPerson.set(due.personId, due);
    }

    const recordStatus = paymentRecordStatusFor(due);
    if (!recordStatus) continue;

    const submittedAt = clampDate(
      addDays(due.dueDate, scoreFor(due.id, 'submitted') % 8),
      referenceDate,
    );
    const reviewedAt =
      recordStatus === PaymentRecordStatus.SUBMITTED ||
      recordStatus === PaymentRecordStatus.CANCELLED
        ? null
        : clampDate(addDays(submittedAt, 1), referenceDate);

    paymentRecords.push({
      id: seedId('payment-record', `history:${due.id}`),
      subscriptionId: due.subscriptionId,
      paymentDueId: due.id,
      submittedById: due.personId,
      amount: due.amountDue,
      reference: `HIST-${due.periodLabel.replace('-', '')}-${due.id.slice(0, 8)}`,
      description: `سداد ${due.pathName} عن فترة ${due.periodLabel}`,
      attachments: [],
      status: recordStatus,
      reviewedById:
        recordStatus === PaymentRecordStatus.SUBMITTED ||
        recordStatus === PaymentRecordStatus.CANCELLED
          ? null
          : due.reviewerId,
      reviewerNotes:
        recordStatus === PaymentRecordStatus.CONFIRMED
          ? 'مطابقة تلقائية مع كشف التحصيل الشهري'
          : recordStatus === PaymentRecordStatus.REJECTED
            ? 'مرجع التحويل غير مكتمل، طُلب إثبات بديل'
            : recordStatus === PaymentRecordStatus.CANCELLED
              ? 'ألغاه العضو قبل المراجعة'
              : null,
      transactionId,
      submittedAt,
      reviewedAt,
      confirmedAt:
        recordStatus === PaymentRecordStatus.CONFIRMED ? settledAt : null,
      createdAt: submittedAt,
    });

    if (!transactionId || !settledAt) continue;

    const paymentClassification = paymentMoneyType(due.pathType);
    paymentTransactions.push({
      id: transactionId,
      type: paymentClassification.type,
      moneyType: paymentClassification.moneyType,
      originKind: MoneyOriginKind.SUBSCRIPTION_PAYMENT,
      amount: due.amountDue,
      currency: 'SAR',
      description: `تحصيل ${due.pathName} - ${due.username} - ${due.periodLabel}`,
      reference: `HIST-${due.periodLabel.replace('-', '')}-${due.id.slice(0, 8)}`,
      decisionId: null,
      approvedById: due.reviewerId,
      reversedTransactionId: null,
      isReversed: false,
      sourceMembershipId: due.membershipId,
      sourceEntityId: due.entityId,
      originEntityId: due.entityId,
      originWalletId: due.walletId,
      originGovernancePathId: due.pathId,
      originMembershipId: due.membershipId,
      originPersonId: due.personId,
      originNote: `payment_due:${due.id}`,
      attachments: [],
      createdAt: settledAt,
    });
    paymentEntries.push(
      {
        id: seedId('entry', `history-payment:${due.id}:external`),
        transactionId,
        accountId: collectionAccountId,
        type: LedgerEntryType.DEBIT,
        amount: due.amountDue,
        createdAt: settledAt,
      },
      {
        id: seedId('entry', `history-payment:${due.id}:path`),
        transactionId,
        accountId: due.pathAccountId,
        type: LedgerEntryType.CREDIT,
        amount: due.amountDue,
        createdAt: settledAt,
      },
    );
    const latestPaid = latestPaidDueByPerson.get(due.personId);
    if (!latestPaid || latestPaid.dueDate < due.dueDate) {
      latestPaidDueByPerson.set(due.personId, due);
    }
  }

  const historicalDecisions: Prisma.DecisionCreateManyInput[] = [];
  const historicalVotes: Prisma.VoteCreateManyInput[] = [];
  const historicalRequests: Prisma.DisbursementRequestCreateManyInput[] = [];
  const disbursementTransactions: Prisma.LedgerTransactionCreateManyInput[] =
    [];
  const disbursementEntries: Prisma.LedgerEntryCreateManyInput[] = [];
  const disbursementDocuments: Prisma.DocumentCreateManyInput[] = [];
  const subscriptionsByPath = new Map<
    string,
    Array<{
      personId: string;
      activeAt: Date | null;
      exitedAt: Date | null;
    }>
  >();

  for (const subscription of subscriptions) {
    const list = subscriptionsByPath.get(subscription.governancePath.id) ?? [];
    list.push({
      personId: subscription.membership.personId,
      activeAt: subscription.activeAt,
      exitedAt: subscription.exitedAt,
    });
    subscriptionsByPath.set(subscription.governancePath.id, list);
  }

  for (const entity of entities) {
    const paths = entity.wallets
      .filter((wallet) => {
        const extraRules = wallet.policy?.extraRules;
        return !(
          extraRules &&
          typeof extraRules === 'object' &&
          !Array.isArray(extraRules) &&
          extraRules.legacyReserve === true
        );
      })
      .flatMap((wallet) =>
        wallet.governancePaths.map((path) => ({
          ...path,
          walletId: wallet.id,
        })),
      );
    if (paths.length === 0) continue;

    for (const [cycleIndex, monthsAgo] of [10, 7, 4, 1].entries()) {
      const eventDate = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() - monthsAgo,
        12 + cycleIndex,
        10,
      );
      const path = paths[cycleIndex % paths.length];
      const spendingItem =
        path.spendingItems[cycleIndex % path.spendingItems.length];
      if (
        !spendingItem ||
        !path.ledgerAccount ||
        !spendingItem.ledgerAccount ||
        eventDate <= entity.foundedAt ||
        eventDate <= path.createdAt ||
        eventDate > referenceDate
      ) {
        continue;
      }

      const subscribedVoters = (subscriptionsByPath.get(path.id) ?? []).filter(
        (subscription) =>
          subscription.activeAt &&
          subscription.activeAt <= eventDate &&
          (!subscription.exitedAt || subscription.exitedAt > eventDate),
      );
      const fallbackVoters = entity.memberships.filter(
        (membership) => membership.joinedAt <= eventDate,
      );
      const voterIds = Array.from(
        new Set(
          (subscribedVoters.length >= 3
            ? subscribedVoters.map((item) => item.personId)
            : fallbackVoters.map((item) => item.personId)
          ).slice(0, 7),
        ),
      );
      if (voterIds.length < 2) continue;

      const key = `history:${entity.id}:${formatPeriod(eventDate)}:${cycleIndex}`;
      const id = seedId('decision', key);
      const requestId = seedId('disbursement-request', key);
      const transactionId = seedId('transaction', `disbursement:${key}`);
      const approved = scoreFor(key, 'result') % 5 !== 0;
      const amount = (750 + (scoreFor(key, 'amount') % 18) * 125).toFixed(2);
      const closedAt = addDays(eventDate, 3);
      const creatorId = reviewerByEntity.get(entity.id) ?? voterIds[0];
      const beneficiary = beneficiaries.find(
        (item) => item.entityId === entity.id,
      );

      historicalDecisions.push({
        id,
        subjectType: SubjectType.SPENDING_ITEM,
        subjectId: spendingItem.id,
        decisionType: DecisionType.DISBURSE_FUNDS,
        governancePathId: path.id,
        spendingItemId: spendingItem.id,
        createdById: creatorId,
        relatedDecisionId: null,
        title: `اعتماد ${spendingItem.name} - ${formatPeriod(eventDate)}`,
        description: `قرار تشغيلي دوري ضمن ${path.name} موثق ضمن سجل السنة التشغيلية.`,
        amount,
        voteType: VoteType.ONE_MEMBER_ONE_VOTE,
        votersScope:
          subscribedVoters.length >= 3
            ? VotersScope.PATH_SUBSCRIBERS
            : VotersScope.ALL_MEMBERS,
        quorumPercent: 40,
        approvalPercent: 51,
        result: approved ? DecisionResult.APPROVED : DecisionResult.REJECTED,
        status: DecisionStatus.CLOSED,
        executionStatus: approved
          ? DecisionExecutionStatus.COMPLETED
          : DecisionExecutionStatus.NOT_STARTED,
        executionUpdatedAt: approved ? addDays(closedAt, 2) : closedAt,
        opensAt: eventDate,
        closesAt: closedAt,
        closedAt,
        attachments: [],
        notes: approved
          ? 'نُفذ ضمن دورة المصروفات الشهرية.'
          : 'رُفض لعدم كفاية الأولوية أو اكتمال المرفقات.',
        createdAt: addDays(eventDate, -1),
      });

      for (const [voteIndex, voterId] of voterIds.entries()) {
        const choice = approved
          ? voteIndex < Math.ceil(voterIds.length * 0.7)
            ? VoteChoice.APPROVE
            : voteIndex === voterIds.length - 1
              ? VoteChoice.ABSTAIN
              : VoteChoice.REJECT
          : voteIndex < Math.ceil(voterIds.length * 0.6)
            ? VoteChoice.REJECT
            : VoteChoice.APPROVE;
        historicalVotes.push({
          id: seedId('vote', `${key}:${voterId}`),
          decisionId: id,
          personId: voterId,
          householdId: null,
          choice,
          isSecret: false,
          weight: '1.00',
          notes: null,
          votedAt: addDays(eventDate, 1 + (voteIndex % 2)),
        });
      }

      historicalRequests.push({
        id: requestId,
        governancePathId: path.id,
        spendingItemId: spendingItem.id,
        requestedById: creatorId,
        beneficiaryId: beneficiary?.id ?? null,
        beneficiaryName:
          beneficiary?.displayName ?? `مستفيد تشغيلي - ${entity.name}`,
        beneficiaryNotes: 'طلب دوري مولد ضمن السنة التشغيلية.',
        amount,
        description: `طلب ${spendingItem.name} لدورة ${formatPeriod(eventDate)}`,
        attachments: [],
        status: approved
          ? DisbursementRequestStatus.EXECUTED
          : DisbursementRequestStatus.REJECTED,
        reviewedById: creatorId,
        reviewerNotes: approved
          ? 'اعتمد بعد اكتمال التصويت والمراجعة.'
          : 'لم يحقق أولوية الصرف المطلوبة.',
        decisionId: id,
        transactionId: approved ? transactionId : null,
        requestedAt: addDays(eventDate, -2),
        reviewedAt: closedAt,
        executedAt: approved ? addDays(closedAt, 2) : null,
        createdAt: addDays(eventDate, -2),
      });

      const documentId = seedId('document', `history-request:${key}`);
      disbursementDocuments.push({
        id: documentId,
        uploadedById: creatorId,
        name: `محضر ${spendingItem.name} - ${formatPeriod(eventDate)}`,
        fileUrl: `https://seed.collectivetrust.local/history/${documentId}.pdf`,
        fileType: 'PDF',
        fileSize: 70000 + (scoreFor(key, 'document') % 90000),
        entityId: entity.id,
        walletId: path.walletId,
        governancePathId: path.id,
        decisionId: id,
        disbursementRequestId: requestId,
        appealId: null,
        disputeId: null,
        privacyLevel: TransparencyLevel.VISIBLE_TO_COMMITTEE,
        createdAt: addDays(eventDate, -1),
      });

      if (!approved) continue;

      const executedAt = addDays(closedAt, 2);
      disbursementTransactions.push({
        id: transactionId,
        type: LedgerTransactionType.DISBURSEMENT,
        moneyType: disbursementMoneyType(entity.type),
        originKind: MoneyOriginKind.PATH_DISBURSEMENT,
        amount,
        currency: 'SAR',
        description: `تنفيذ ${spendingItem.name} - ${entity.name}`,
        reference: `HIST-DISB-${formatPeriod(eventDate).replace('-', '')}-${id.slice(0, 6)}`,
        decisionId: id,
        approvedById: creatorId,
        reversedTransactionId: null,
        isReversed: false,
        sourceMembershipId: null,
        sourceEntityId: entity.id,
        originEntityId: entity.id,
        originWalletId: path.walletId,
        originGovernancePathId: path.id,
        originMembershipId: null,
        originPersonId: creatorId,
        originNote: `spending_item:${spendingItem.id}`,
        attachments: [documentId],
        createdAt: executedAt,
      });
      disbursementEntries.push(
        {
          id: seedId('entry', `history-disbursement:${key}:path`),
          transactionId,
          accountId: path.ledgerAccount.id,
          type: LedgerEntryType.DEBIT,
          amount,
          createdAt: executedAt,
        },
        {
          id: seedId('entry', `history-disbursement:${key}:item`),
          transactionId,
          accountId: spendingItem.ledgerAccount.id,
          type: LedgerEntryType.CREDIT,
          amount,
          createdAt: executedAt,
        },
      );
    }
  }

  const membershipDocuments: Prisma.DocumentCreateManyInput[] =
    activeMemberships.map((membership) => {
      const id = seedId(
        'document',
        `annual-member-statement:${membership.id}:${currentPeriod}`,
      );
      return {
        id,
        uploadedById: membership.personId,
        name: `كشف المشاركة السنوي - ${membership.entity.name}`,
        fileUrl: `https://seed.collectivetrust.local/statements/${id}.pdf`,
        fileType: 'PDF',
        fileSize: 45000 + (scoreFor(membership.id, 'statement') % 55000),
        entityId: membership.entityId,
        walletId: null,
        governancePathId: null,
        decisionId: null,
        disbursementRequestId: null,
        appealId: null,
        disputeId: null,
        privacyLevel: TransparencyLevel.HIDDEN_SENSITIVE,
        createdAt: addDays(referenceDate, -5),
      };
    });

  const notifications: Prisma.NotificationCreateManyInput[] = [];
  const auditLogs: Prisma.AuditLogCreateManyInput[] = [];
  const distinctPeople = new Map(
    activeMemberships.map((membership) => [
      membership.personId,
      membership.person,
    ]),
  );

  for (const membership of activeMemberships) {
    notifications.push({
      id: seedId('notification', `history-membership:${membership.id}`),
      personId: membership.personId,
      type: NotificationType.POLICY_CHANGED,
      title: `تفعيل عضويتك في ${membership.entity.name}`,
      body: 'تم حفظ شروط العضوية وسياسات المشاركة ويمكن الرجوع إليها من البوابة.',
      targetType: NotificationTargetType.ENTITY,
      targetId: membership.entityId,
      isRead: true,
      sentAt: addDays(membership.joinedAt, 1),
      readAt: addDays(membership.joinedAt, 2),
    });
    auditLogs.push({
      id: seedId('audit-log', `history-membership:${membership.id}`),
      action: AuditAction.CREATE,
      personId: membership.personId,
      entityId: membership.entityId,
      targetType: 'memberships',
      targetId: membership.id,
      oldValue: Prisma.JsonNull,
      newValue: {
        role: membership.role,
        isActive: true,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'seed-operational-history/1.0',
      createdAt: membership.joinedAt,
    });
  }

  for (const [personId, person] of distinctPeople) {
    const latestDue = latestDueByPerson.get(personId);
    if (latestDue) {
      notifications.push({
        id: seedId('notification', `history-latest-due:${personId}`),
        personId,
        type: NotificationType.PAYMENT_DUE,
        title: `استحقاق ${latestDue.pathName}`,
        body: `استحقاق فترة ${latestDue.periodLabel} بمبلغ ${latestDue.amountDue} ر.س وحالته ${latestDue.status}.`,
        targetType: NotificationTargetType.SUBSCRIPTION,
        targetId: latestDue.subscriptionId,
        isRead: latestDue.status === PaymentDueStatus.PAID,
        sentAt: addDays(latestDue.dueDate, -2),
        readAt:
          latestDue.status === PaymentDueStatus.PAID ? latestDue.dueDate : null,
      });
    }

    const latestPaidDue = latestPaidDueByPerson.get(personId);
    if (latestPaidDue) {
      notifications.push({
        id: seedId('notification', `history-latest-payment:${personId}`),
        personId,
        type: NotificationType.PAYMENT_CONFIRMED,
        title: 'تم اعتماد دفعتك',
        body: `تم اعتماد سداد ${latestPaidDue.pathName} عن ${latestPaidDue.periodLabel}.`,
        targetType: NotificationTargetType.SUBSCRIPTION,
        targetId: latestPaidDue.subscriptionId,
        isRead: true,
        sentAt: clampDate(addDays(latestPaidDue.dueDate, 3), referenceDate),
        readAt: clampDate(addDays(latestPaidDue.dueDate, 4), referenceDate),
      });
    }

    for (const [loginIndex, daysAgo] of [300, 180, 45].entries()) {
      const loginAt = new Date(referenceDate.getTime() - daysAgo * DAY);
      if (loginAt < person.createdAt) continue;
      auditLogs.push({
        id: seedId('audit-log', `history-login:${personId}:${loginIndex}`),
        action: AuditAction.LOGIN,
        personId,
        entityId: null,
        targetType: 'persons',
        targetId: personId,
        oldValue: Prisma.JsonNull,
        newValue: {
          channel: loginIndex === 2 ? 'OTP' : 'WEB',
        },
        ipAddress: `10.10.${loginIndex + 1}.${10 + (scoreFor(personId) % 200)}`,
        userAgent: 'CollectiveTrustOS Web',
        createdAt: loginAt,
      });
    }
  }

  await createInBatches(dueRows, (batch) =>
    prisma.paymentDue.createMany({ data: batch, skipDuplicates: true }),
  );
  await createInBatches(historicalDecisions, (batch) =>
    prisma.decision.createMany({ data: batch, skipDuplicates: true }),
  );
  await createInBatches(historicalVotes, (batch) =>
    prisma.vote.createMany({ data: batch, skipDuplicates: true }),
  );

  const allTransactions = [...paymentTransactions, ...disbursementTransactions];
  const allEntries = [...paymentEntries, ...disbursementEntries];
  await createInBatches(allTransactions, (batch) =>
    prisma.ledgerTransaction.createMany({
      data: batch,
      skipDuplicates: true,
    }),
  );
  await createInBatches(allEntries, (batch) =>
    prisma.ledgerEntry.createMany({ data: batch, skipDuplicates: true }),
  );
  await createInBatches(paymentRecords, (batch) =>
    prisma.paymentRecord.createMany({ data: batch, skipDuplicates: true }),
  );
  await createInBatches(historicalRequests, (batch) =>
    prisma.disbursementRequest.createMany({
      data: batch,
      skipDuplicates: true,
    }),
  );
  await createInBatches(
    [...membershipDocuments, ...disbursementDocuments],
    (batch) =>
      prisma.document.createMany({ data: batch, skipDuplicates: true }),
  );
  await createInBatches(notifications, (batch) =>
    prisma.notification.createMany({ data: batch, skipDuplicates: true }),
  );
  await createInBatches(auditLogs, (batch) =>
    prisma.auditLog.createMany({ data: batch, skipDuplicates: true }),
  );

  const snapshots = await recomputeBalancesAndSnapshots(
    prisma,
    referenceDate,
    months,
  );

  return {
    months: monthCount,
    dues: dueRows.length,
    paymentRecords: paymentRecords.length,
    paymentTransactions: paymentTransactions.length,
    decisions: historicalDecisions.length,
    votes: historicalVotes.length,
    disbursementRequests: historicalRequests.length,
    disbursementTransactions: disbursementTransactions.length,
    documents: membershipDocuments.length + disbursementDocuments.length,
    notifications: notifications.length,
    auditLogs: auditLogs.length,
    balanceSnapshots: snapshots,
  };
}
