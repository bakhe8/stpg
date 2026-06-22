import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DisbursementRequestStatus,
  DecisionStatus,
  LedgerEntryType,
  LedgerTransactionType,
  MemberRole,
  SubscriptionState,
  VotersScope,
} from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── صحة الصندوق ────────────────────────────────────────────────
  async getFundHealth(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    const now = new Date();
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const years2 = new Date(now.getTime() - 365 * 2 * 24 * 60 * 60 * 1000);
    const months12 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [
      entity,
      memberships,
      subscriptions,
      wallets,
      decisions,
      paymentDues,
    ] = await Promise.all([
      this.prisma.entity.findUnique({ where: { id: entityId } }),
      this.prisma.membership.findMany({
        where: { entityId },
        select: { id: true, personId: true, isActive: true, createdAt: true },
      }),
      this.prisma.subscription.findMany({
        where: { membership: { entityId } },
        select: {
          state: true,
          agreedAmount: true,
          governancePathId: true,
          membership: { select: { personId: true } },
        },
      }),
      this.prisma.wallet.findMany({
        where: { entityId, isActive: true },
        include: {
          ledgerAccount: { select: { balance: true } },
          governancePaths: {
            where: { isActive: true },
            select: { id: true, name: true, type: true },
          },
        },
      }),
      this.prisma.decision.findMany({
        where: {
          governancePath: { wallet: { entityId } },
          createdAt: { gte: days90 },
        },
        select: {
          id: true,
          status: true,
          result: true,
          createdAt: true,
          votersScope: true,
          voteType: true,
          _count: { select: { votes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentDue.findMany({
        where: {
          subscription: { membership: { entityId } },
          dueDate: { gte: days60 },
        },
        select: { status: true, dueDate: true },
      }),
    ]);

    if (!entity) throw new NotFoundException('الكيان غير موجود');

    const activeMembers = memberships.filter((m) => m.isActive);
    const activeMemberCount = activeMembers.length;
    const totalMembers = memberships.length;

    const activeSubs = subscriptions.filter(
      (s) => s.state === SubscriptionState.ACTIVE,
    );
    const suspendedSubs = subscriptions.filter(
      (s) => s.state === SubscriptionState.SUSPENDED,
    );
    const exitedSubs = subscriptions.filter(
      (s) => s.state === SubscriptionState.EXITED,
    );

    const totalBalance = wallets.reduce(
      (sum, w) => sum + Number(w.ledgerAccount?.balance ?? 0),
      0,
    );

    const monthlyExpectedRevenue = activeSubs.reduce(
      (sum, s) => sum + Number(s.agreedAmount ?? 0),
      0,
    );

    // 1) Payment fatigue: مقارنة التعثر آخر 30 يوماً بالـ 30 السابقة + عبء التزامات عابر للكيانات
    const currentDues = paymentDues.filter((d) => d.dueDate >= days30);
    const previousDues = paymentDues.filter(
      (d) => d.dueDate >= days60 && d.dueDate < days30,
    );
    const currentOverdue = currentDues.filter(
      (d) => d.status === 'OVERDUE' || d.status === 'PENDING',
    ).length;
    const previousOverdue = previousDues.filter(
      (d) => d.status === 'OVERDUE' || d.status === 'PENDING',
    ).length;
    const currentOverdueRate =
      currentDues.length > 0 ? currentOverdue / currentDues.length : 0;
    const previousOverdueRate =
      previousDues.length > 0 ? previousOverdue / previousDues.length : 0;

    const activePersonIds = activeMembers.map((m) => m.personId);
    const crossEntityActiveSubs =
      activePersonIds.length > 0
        ? await this.prisma.subscription.findMany({
            where: {
              state: SubscriptionState.ACTIVE,
              membership: { personId: { in: activePersonIds } },
            },
            select: {
              agreedAmount: true,
              membership: { select: { personId: true } },
            },
          })
        : [];
    const personCommitments = new Map<string, number>();
    for (const subscription of crossEntityActiveSubs) {
      const personId = subscription.membership.personId;
      personCommitments.set(
        personId,
        (personCommitments.get(personId) ?? 0) +
          Number(subscription.agreedAmount ?? 0),
      );
    }
    const commitments = [...personCommitments.values()].sort((a, b) => a - b);
    const medianCommitment =
      commitments.length === 0
        ? 0
        : commitments[Math.floor(commitments.length / 2)];
    const overloadedMembers = commitments.filter(
      (value) => value > medianCommitment * 1.5 && value > 0,
    ).length;
    const overloadRate =
      commitments.length > 0 ? overloadedMembers / commitments.length : 0;

    const paymentFatigueScore = Math.min(
      100,
      Math.round(
        Math.max(currentOverdueRate - previousOverdueRate, 0) * 100 +
          overloadRate * 100,
      ),
    );

    // 2) Voting fatigue: انخفاض المشاركة في التصويتات العامة
    const generalVotes = decisions.filter(
      (decision) =>
        decision.votersScope === VotersScope.ALL_MEMBERS &&
        (decision.status === DecisionStatus.CLOSED ||
          decision.status === DecisionStatus.EXPIRED),
    );
    const avgParticipationRate =
      generalVotes.length > 0 && activeMemberCount > 0
        ? generalVotes.reduce(
            (sum, decision) =>
              sum + decision._count.votes / Math.max(activeMemberCount, 1),
            0,
          ) / generalVotes.length
        : 1;
    const votingFatigueScore = Math.max(
      0,
      Math.round((0.3 - avgParticipationRate) * 100),
    );

    // 3) Weak paths: مسارات ضعيفة مقارنة بالأقوى
    const pathSubscriberCounts = new Map<string, number>();
    for (const subscription of activeSubs) {
      if (!subscription.governancePathId) continue;
      pathSubscriberCounts.set(
        subscription.governancePathId,
        (pathSubscriberCounts.get(subscription.governancePathId) ?? 0) + 1,
      );
    }
    const allPaths = wallets.flatMap((wallet) => wallet.governancePaths);
    const pathStats = allPaths.map((path) => ({
      id: path.id,
      name: path.name,
      type: path.type,
      subscribers: pathSubscriberCounts.get(path.id) ?? 0,
    }));
    const maxSubscribers = pathStats.reduce(
      (max, path) => Math.max(max, path.subscribers),
      0,
    );
    const weakPaths = pathStats.filter(
      (path) => path.subscribers <= 3 && maxSubscribers >= 10,
    );

    // 4) Zombie wallets: محافظ بلا حركة لأكثر من سنتين
    const zombieWallets: { id: string; name: string }[] = [];
    for (const wallet of wallets) {
      const txCount = await this.prisma.ledgerTransaction.count({
        where: {
          createdAt: { gte: years2 },
          entries: {
            some: {
              account: {
                OR: [
                  { walletId: wallet.id },
                  { governancePath: { walletId: wallet.id } },
                  {
                    spendingItem: {
                      governancePath: { walletId: wallet.id },
                    },
                  },
                ],
              },
            },
          },
        },
      });
      if (txCount === 0 && Number(wallet.ledgerAccount?.balance ?? 0) > 0) {
        zombieWallets.push({ id: wallet.id, name: wallet.name });
      }
    }

    // 5) Below safety threshold: محافظ الطوارئ أقل من تكلفة 3 حالات
    const emergencyWallets = wallets.filter((wallet) =>
      /طوارئ|emergency/i.test(wallet.name),
    );
    const belowSafetyWallets: {
      id: string;
      name: string;
      balance: number;
      threshold: number;
    }[] = [];
    for (const wallet of emergencyWallets) {
      const aggregate = await this.prisma.ledgerTransaction.aggregate({
        where: {
          type: 'DISBURSEMENT',
          isReversed: false,
          createdAt: { gte: months12 },
          entries: {
            some: {
              account: { governancePath: { walletId: wallet.id } },
            },
          },
        },
        _avg: { amount: true },
      });
      const avgEmergencyCase = Number(aggregate._avg.amount ?? 0);
      const threshold = avgEmergencyCase * 3;
      const balance = Number(wallet.ledgerAccount?.balance ?? 0);
      if (threshold > 0 && balance < threshold) {
        belowSafetyWallets.push({
          id: wallet.id,
          name: wallet.name,
          balance,
          threshold,
        });
      }
    }

    // 6) High dispute rate: كثرة الاعتراضات/النزاعات
    const [appealsCurrent30, appealsPrevious30, disputesCurrent30] =
      await Promise.all([
        this.prisma.appeal.count({
          where: {
            submittedAt: { gte: days30 },
            decision: { governancePath: { wallet: { entityId } } },
          },
        }),
        this.prisma.appeal.count({
          where: {
            submittedAt: { gte: days60, lt: days30 },
            decision: { governancePath: { wallet: { entityId } } },
          },
        }),
        this.prisma.dispute.count({
          where: { entityId, openedAt: { gte: days30 } },
        }),
      ]);
    const committeeDecisionsCurrent30 = decisions.filter(
      (decision) =>
        decision.createdAt >= days30 &&
        decision.votersScope === VotersScope.COMMITTEE,
    ).length;
    const disputeRate =
      committeeDecisionsCurrent30 > 0
        ? (appealsCurrent30 + disputesCurrent30) / committeeDecisionsCurrent30
        : 0;
    const disputeRateSpike = Math.max(appealsCurrent30 - appealsPrevious30, 0);

    // 7) Out-of-band decisions: إدخالات رجعية/تسويات متكررة
    const outOfBandTransactions = await this.prisma.ledgerTransaction.count({
      where: {
        createdAt: { gte: days90 },
        OR: [
          { type: 'REVERSAL' },
          { originKind: 'UNSPECIFIED' },
          { description: { contains: 'تسوية', mode: 'insensitive' } },
          { description: { contains: 'واتساب', mode: 'insensitive' } },
          { description: { contains: 'retroactive', mode: 'insensitive' } },
          { originNote: { contains: 'manual', mode: 'insensitive' } },
          { originNote: { contains: 'خارج النظام', mode: 'insensitive' } },
        ],
        entries: {
          some: {
            account: {
              OR: [
                { entityId },
                { wallet: { entityId } },
                { governancePath: { wallet: { entityId } } },
              ],
            },
          },
        },
      },
    });

    const totalTransactions90 = await this.prisma.ledgerTransaction.count({
      where: {
        createdAt: { gte: days90 },
        entries: {
          some: {
            account: {
              OR: [
                { entityId },
                { wallet: { entityId } },
                { governancePath: { wallet: { entityId } } },
              ],
            },
          },
        },
      },
    });

    const outOfBandRatio =
      totalTransactions90 > 0 ? outOfBandTransactions / totalTransactions90 : 0;

    // Backward-compatible summary rates used by frontend
    const paymentComplianceRate = Math.max(
      0,
      Math.min(100, Math.round((1 - currentOverdueRate) * 100)),
    );
    const subscriptionHealthRate =
      activeSubs.length + suspendedSubs.length + exitedSubs.length > 0
        ? Math.round(
            (activeSubs.length /
              (activeSubs.length + suspendedSubs.length + exitedSubs.length)) *
              100,
          )
        : 0;

    const healthScore = this.computeHealthScore({
      paymentComplianceRate,
      subscriptionHealthRate,
      activeMemberRate:
        totalMembers > 0 ? (activeMemberCount / totalMembers) * 100 : 0,
    });

    const alerts: string[] = [];
    if (paymentFatigueScore >= 20) {
      alerts.push(
        `تحذير: إرهاق الدفع يرتفع (${paymentFatigueScore}%) مقارنة بالفترة السابقة`,
      );
    }
    if (avgParticipationRate < 0.3) {
      alerts.push(
        `تحذير: مشاركة التصويت العامة منخفضة (${Math.round(avgParticipationRate * 100)}%)`,
      );
    }
    if (weakPaths.length > 0) {
      alerts.push(
        `تنبيه: يوجد ${weakPaths.length} مسار حوكمة ضعيف يحتاج دمج/إعادة تصميم`,
      );
    }
    if (zombieWallets.length > 0) {
      alerts.push(
        `تنبيه: يوجد ${zombieWallets.length} محفظة شبه ميتة بلا حركة تشغيلية`,
      );
    }
    if (belowSafetyWallets.length > 0) {
      alerts.push(
        `تحذير: ${belowSafetyWallets.length} محفظة طوارئ أقل من حد الأمان (3 حالات)`,
      );
    }
    if (disputeRate > 0.3 || disputeRateSpike >= 3) {
      alerts.push(
        'تحذير: ارتفاع معدل الاعتراضات/النزاعات يتطلب مراجعة الشفافية',
      );
    }
    if (outOfBandRatio > 0.2) {
      alerts.push(
        `تحذير: نسبة القرارات خارج النظام مرتفعة (${Math.round(outOfBandRatio * 100)}%)`,
      );
    }

    return {
      entityId,
      healthScore,
      healthLevel: this.getHealthLevel(healthScore),
      indicators: {
        paymentFatigueScore,
        votingFatigueScore,
        votingParticipationRate: Number(avgParticipationRate.toFixed(2)),
        weakPathsCount: weakPaths.length,
        zombieWalletsCount: zombieWallets.length,
        belowSafetyThresholdCount: belowSafetyWallets.length,
        disputeRate: Number(disputeRate.toFixed(2)),
        outOfBandRatio: Number(outOfBandRatio.toFixed(2)),
      },
      advancedIndicators: {
        paymentFatigue: {
          currentOverdueRate: Number(currentOverdueRate.toFixed(2)),
          previousOverdueRate: Number(previousOverdueRate.toFixed(2)),
          overloadedMembers,
          overloadRate: Number(overloadRate.toFixed(2)),
          score: paymentFatigueScore,
        },
        votingFatigue: {
          generalDecisionsCount: generalVotes.length,
          avgParticipationRate: Number(avgParticipationRate.toFixed(2)),
          isBelowThreshold: avgParticipationRate < 0.3,
        },
        weakPaths: {
          maxSubscribers,
          paths: weakPaths,
        },
        zombieWallets,
        belowSafetyThreshold: belowSafetyWallets,
        disputes: {
          appealsCurrent30,
          appealsPrevious30,
          disputesCurrent30,
          committeeDecisionsCurrent30,
          disputeRate: Number(disputeRate.toFixed(2)),
        },
        outOfBandDecisions: {
          outOfBandTransactions,
          totalTransactions90,
          ratio: Number(outOfBandRatio.toFixed(2)),
        },
      },
      summary: {
        totalMembers,
        activeMembers: activeMemberCount,
        totalBalance,
        activeSubs: activeSubs.length,
        suspendedSubs: suspendedSubs.length,
        exitedSubs: exitedSubs.length,
        paymentComplianceRate,
        subscriptionHealthRate,
        monthlyExpectedRevenue,
      },
      wallets: wallets.map((w) => ({
        id: w.id,
        name: w.name,
        balance: w.ledgerAccount?.balance ?? 0,
        pathCount: w.governancePaths.length,
      })),
      recentDecisions: {
        total: decisions.length,
        open: decisions.filter((d) => d.status === 'OPEN').length,
        approved: decisions.filter((d) => d.result === 'APPROVED').length,
        rejected: decisions.filter((d) => d.result === 'REJECTED').length,
      },
      alerts,
    };
  }

  // ── تقرير الاشتراكات للعضو عبر جميع كيانات ─────────────────────
  async getMemberCrossEntityReport(personId: string, requesterId: string) {
    if (personId !== requesterId) {
      throw new ForbiddenException('يمكنك فقط رؤية تقريرك الخاص');
    }

    const memberships = await this.prisma.membership.findMany({
      where: { personId, isActive: true },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        subscriptions: {
          include: {
            governancePath: {
              select: {
                id: true,
                name: true,
                type: true,
                wallet: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const totalMonthlyCommitment = memberships
      .flatMap((m) => m.subscriptions)
      .filter((s) => s.state === SubscriptionState.ACTIVE)
      .reduce((sum, s) => sum + Number(s.agreedAmount ?? 0), 0);

    // تحذير إذا كان في كيانات ذات تداخل
    const entityIds = memberships.map((m) => m.entity.id);
    const overlaps = await this.prisma.entityRelationship.findMany({
      where: {
        type: 'MEMBERSHIP_OVERLAP',
        isActive: true,
        AND: [
          { sourceEntityId: { in: entityIds } },
          { targetEntityId: { in: entityIds } },
        ],
      },
      include: {
        sourceEntity: { select: { name: true } },
        targetEntity: { select: { name: true } },
      },
    });

    return {
      personId,
      totalEntities: memberships.length,
      totalMonthlyCommitment,
      memberships: memberships.map((m) => ({
        entityId: m.entity.id,
        entityName: m.entity.name,
        entityType: m.entity.type,
        role: m.role,
        activeSubscriptions: m.subscriptions.filter(
          (s) => s.state === SubscriptionState.ACTIVE,
        ).length,
        monthlyAmount: m.subscriptions
          .filter((s) => s.state === SubscriptionState.ACTIVE)
          .reduce((sum, s) => sum + Number(s.agreedAmount ?? 0), 0),
      })),
      potentialOverlaps: overlaps.map((o) => ({
        entityA: o.sourceEntity.name,
        entityB: o.targetEntity.name,
        note: 'أنت عضو في كيانين بينهما تداخل عضوي — راجع التزاماتك المالية',
      })),
    };
  }

  // ── تقرير مالي شهري ───────────────────────────────────────────
  async getMonthlyFinancialReport(
    entityId: string,
    requesterId: string,
    period?: string,
  ) {
    await this.requireAdminOrAuditor(entityId, requesterId);

    const targetPeriod = period ?? new Date().toISOString().slice(0, 7);
    const [year, month] = targetPeriod.split('-').map(Number);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [payments, disbursements, transfers, accounts] = await Promise.all([
      this.prisma.ledgerTransaction.findMany({
        where: {
          type: 'SUBSCRIPTION_PAYMENT',
          createdAt: { gte: startDate, lte: endDate },
          entries: {
            some: {
              account: {
                OR: [
                  { entityId },
                  { wallet: { entityId } },
                  { governancePath: { wallet: { entityId } } },
                ],
              },
            },
          },
        },
        select: {
          amount: true,
          description: true,
          reference: true,
          createdAt: true,
        },
      }),
      this.prisma.ledgerTransaction.findMany({
        where: {
          type: 'DISBURSEMENT',
          createdAt: { gte: startDate, lte: endDate },
          entries: {
            some: {
              account: {
                OR: [
                  { entityId },
                  { wallet: { entityId } },
                  { governancePath: { wallet: { entityId } } },
                ],
              },
            },
          },
        },
        select: {
          amount: true,
          description: true,
          reference: true,
          createdAt: true,
        },
      }),
      this.prisma.ledgerTransaction.findMany({
        where: {
          type: 'TRANSFER',
          createdAt: { gte: startDate, lte: endDate },
          entries: {
            some: {
              account: {
                OR: [
                  { wallet: { entityId } },
                  { governancePath: { wallet: { entityId } } },
                ],
              },
            },
          },
        },
        select: { amount: true, description: true, createdAt: true },
      }),
      this.prisma.ledgerAccount.findMany({
        where: {
          OR: [
            { entityId },
            { wallet: { entityId } },
            { governancePath: { wallet: { entityId } } },
          ],
        },
        select: { id: true, type: true },
      }),
    ]);

    const accountIds = accounts.map((a) => a.id);
    const snapshots = await this.prisma.balanceSnapshot.findMany({
      where: { period: targetPeriod, accountId: { in: accountIds } },
    });

    const totalIn = payments.reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = disbursements.reduce((s, t) => s + Number(t.amount), 0);

    return {
      entityId,
      period: targetPeriod,
      summary: {
        totalIn,
        totalOut,
        netFlow: totalIn - totalOut,
        transferCount: transfers.length,
      },
      payments: {
        count: payments.length,
        total: totalIn,
        items: payments,
      },
      disbursements: {
        count: disbursements.length,
        total: totalOut,
        items: disbursements,
      },
      transfers: {
        count: transfers.length,
        items: transfers,
      },
      balanceSnapshots: snapshots,
    };
  }

  async getAuditorOverview(entityId: string, requesterId: string) {
    await this.requireAdminOrAuditor(entityId, requesterId);

    const now = new Date();
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      transactions,
      executedRequests,
      emergencyDecisions,
      appealsOverdue,
      disputesOpen,
      conflictsByReviewer,
      conflictsByBeneficiary,
      auditTrail,
    ] = await Promise.all([
      this.prisma.ledgerTransaction.findMany({
        where: {
          createdAt: { gte: days90 },
          entries: {
            some: {
              account: {
                OR: [
                  { entityId },
                  { wallet: { entityId } },
                  { governancePath: { wallet: { entityId } } },
                ],
              },
            },
          },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          reference: true,
          createdAt: true,
          approvedById: true,
          originKind: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.disbursementRequest.findMany({
        where: {
          governancePath: { wallet: { entityId } },
          status: DisbursementRequestStatus.EXECUTED,
        },
        select: {
          id: true,
          amount: true,
          attachments: true,
          requestedById: true,
          reviewedById: true,
          reviewerNotes: true,
          beneficiaryName: true,
          decisionId: true,
          governancePath: { select: { id: true, name: true } },
          spendingItem: {
            select: {
              id: true,
              name: true,
              requiredDocuments: true,
            },
          },
          executedAt: true,
        },
        orderBy: { executedAt: 'desc' },
        take: 200,
      }),
      this.prisma.decision.findMany({
        where: {
          governancePath: { wallet: { entityId } },
          voteType: 'EMERGENCY_THEN_REVIEW',
          createdAt: { gte: days90 },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          status: true,
          result: true,
          executionStatus: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appeal.findMany({
        where: {
          status: { in: ['OPEN', 'UNDER_REVIEW'] },
          responseDeadline: { lt: now },
          decision: { governancePath: { wallet: { entityId } } },
        },
        select: {
          id: true,
          type: true,
          status: true,
          submittedAt: true,
          responseDeadline: true,
          decisionId: true,
        },
        orderBy: { responseDeadline: 'asc' },
      }),
      this.prisma.dispute.findMany({
        where: {
          entityId,
          status: { in: ['OPEN', 'UNDER_MEDIATION', 'ESCALATED'] },
        },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          openedAt: true,
          deadline: true,
        },
        orderBy: { openedAt: 'desc' },
      }),
      this.prisma.disbursementRequest.findMany({
        where: {
          governancePath: { wallet: { entityId } },
          status: DisbursementRequestStatus.EXECUTED,
          reviewedById: { not: null },
        },
        select: {
          id: true,
          requestedById: true,
          reviewedById: true,
          amount: true,
          beneficiaryName: true,
        },
      }),
      this.prisma.disbursementRequest.findMany({
        where: {
          governancePath: { wallet: { entityId } },
          status: DisbursementRequestStatus.EXECUTED,
          beneficiary: { membershipId: { not: null } },
          decisionId: { not: null },
        },
        select: {
          id: true,
          amount: true,
          beneficiaryName: true,
          decisionId: true,
          beneficiary: {
            select: {
              membership: { select: { personId: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { entityId },
        select: {
          id: true,
          action: true,
          personId: true,
          targetType: true,
          targetId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const largeThreshold = 10000;
    const flaggedTransactions = transactions
      .filter(
        (transaction) =>
          Number(transaction.amount) >= largeThreshold ||
          transaction.originKind === 'UNSPECIFIED' ||
          transaction.type === 'REVERSAL',
      )
      .map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      }));

    const missingDocuments = executedRequests
      .filter((request) => {
        const requiredDocs = request.spendingItem.requiredDocuments.length;
        if (requiredDocs === 0) return request.attachments.length === 0;
        return request.attachments.length < requiredDocs;
      })
      .map((request) => ({
        id: request.id,
        amount: Number(request.amount),
        beneficiaryName: request.beneficiaryName,
        pathName: request.governancePath.name,
        spendingItemName: request.spendingItem.name,
        attachmentsCount: request.attachments.length,
        requiredDocumentsCount: request.spendingItem.requiredDocuments.length,
      }));

    const exceptionOperations = executedRequests
      .filter(
        (request) =>
          /استثناء|exception/i.test(request.reviewerNotes ?? '') ||
          request.attachments.length === 0,
      )
      .map((request) => ({
        id: request.id,
        amount: Number(request.amount),
        reviewerNotes: request.reviewerNotes,
        beneficiaryName: request.beneficiaryName,
        executedAt: request.executedAt,
      }));

    const reviewerConflicts = conflictsByReviewer
      .filter(
        (request) =>
          request.reviewedById &&
          request.requestedById === request.reviewedById,
      )
      .map((request) => ({
        id: request.id,
        amount: Number(request.amount),
        beneficiaryName: request.beneficiaryName,
      }));

    const decisionIds = [
      ...new Set(
        conflictsByBeneficiary
          .map((request) => request.decisionId)
          .filter((decisionId): decisionId is string => Boolean(decisionId)),
      ),
    ];

    const linkedDecisions =
      decisionIds.length > 0
        ? await this.prisma.decision.findMany({
            where: { id: { in: decisionIds } },
            select: {
              id: true,
              title: true,
              createdById: true,
            },
          })
        : [];

    const decisionById = new Map(
      linkedDecisions.map((decision) => [decision.id, decision]),
    );

    const beneficiaryConflicts = conflictsByBeneficiary
      .filter(
        (request) =>
          request.beneficiary?.membership?.personId &&
          request.decisionId &&
          decisionById.get(request.decisionId)?.createdById &&
          request.beneficiary.membership.personId ===
            decisionById.get(request.decisionId)?.createdById,
      )
      .map((request) => ({
        id: request.id,
        decisionId: request.decisionId,
        decisionTitle: request.decisionId
          ? decisionById.get(request.decisionId)?.title
          : null,
        amount: Number(request.amount),
        beneficiaryName: request.beneficiaryName,
      }));

    return {
      entityId,
      period: {
        from: days90,
        to: now,
      },
      financialOperations: {
        totalTransactions: transactions.length,
        flaggedCount: flaggedTransactions.length,
        largeThreshold,
        flaggedTransactions,
      },
      attachmentsAndDocuments: {
        executedRequestsCount: executedRequests.length,
        missingDocumentsCount: missingDocuments.length,
        missingDocuments,
      },
      disbursementDecisions: {
        emergencyDecisionsCount: emergencyDecisions.length,
        emergencyDecisions,
      },
      exceptions: {
        count: exceptionOperations.length,
        items: exceptionOperations,
      },
      conflictsOfInterest: {
        reviewerConflictsCount: reviewerConflicts.length,
        beneficiaryConflictsCount: beneficiaryConflicts.length,
        reviewerConflicts,
        beneficiaryConflicts,
      },
      openAppeals: {
        overdueCount: appealsOverdue.length,
        overdueItems: appealsOverdue,
      },
      disputes: {
        openCount: disputesOpen.length,
        openItems: disputesOpen,
      },
      auditTrail: {
        total: auditTrail.length,
        latest: auditTrail,
      },
      riskSummary: {
        critical:
          appealsOverdue.length +
          reviewerConflicts.length +
          beneficiaryConflicts.length,
        high: missingDocuments.length + exceptionOperations.length,
        medium: flaggedTransactions.length + disputesOpen.length,
      },
      generatedAt: now,
      refreshedAt30Days: days30,
    };
  }

  // ── تقرير التدقيق الشهري بتاريخ محدد ─────────────────────────────
  async generateAuditReport(
    entityId: string,
    period: string,
    requesterId: string,
  ) {
    await this.requireAdminOrAuditor(entityId, requesterId);

    const parts = period.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    if (
      !year ||
      !month ||
      month < 1 ||
      month > 12 ||
      isNaN(year) ||
      isNaN(month)
    ) {
      throw new BadRequestException('صيغة الفترة يجب أن تكون YYYY-MM');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [transactions, decisions, appeals, disputes, disbursements] =
      await Promise.all([
        this.prisma.ledgerTransaction.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            entries: {
              some: {
                account: {
                  OR: [
                    { entityId },
                    { wallet: { entityId } },
                    { governancePath: { wallet: { entityId } } },
                  ],
                },
              },
            },
          },
          select: { type: true, amount: true, isReversed: true },
        }),
        this.prisma.decision.count({
          where: {
            governancePath: { wallet: { entityId } },
            closedAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.appeal.count({
          where: {
            decision: { governancePath: { wallet: { entityId } } },
            submittedAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.dispute.count({
          where: { entityId, openedAt: { gte: startDate, lte: endDate } },
        }),
        this.prisma.disbursementRequest.count({
          where: {
            governancePath: { wallet: { entityId } },
            status: 'EXECUTED',
            executedAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

    const totalIn = transactions
      .filter((t) =>
        ['SUBSCRIPTION_PAYMENT', 'DONATION', 'ENTITY_SUPPORT'].includes(t.type),
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalOut = transactions
      .filter((t) => ['DISBURSEMENT', 'TRANSFER'].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const reversals = transactions.filter((t) => t.type === 'REVERSAL').length;
    const outOfBandRatio =
      transactions.length > 0 ? reversals / transactions.length : 0;

    return {
      entityId,
      period,
      generatedAt: new Date(),
      dateRange: { from: startDate, to: endDate },
      summary: {
        totalInflow: totalIn,
        totalOutflow: totalOut,
        netFlow: totalIn - totalOut,
        transactionsCount: transactions.length,
        reversalsCount: reversals,
      },
      activity: {
        decisionsClosedCount: decisions,
        appealsFiledCount: appeals,
        disputesOpenedCount: disputes,
        disbursementsExecutedCount: disbursements,
      },
      riskIndicators: {
        outOfBandRatio: Math.round(outOfBandRatio * 100),
        riskLevel:
          outOfBandRatio > 0.2
            ? 'HIGH'
            : outOfBandRatio > 0.1
              ? 'MEDIUM'
              : 'LOW',
      },
    };
  }

  // ── كشف تداخل الاشتراكات بالغرض ──────────────────────────────────
  async getMemberSubscriptionOverlaps(personId: string, requesterId: string) {
    if (personId !== requesterId) {
      throw new ForbiddenException('يمكنك فقط رؤية تداخلاتك الخاصة');
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: { membership: { personId }, state: SubscriptionState.ACTIVE },
      include: {
        governancePath: {
          include: {
            wallet: {
              include: { entity: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    const classifyPurpose = (walletName: string): string => {
      const name = walletName.toLowerCase();
      if (/طوارئ|emergency|احتياطي/.test(name)) return 'EMERGENCY';
      if (/زواج|wedding|marriage/.test(name)) return 'WEDDING';
      if (/علاج|صحة|health|medical/.test(name)) return 'HEALTH';
      if (/تعليم|education/.test(name)) return 'EDUCATION';
      if (/صيانة|maintenance/.test(name)) return 'MAINTENANCE';
      return walletName;
    };

    const byPurpose = new Map<string, typeof subscriptions>();
    for (const sub of subscriptions) {
      const purpose = classifyPurpose(sub.governancePath.wallet.name);
      byPurpose.set(purpose, [...(byPurpose.get(purpose) ?? []), sub]);
    }

    const overlaps: {
      purpose: string;
      entityCount: number;
      totalMonthlyAmount: number;
      subscriptions: {
        entityId: string;
        entityName: string;
        walletName: string;
        pathName: string;
        monthlyAmount: number;
      }[];
    }[] = [];

    for (const [purpose, subs] of byPurpose) {
      const uniqueEntities = new Set(
        subs.map((s) => s.governancePath.wallet.entity.id),
      );
      if (uniqueEntities.size > 1) {
        const totalMonthly = subs.reduce(
          (sum, s) => sum + Number(s.agreedAmount ?? 0),
          0,
        );
        overlaps.push({
          purpose,
          entityCount: uniqueEntities.size,
          totalMonthlyAmount: totalMonthly,
          subscriptions: subs.map((s) => ({
            entityId: s.governancePath.wallet.entity.id,
            entityName: s.governancePath.wallet.entity.name,
            walletName: s.governancePath.wallet.name,
            pathName: s.governancePath.name,
            monthlyAmount: Number(s.agreedAmount ?? 0),
          })),
        });
      }
    }

    return {
      personId,
      hasOverlaps: overlaps.length > 0,
      overlapsCount: overlaps.length,
      overlaps,
      note:
        overlaps.length > 0
          ? 'لديك اشتراكات لنفس الغرض في أكثر من كيان — ليس خطأً لكن يستحق المراجعة'
          : null,
    };
  }

  // ── تقرير الشجرة الكاملة للكيان وفروعه ──────────────────────────
  async getEntitySubtreeReport(entityId: string, requesterId: string) {
    await this.requireAdminOrAuditor(entityId, requesterId);

    const allEntityIds = await this.collectSubtreeIds(entityId);

    const [entities, wallets, memberships] = await Promise.all([
      this.prisma.entity.findMany({
        where: { id: { in: allEntityIds } },
        select: {
          id: true,
          name: true,
          parentEntityId: true,
          isCampaign: true,
        },
      }),
      this.prisma.wallet.findMany({
        where: { entityId: { in: allEntityIds }, isActive: true },
        select: {
          entityId: true,
          ledgerAccount: { select: { balance: true } },
        },
      }),
      this.prisma.membership.findMany({
        where: { entityId: { in: allEntityIds }, isActive: true },
        select: { entityId: true },
      }),
    ]);

    const balanceByEntity = new Map<string, number>();
    const membersByEntity = new Map<string, number>();
    for (const entity of entities) {
      balanceByEntity.set(entity.id, 0);
      membersByEntity.set(entity.id, 0);
    }
    for (const wallet of wallets) {
      balanceByEntity.set(
        wallet.entityId,
        (balanceByEntity.get(wallet.entityId) ?? 0) +
          Number(wallet.ledgerAccount?.balance ?? 0),
      );
    }
    for (const m of memberships) {
      membersByEntity.set(
        m.entityId,
        (membersByEntity.get(m.entityId) ?? 0) + 1,
      );
    }

    const totalBalance = [...balanceByEntity.values()].reduce(
      (s, v) => s + v,
      0,
    );
    const totalMembers = [...membersByEntity.values()].reduce(
      (s, v) => s + v,
      0,
    );

    return {
      entityId,
      totalDescendants: allEntityIds.length - 1,
      aggregate: { totalBalance, totalMembers },
      entities: entities.map((e) => ({
        id: e.id,
        name: e.name,
        parentEntityId: e.parentEntityId,
        isCampaign: e.isCampaign,
        balance: balanceByEntity.get(e.id) ?? 0,
        memberCount: membersByEntity.get(e.id) ?? 0,
      })),
    };
  }

  // ── كشف الأعضاء غير المشتركين في محافظ المنفعة المشتركة ──────────
  async getSharedBenefitFreeRiders(entityId: string, requesterId: string) {
    await this.requireAdminOrAuditor(entityId, requesterId);

    const wallets = await this.prisma.wallet.findMany({
      where: { entityId, isActive: true },
      include: {
        governancePaths: {
          where: { isActive: true },
          include: {
            subscriptions: {
              where: { state: SubscriptionState.ACTIVE },
              select: { membership: { select: { personId: true } } },
            },
          },
        },
      },
    });

    const sharedWallets = wallets.filter((w) => w.benefitType === 'SHARED');

    if (sharedWallets.length === 0) {
      return { entityId, message: 'لا توجد محافظ منفعة مشتركة', results: [] };
    }

    const allActiveMembers = await this.prisma.membership.findMany({
      where: { entityId, isActive: true },
      select: { personId: true, person: { select: { name: true } } },
    });

    const results = sharedWallets.map((wallet) => {
      const subscribedIds = new Set(
        wallet.governancePaths.flatMap((p) =>
          p.subscriptions.map((s) => s.membership.personId),
        ),
      );
      const freeRiders = allActiveMembers.filter(
        (m) => !subscribedIds.has(m.personId),
      );
      const participationRate =
        allActiveMembers.length > 0
          ? Math.round((subscribedIds.size / allActiveMembers.length) * 100)
          : 0;

      return {
        walletId: wallet.id,
        walletName: wallet.name,
        totalMembers: allActiveMembers.length,
        subscribedCount: subscribedIds.size,
        participationRate,
        freeRidersCount: freeRiders.length,
        freeRiders: freeRiders.map((m) => ({
          personId: m.personId,
          name: m.person.name,
        })),
      };
    });

    return { entityId, results };
  }

  private async collectSubtreeIds(entityId: string): Promise<string[]> {
    const result: string[] = [entityId];
    const children = await this.prisma.entity.findMany({
      where: { parentEntityId: entityId, isActive: true },
      select: { id: true },
    });
    for (const child of children) {
      const subIds = await this.collectSubtreeIds(child.id);
      result.push(...subIds);
    }
    return result;
  }

  private computeHealthScore(metrics: {
    paymentComplianceRate: number;
    subscriptionHealthRate: number;
    activeMemberRate: number;
  }): number {
    return Math.round(
      metrics.paymentComplianceRate * 0.4 +
        metrics.subscriptionHealthRate * 0.4 +
        metrics.activeMemberRate * 0.2,
    );
  }

  private getHealthLevel(score: number): string {
    if (score >= 85) return 'ممتاز';
    if (score >= 70) return 'جيد';
    if (score >= 50) return 'متوسط';
    return 'يحتاج مراجعة';
  }

  // ── تقرير الدعم المالي بين الكيانات ────────────────────────────
  async getEntitySupportReport(entityId: string, requesterId: string) {
    await this.requireAdminOrAuditor(entityId, requesterId);

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, name: true },
    });
    if (!entity) throw new NotFoundException('الكيان غير موجود');

    const [outgoing, incoming] = await Promise.all([
      this.prisma.ledgerTransaction.findMany({
        where: {
          type: LedgerTransactionType.ENTITY_SUPPORT,
          sourceEntityId: entityId,
          isReversed: false,
        },
        include: {
          entries: {
            where: { type: LedgerEntryType.CREDIT },
            include: {
              account: {
                include: {
                  governancePath: {
                    include: {
                      wallet: {
                        include: {
                          entity: { select: { id: true, name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ledgerTransaction.findMany({
        where: {
          type: LedgerTransactionType.ENTITY_SUPPORT,
          isReversed: false,
          entries: {
            some: {
              type: LedgerEntryType.CREDIT,
              account: {
                governancePath: { wallet: { entityId } },
              },
            },
          },
        },
        include: {
          entries: {
            where: { type: LedgerEntryType.DEBIT },
            include: {
              account: {
                include: {
                  governancePath: {
                    include: {
                      wallet: {
                        include: {
                          entity: { select: { id: true, name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalOutgoing = outgoing.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const totalIncoming = incoming.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    return {
      entityId,
      entityName: entity.name,
      totalOutgoing,
      totalIncoming,
      netReceived: totalIncoming - totalOutgoing,
      outgoing: outgoing.map((t) => ({
        transactionId: t.id,
        amount: Number(t.amount),
        description: t.description,
        createdAt: t.createdAt,
        targetEntity:
          t.entries[0]?.account?.governancePath?.wallet?.entity ?? null,
      })),
      incoming: incoming.map((t) => ({
        transactionId: t.id,
        amount: Number(t.amount),
        description: t.description,
        createdAt: t.createdAt,
        sourceEntityId: t.sourceEntityId,
        sourceEntity:
          t.entries[0]?.account?.governancePath?.wallet?.entity ?? null,
      })),
    };
  }

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }

  private async requireAdminOrAuditor(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [
            MemberRole.AUDITOR,
            MemberRole.ADMIN,
            MemberRole.FOUNDER,
            MemberRole.TREASURER,
          ],
        },
      },
    });
    if (!m)
      throw new ForbiddenException(
        'يجب أن تكون مديراً أو مراجعاً أو أمين صندوق',
      );
  }
}
