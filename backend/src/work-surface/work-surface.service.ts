import { Injectable } from '@nestjs/common';
import {
  DecisionStatus,
  DecisionType,
  DisbursementRequestStatus,
  DisputeStatus,
  EntityPlatformStatus,
  LedgerTransactionType,
  MemberRole,
  MembershipApplicationStatus,
  PaymentDueStatus,
  PaymentRecordStatus,
  Prisma,
  SubscriptionState,
  VoteChoice,
  VotersScope,
  WalletBenefitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdvancedToolLinkDto,
  AuditorSurfaceSummaryDto,
  BenefitSurfaceSummaryDto,
  BlockedCapabilityDto,
  CommitteeSurfaceSummaryDto,
  ContextSurfaceSummaryDto,
  FinanceSurfaceSummaryDto,
  MoneySurfaceSummaryDto,
  NonOperationalSurfaceSummaryDto,
  SharedBenefitSurfaceSummaryDto,
  SurfaceActionDto,
  SurfaceContextDto,
  SurfaceExceptionDto,
  SurfaceKind,
  SurfaceMessageDto,
  SurfacePriority,
  SurfaceTone,
  SurfaceUpdateDto,
  WorkSurfaceResponseDto,
} from './dto/work-surface.dto';

const ADMIN_ROLES: readonly MemberRole[] = [MemberRole.FOUNDER, MemberRole.ADMIN];
const FOUNDER_ROLES: readonly MemberRole[] = [MemberRole.FOUNDER];
const PAYMENT_MATCHING_ROLES: readonly MemberRole[] = [
  MemberRole.FOUNDER,
  MemberRole.TREASURER,
] as const;
const DISBURSEMENT_REVIEW_ROLES: readonly MemberRole[] = [
  MemberRole.FOUNDER,
  MemberRole.ADMIN,
  MemberRole.TREASURER,
] as const;
const DISBURSEMENT_EXECUTION_ROLES: readonly MemberRole[] = [
  MemberRole.FOUNDER,
  MemberRole.TREASURER,
] as const;
const OVERSIGHT_ROLES: readonly MemberRole[] = [
  MemberRole.FOUNDER,
  MemberRole.ADMIN,
  MemberRole.AUDITOR,
] as const;
const COMMITTEE_ROLES: readonly MemberRole[] = [
  MemberRole.FOUNDER,
  MemberRole.ADMIN,
  MemberRole.COMMITTEE_MEMBER,
] as const;
const ACTIONABLE_DISBURSEMENT_STATUSES: readonly DisbursementRequestStatus[] = [
  DisbursementRequestStatus.PENDING,
  DisbursementRequestStatus.APPROVED,
  DisbursementRequestStatus.REJECTED,
] as const;
const PENDING_PAYMENT_PROOF_STATUSES: readonly PaymentRecordStatus[] = [
  PaymentRecordStatus.PROCESSING,
  PaymentRecordStatus.SUBMITTED,
] as const;

type SurfaceMembership = {
  id: string;
  personId: string;
  entityId: string;
  role: MemberRole;
  canManageAdvancedSettings: boolean;
  isActive: boolean;
  entity: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    isCampaign: boolean;
    platformStatus: EntityPlatformStatus;
    wallets: Array<{ benefitType: string; isActive: boolean }>;
  };
  committeeMembers: Array<{ committeeId: string }>;
  subscriptions: Array<{
    id: string;
    state: SubscriptionState;
    agreedAmount: unknown;
    notes: string | null;
    activeAt: Date | null;
    suspendedAt: Date | null;
    exitedAt: Date | null;
    governancePathId: string;
    governancePath: {
      id: string;
      name: string;
      wallet: {
        id: string;
        name: string;
        benefitType: string;
        entityId: string;
        entity: { id: string; name: string };
      };
    };
  }>;
};

type SurfaceEntityRef = { id: string; name: string };

type SurfacePaymentDue = {
  id: string;
  periodLabel: string;
  dueDate: Date;
  amountDue: unknown;
  status: PaymentDueStatus;
  subscription: {
    governancePath: {
      name: string;
      wallet: { name: string; entity: { id: string; name: string } };
    };
  };
};

type SurfacePaymentRecord = {
  id: string;
  amount: unknown;
  status: PaymentRecordStatus;
  reviewerNotes: string | null;
  paymentDue: { periodLabel: string };
  subscription: {
    governancePath: {
      name: string;
      wallet: { name: string; entity: { id: string; name: string } };
    };
  };
};

type SurfaceApplication = {
  id: string;
  status: MembershipApplicationStatus;
  reviewerNotes: string | null;
  entity: { id: string; name: string };
};

type SurfaceDisbursement = {
  id: string;
  amount: unknown;
  status: DisbursementRequestStatus;
  beneficiaryName: string;
  reviewerNotes: string | null;
  spendingItem: { name: string };
  governancePath: {
    name: string;
    wallet: { name: string; entity: { id: string; name: string } };
  };
};

type SurfaceNotification = {
  id: string;
  title: string;
  body: string;
  sentAt: Date;
};

type SurfaceDecision = {
  id: string;
  title: string;
  closesAt: Date;
  votersScope: VotersScope;
  governancePathId: string | null;
  votes: Array<{ id: string }>;
  governancePath: {
    id: string;
    committeeId: string | null;
    wallet: { entityId: string; entity: { id: string; name: string } };
  } | null;
};

type CommitteeDecisionItem = {
  id: string;
  title: string;
  description: string | null;
  decisionType: DecisionType;
  amount: unknown;
  quorumPercent: number;
  approvalPercent: number;
  closesAt: Date;
  votes: Array<{
    personId: string;
    choice: VoteChoice;
    notes: string | null;
    votedAt: Date;
  }>;
  _count: { votes: number };
  governancePath: {
    id: string;
    name: string;
    committeeId: string | null;
    committee: {
      id: string;
      name: string;
      _count: { members: number };
    } | null;
    wallet: {
      name: string;
      entity: SurfaceEntityRef;
    };
  } | null;
};

type AuditSurfaceLogItem = Prisma.AuditLogGetPayload<{
  include: {
    person: { select: { id: true; name: true } };
    entity: { select: { id: true; name: true } };
  };
}>;

type FinancePaymentRecordItem = {
  amount: unknown;
  reviewerNotes?: string | null;
  subscription: {
    membership: {
      entity: SurfaceEntityRef;
    };
  };
};

type FinancePaymentDueItem = {
  amountDue: unknown;
  subscription: {
    governancePath: {
      name: string;
      wallet: { name: string; entity: SurfaceEntityRef };
    };
  };
};

type FinanceDisbursementItem = {
  amount: unknown;
  beneficiaryName: string;
  governancePath: {
    name: string;
    ledgerAccount: { balance: unknown } | null;
    wallet: { name: string; entity: SurfaceEntityRef };
  };
};

type FinancePathBalanceItem = {
  name: string;
  ledgerAccount: { balance: unknown } | null;
  wallet: { name: string; entity: SurfaceEntityRef };
};

type FinanceLedgerTransactionItem = {
  id: string;
  type: LedgerTransactionType;
  amount: unknown;
  description: string;
  reference: string | null;
  decisionId: string | null;
  sourceEntityId: string | null;
  originEntityId: string | null;
  originNote: string | null;
  createdAt: Date;
};

@Injectable()
export class WorkSurfaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getForPerson(personId: string): Promise<WorkSurfaceResponseDto> {
    const now = new Date();
    const [
      person,
      memberships,
      paymentDues,
      paymentRecords,
      applications,
      disbursements,
      notifications,
    ] = await Promise.all([
      this.prisma.person.findUnique({
        where: { id: personId },
        select: { id: true, name: true, isVerified: true },
      }),
      this.prisma.membership.findMany({
        where: { personId },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              isActive: true,
              isCampaign: true,
              platformStatus: true,
              wallets: {
                where: { isActive: true },
                select: { benefitType: true, isActive: true },
              },
            },
          },
          committeeMembers: { select: { committeeId: true } },
          subscriptions: {
            include: {
              governancePath: {
                include: {
                  wallet: {
                    select: {
                      id: true,
                      name: true,
                      benefitType: true,
                      entityId: true,
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.paymentDue.findMany({
        where: {
          status: { in: [PaymentDueStatus.PENDING, PaymentDueStatus.OVERDUE] },
          subscription: {
            membership: { personId, isActive: true },
            state: SubscriptionState.ACTIVE,
          },
        },
        include: {
          subscription: {
            include: {
              governancePath: {
                include: {
                  wallet: {
                    select: {
                      name: true,
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 12,
      }),
      this.prisma.paymentRecord.findMany({
        where: {
          submittedById: personId,
          status: {
            in: [
              PaymentRecordStatus.PROCESSING,
              PaymentRecordStatus.SUBMITTED,
              PaymentRecordStatus.REJECTED,
            ],
          },
        },
        include: {
          paymentDue: { select: { periodLabel: true } },
          subscription: {
            include: {
              governancePath: {
                include: {
                  wallet: {
                    select: {
                      name: true,
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        take: 8,
      }),
      this.prisma.membershipApplication.findMany({
        where: {
          personId,
          status: {
            in: [
              MembershipApplicationStatus.PENDING,
              MembershipApplicationStatus.UNDER_REVIEW,
              MembershipApplicationStatus.REJECTED,
            ],
          },
        },
        include: { entity: { select: { id: true, name: true } } },
        orderBy: { submittedAt: 'desc' },
        take: 8,
      }),
      this.prisma.disbursementRequest.findMany({
        where: { requestedById: personId },
        include: {
          spendingItem: { select: { name: true } },
          governancePath: {
            include: {
              wallet: {
                select: {
                  name: true,
                  entity: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        take: 8,
      }),
      this.prisma.notification.findMany({
        where: { personId, isRead: false },
        orderBy: { sentAt: 'desc' },
        take: 5,
      }),
    ]);

    const surfaceMemberships = memberships as SurfaceMembership[];
    const activeMemberships = surfaceMemberships.filter(
      (membership) => membership.isActive && membership.entity.isActive,
    );
    const entityIds = activeMemberships.map((membership) => membership.entityId);

    const [
      decisions,
      exceptions,
      financeSummary,
      committeeSummary,
      auditorSummary,
      sharedBenefitSummary,
    ] =
      await Promise.all([
        entityIds.length === 0
          ? Promise.resolve([])
          : this.prisma.decision.findMany({
              where: {
                status: DecisionStatus.OPEN,
                closesAt: { gte: now },
                governancePath: { wallet: { entityId: { in: entityIds } } },
              },
              include: {
                votes: { where: { personId }, select: { id: true } },
                governancePath: {
                  include: {
                    wallet: {
                      select: {
                        entityId: true,
                        entity: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
              orderBy: { closesAt: 'asc' },
              take: 25,
            }),
        this.buildOperatorExceptions(personId, activeMemberships),
        this.buildFinanceSummary(activeMemberships),
        this.buildCommitteeSummary(personId, activeMemberships, now),
        this.buildAuditorSummary(activeMemberships),
        this.buildSharedBenefitSummary(personId, activeMemberships),
      ]);

    const nonOperationalSummary =
      this.buildNonOperationalSummary(surfaceMemberships);
    const operationalPaymentDues = this.filterNonOperationalPaymentDues(
      paymentDues as SurfacePaymentDue[],
      nonOperationalSummary,
    );
    const operationalPaymentRecords = this.filterNonOperationalPaymentRecords(
      paymentRecords as SurfacePaymentRecord[],
      nonOperationalSummary,
    );
    const operationalDisbursements = this.filterNonOperationalDisbursements(
      disbursements as SurfaceDisbursement[],
      nonOperationalSummary,
    );

    const requiredActions = this.filterNonOperationalActions(
      [
        ...this.buildMembershipStatusActions(surfaceMemberships),
        ...this.buildPaymentActions(operationalPaymentDues),
        ...this.buildPaymentRecordActions(operationalPaymentRecords),
        ...this.buildApplicationActions(applications as SurfaceApplication[]),
        ...this.buildDisbursementActions(operationalDisbursements),
        ...this.buildVoteActions(
          personId,
          decisions as SurfaceDecision[],
          activeMemberships,
        ),
      ],
      nonOperationalSummary,
    ).sort((a, b) => this.priorityRank(a.priority) - this.priorityRank(b.priority));

    const moneySummary = this.buildMoneySummary(
      operationalPaymentDues,
      operationalPaymentRecords,
    );
    const benefitSummary = this.buildBenefitSummary(surfaceMemberships);
    const blockedCapabilities = this.buildBlockedCapabilities(
      person?.isVerified ?? true,
      surfaceMemberships,
    );
    const activeContexts = this.buildContexts(surfaceMemberships);
    const contextSummaries = this.buildContextSummaries(
      activeContexts,
      surfaceMemberships,
      operationalPaymentDues,
      operationalPaymentRecords,
      requiredActions,
      exceptions,
      benefitSummary,
      blockedCapabilities,
    );

    const visibleRequiredActions = requiredActions.slice(0, 8);

    return {
      generatedAt: now.toISOString(),
      person: {
        id: person?.id ?? personId,
        displayName: person?.name ?? 'المستخدم',
        accountState: person?.isVerified === false ? 'UNVERIFIED' : 'OK',
        accountMessage:
          person?.isVerified === false
            ? 'يلزم توثيق الحساب قبل بعض الإجراءات.'
            : undefined,
      },
      surfaceKind: this.resolveSurfaceKind(surfaceMemberships),
      activeContexts,
      contextSummaries,
      primaryMessage: this.buildPrimaryMessage(
        visibleRequiredActions,
        exceptions,
        moneySummary,
        nonOperationalSummary,
      ),
      requiredActions: visibleRequiredActions,
      quietUpdates: this.buildQuietUpdates(
        notifications as SurfaceNotification[],
        disbursements as SurfaceDisbursement[],
      ),
      moneySummary,
      financeSummary,
      committeeSummary,
      auditorSummary,
      nonOperationalSummary,
      sharedBenefitSummary,
      benefitSummary,
      blockedCapabilities,
      exceptions,
      advancedTools: this.buildAdvancedTools(activeMemberships),
      diagnostics: {
        source: 'work-surface-v1',
        legacyDashboardHref: '/dashboard/legacy',
      },
    };
  }

  private buildMembershipStatusActions(
    memberships: SurfaceMembership[],
  ): SurfaceActionDto[] {
    const actions: SurfaceActionDto[] = [];
    const platformActionIds = new Set<string>();

    for (const membership of memberships) {
      for (const subscription of membership.subscriptions) {
        const walletName = this.cleanDisplayName(
          subscription.governancePath.wallet.name,
        );
        const contextLabel = subscription.governancePath.wallet.entity.name;
        const reason = this.subscriptionStateReason(subscription);

        if (
          membership.entity.platformStatus === EntityPlatformStatus.SUSPENDED
        ) {
          const id = `membership-status-entity-suspended-${membership.entityId}`;
          if (!platformActionIds.has(id)) {
            platformActionIds.add(id);
            actions.push({
              id,
              kind: 'MEMBERSHIP_STATUS',
              priority: 'urgent',
              title: `${membership.entity.name} موقوف حالياً`,
              body:
                'لا تظهر إجراءات تشغيلية جديدة حتى ترفع المنصة التعليق عن هذا الصندوق.',
              contextLabel: membership.entity.name,
              cta: { label: 'عرض الحالة', href: '/portal' },
            });
          }
          continue;
        }

        if (membership.entity.platformStatus === EntityPlatformStatus.READ_ONLY) {
          const id = `membership-status-entity-readonly-${membership.entityId}`;
          if (!platformActionIds.has(id)) {
            platformActionIds.add(id);
            actions.push({
              id,
              kind: 'MEMBERSHIP_STATUS',
              priority: 'info',
              title: membership.entity.isCampaign
                ? 'هذه الحملة للمتابعة فقط'
                : `${membership.entity.name} للمتابعة فقط`,
              body:
                'يمكنك متابعة الحالة، لكن النظام لا يعرض إجراءات جديدة في وضع القراءة فقط.',
              contextLabel: membership.entity.name,
              cta: { label: 'عرض الحالة', href: '/portal' },
              reason: 'هذه الحالة أعلى من تفاصيل الاشتراك داخل الحملة.',
            });
          }
          continue;
        }

        if (
          membership.entity.platformStatus === EntityPlatformStatus.PENDING_REVIEW
        ) {
          const id = `membership-status-entity-pending-${membership.entityId}`;
          if (!platformActionIds.has(id)) {
            platformActionIds.add(id);
            actions.push({
              id,
              kind: 'MEMBERSHIP_STATUS',
              priority: 'info',
              title: `${membership.entity.name} قيد مراجعة المنصة`,
              body:
                'بعض الإجراءات لا تظهر حتى تنتهي المراجعة، لذلك يعرض النظام ما يمكنك متابعته فقط.',
              contextLabel: membership.entity.name,
              cta: { label: 'عرض الحالة', href: '/portal' },
            });
          }
          continue;
        }

        if (subscription.state === SubscriptionState.SUSPENDED) {
          actions.push({
            id: `membership-status-suspended-${subscription.id}`,
            kind: 'MEMBERSHIP_STATUS',
            priority: 'urgent',
            title: `عضويتك معلقة في ${walletName}`,
            body:
              'لا تظهر لك الاستفادة أو التصويت كمتاحين هنا حتى معالجة سبب التعليق.',
            contextLabel,
            cta: { label: 'راجع ما يلزم', href: '/portal' },
            reason,
            expectedAfterAction:
              'بعد معالجة السبب سيعيد النظام عرض الحقوق المتاحة تلقائياً.',
          });
        } else if (subscription.state === SubscriptionState.CONDITIONAL) {
          actions.push({
            id: `membership-status-conditional-${subscription.id}`,
            kind: 'MEMBERSHIP_STATUS',
            priority: 'normal',
            title: `عضويتك مشروطة في ${walletName}`,
            body:
              'هذه ليست عضوية نشطة كاملة بعد؛ لذلك تظهر الحقوق والإجراءات بشكل محدود.',
            contextLabel,
            cta: { label: 'راجع الحالة', href: '/portal' },
            reason,
            expectedAfterAction:
              'عند اكتمال الشرط سيعاملها النظام كعضوية نشطة دون أن تبحث في التفاصيل.',
          });
        } else if (subscription.state === SubscriptionState.EXITED) {
          actions.push({
            id: `membership-status-exited-${subscription.id}`,
            kind: 'MEMBERSHIP_STATUS',
            priority: 'info',
            title: `أنت خارج ${walletName}`,
            body:
              'هذه علاقة سابقة؛ لا تظهر لك إجراءات العضو النشط في هذا السياق.',
            contextLabel,
            cta: { label: 'عرض الملخص', href: '/portal' },
            reason,
          });
        }
      }
    }

    return actions.slice(0, 6);
  }

  private buildNonOperationalSummary(
    memberships: SurfaceMembership[],
  ): NonOperationalSurfaceSummaryDto {
    const seenEntityIds = new Set<string>();
    const items: NonOperationalSurfaceSummaryDto['items'] = [];

    for (const membership of memberships) {
      if (membership.entity.platformStatus === EntityPlatformStatus.ACTIVE) {
        continue;
      }
      if (seenEntityIds.has(membership.entityId)) continue;
      seenEntityIds.add(membership.entityId);

      items.push(this.buildNonOperationalItem(membership));
    }

    items.sort(
      (a, b) =>
        this.nonOperationalPriority(a.status) -
          this.nonOperationalPriority(b.status) ||
        Number(b.canAct) - Number(a.canAct),
    );

    const suspendedCount = items.filter(
      (item) => item.status === EntityPlatformStatus.SUSPENDED,
    ).length;
    const pendingReviewCount = items.filter(
      (item) => item.status === EntityPlatformStatus.PENDING_REVIEW,
    ).length;
    const readOnlyCount = items.filter(
      (item) => item.status === EntityPlatformStatus.READ_ONLY,
    ).length;

    return {
      isVisible: items.length > 0,
      pendingReviewCount,
      suspendedCount,
      readOnlyCount,
      displayText: this.nonOperationalDisplayText(
        suspendedCount,
        pendingReviewCount,
        readOnlyCount,
      ),
      items: items.slice(0, 6),
    };
  }

  private buildNonOperationalItem(
    membership: SurfaceMembership,
  ): NonOperationalSurfaceSummaryDto['items'][number] {
    const entityId = membership.entityId;
    const entityName = membership.entity.name;
    const canAct = membership.isActive && ADMIN_ROLES.includes(membership.role);
    const base = {
      entityId,
      entityName,
      roleLabel: this.roleLabel(membership.role),
      canAct,
    };

    if (membership.entity.platformStatus === EntityPlatformStatus.SUSPENDED) {
      return {
        ...base,
        id: `non-operational-suspended-${entityId}`,
        status: 'SUSPENDED',
        statusLabel: 'موقوف مؤقتاً',
        tone: 'blocked',
        title: `${entityName} موقوف مؤقتاً`,
        whatThisMeans:
          'أوقفت المنصة التشغيل مؤقتاً. لذلك لا يعرض النظام دفعاً جديداً أو صرفاً أو قرارات تشغيلية كأنها متاحة.',
        blockedActions: ['دفعات جديدة', 'طلبات صرف جديدة', 'قرارات تشغيلية'],
        allowedActions: canAct
          ? ['قراءة سبب التعليق', 'متابعة حالة المنصة', 'إبلاغ الأعضاء عند عودة التشغيل']
          : ['قراءة الملخص فقط', 'متابعة التنبيهات المهمة'],
        nextStep: canAct
          ? 'راجع سبب التعليق من حالة المنصة قبل طلب أي إجراء تشغيلي جديد.'
          : 'لا يوجد إجراء مطلوب منك الآن. سيظهر المطلوب عندما ترفع المنصة التعليق.',
        whyShown:
          'ظهر هنا حتى لا تتعامل معه كصندوق عادي وتضغط أزراراً ستُمنع لاحقاً.',
        cta: canAct
          ? {
              label: 'راجع حالة المنصة',
              href: `/entities/${entityId}/platform-access`,
            }
          : undefined,
      };
    }

    if (membership.entity.platformStatus === EntityPlatformStatus.READ_ONLY) {
      return {
        ...base,
        id: `non-operational-readonly-${entityId}`,
        status: 'READ_ONLY',
        statusLabel: 'للمتابعة فقط',
        tone: 'neutral',
        title: `${entityName} للمتابعة فقط`,
        whatThisMeans:
          'يمكنك قراءة الحالة وما حدث سابقاً، لكن النظام لا يبدأ عمليات جديدة في هذا الصندوق الآن.',
        blockedActions: ['إنشاء طلب صرف', 'فتح تصويت جديد', 'تعديل تشغيلي يومي'],
        allowedActions: canAct
          ? ['قراءة الملخص', 'مراجعة سبب وضع المتابعة', 'متابعة السجل عند الحاجة']
          : ['قراءة الملخص', 'متابعة التنبيهات المهمة'],
        nextStep: canAct
          ? 'استخدم وضع المتابعة فقط إلى أن تقرر الإدارة أو المنصة إعادة التشغيل.'
          : 'اكتف بالمتابعة الهادئة. سيخبرك النظام إذا عاد إجراء يخصك.',
        whyShown:
          'ظهر هنا لأن الصندوق لا يحتاج منك تشغيله يومياً، بل فهم حدوده الحالية فقط.',
        cta: canAct
          ? { label: 'عرض الملخص', href: `/entities/${entityId}` }
          : undefined,
      };
    }

    return {
      ...base,
      id: `non-operational-pending-${entityId}`,
      status: 'PENDING_REVIEW',
      statusLabel: 'قيد المراجعة',
      tone: 'attention',
      title: `${entityName} ينتظر مراجعة المنصة`,
      whatThisMeans:
        'الصندوق موجود، لكن التشغيل لم يبدأ بالكامل بعد. لذلك لا يعرض النظام دفعات أو صرفاً أو قرارات كأنها جاهزة.',
      blockedActions: ['مطالبة الأعضاء بالدفع', 'إنشاء صرف تشغيلي', 'فتح قرارات نهائية'],
      allowedActions: canAct
        ? ['إكمال بيانات الصندوق', 'متابعة متطلبات المراجعة']
        : ['قراءة الحالة فقط', 'انتظار اكتمال المراجعة'],
      nextStep: canAct
        ? 'أكمل بيانات الصندوق ومتطلبات المراجعة قبل دعوة الأعضاء للتشغيل.'
        : 'لا يوجد إجراء مطلوب منك الآن. سيظهر المطلوب عندما يصبح الصندوق جاهزاً.',
      whyShown:
        'ظهر هنا حتى لا يخلط المستخدم بين صندوق تحت الإعداد وصندوق يعمل فعلياً.',
      cta: canAct
        ? { label: 'راجع متطلبات التشغيل', href: `/entities/${entityId}/settings` }
        : undefined,
    };
  }

  private nonOperationalDisplayText(
    suspendedCount: number,
    pendingReviewCount: number,
    readOnlyCount: number,
  ) {
    const parts: string[] = [];
    if (suspendedCount > 0) {
      parts.push(`${suspendedCount} موقوف`);
    }
    if (pendingReviewCount > 0) {
      parts.push(`${pendingReviewCount} قيد المراجعة`);
    }
    if (readOnlyCount > 0) {
      parts.push(`${readOnlyCount} للمتابعة فقط`);
    }
    if (parts.length === 0) {
      return 'كل صناديقك الظاهرة تعمل كصناديق تشغيلية.';
    }
    return `لديك ${parts.join('، ')}. أخفى النظام الإجراءات التشغيلية عنها حتى لا تظهر كمهام يومية عادية.`;
  }

  private nonOperationalPriority(
    status: NonOperationalSurfaceSummaryDto['items'][number]['status'],
  ) {
    if (status === 'SUSPENDED') return 0;
    if (status === 'PENDING_REVIEW') return 1;
    return 2;
  }

  private filterNonOperationalActions(
    actions: SurfaceActionDto[],
    summary: NonOperationalSurfaceSummaryDto,
  ) {
    const nonOperationalEntityNames = new Set(
      summary.items.map((item) => item.entityName),
    );
    if (nonOperationalEntityNames.size === 0) return actions;

    return actions.filter((action) => {
      if (action.kind === 'MEMBERSHIP_APPLICATION_STATUS') return true;
      if (!action.contextLabel) return true;
      const belongsToNonOperationalEntity = [...nonOperationalEntityNames].some(
        (entityName) =>
          action.contextLabel?.includes(entityName),
      );
      if (belongsToNonOperationalEntity) return false;
      return true;
    });
  }

  private filterNonOperationalPaymentDues(
    dues: SurfacePaymentDue[],
    summary: NonOperationalSurfaceSummaryDto,
  ) {
    const nonOperationalEntityIds = this.nonOperationalEntityIds(summary);
    if (nonOperationalEntityIds.size === 0) return dues;
    return dues.filter(
      (due) =>
        !nonOperationalEntityIds.has(
          due.subscription.governancePath.wallet.entity.id,
        ),
    );
  }

  private filterNonOperationalPaymentRecords(
    records: SurfacePaymentRecord[],
    summary: NonOperationalSurfaceSummaryDto,
  ) {
    const nonOperationalEntityIds = this.nonOperationalEntityIds(summary);
    if (nonOperationalEntityIds.size === 0) return records;
    return records.filter(
      (record) =>
        !nonOperationalEntityIds.has(
          record.subscription.governancePath.wallet.entity.id,
        ),
    );
  }

  private filterNonOperationalDisbursements(
    disbursements: SurfaceDisbursement[],
    summary: NonOperationalSurfaceSummaryDto,
  ) {
    const nonOperationalEntityIds = this.nonOperationalEntityIds(summary);
    if (nonOperationalEntityIds.size === 0) return disbursements;
    return disbursements.filter(
      (request) =>
        !nonOperationalEntityIds.has(
          request.governancePath.wallet.entity.id,
        ),
    );
  }

  private nonOperationalEntityIds(summary: NonOperationalSurfaceSummaryDto) {
    return new Set(summary.items.map((item) => item.entityId));
  }

  private buildPaymentActions(paymentDues: SurfacePaymentDue[]) {
    const overdue = paymentDues.filter(
      (due) => due.status === PaymentDueStatus.OVERDUE,
    );
    const dueNow = paymentDues.filter(
      (due) => due.status === PaymentDueStatus.PENDING,
    );
    return [
      this.buildGroupedPaymentAction('overdue', overdue),
      this.buildGroupedPaymentAction('due', dueNow),
    ].filter((action): action is SurfaceActionDto => Boolean(action));
  }

  private buildGroupedPaymentAction(
    kind: 'overdue' | 'due',
    dues: SurfacePaymentDue[],
  ): SurfaceActionDto | null {
    if (dues.length === 0) return null;

    const amount = dues.reduce((sum, due) => sum + this.toNumber(due.amountDue), 0);
    const contexts = this.summarizeContexts(
      dues.map((due) => due.subscription.governancePath.wallet.entity.name),
    );
    const breakdown = this.paymentDueBreakdown(dues);
    const earliestDue = dues.reduce(
      (earliest, due) =>
        due.dueDate.getTime() < earliest.getTime() ? due.dueDate : earliest,
      dues[0].dueDate,
    );

    if (kind === 'overdue') {
      return {
        id: 'payment-overdue-summary',
        kind: 'PAYMENT_OVERDUE',
        priority: 'urgent',
        title: `لديك متأخرات ${this.formatMoney(amount)}`,
        body:
          dues.length === 1
            ? 'توجد دفعة واحدة تجاوزت موعدها.'
            : `توجد ${dues.length} دفعات متأخرة. التوزيع: ${breakdown}.`,
        contextLabel: contexts,
        amount,
        dueDate: earliestDue.toISOString(),
        cta: { label: 'سدّد المتأخر', href: '/portal' },
        expectedAfterAction:
          'بعد رفع الدفع سيظهر كقيد مراجعة حتى يؤكده أمين الصندوق.',
      };
    }

    return {
      id: 'payment-due-summary',
      kind: 'PAYMENT_DUE',
      priority: 'normal',
      title: `عليك ${this.formatMoney(amount)} الآن`,
      body:
        dues.length === 1
          ? `دفعة مستحقة بتاريخ ${this.formatDate(earliestDue)}.`
          : `توجد ${dues.length} دفعات مستحقة. التوزيع: ${breakdown}.`,
      contextLabel: contexts,
      amount,
      dueDate: earliestDue.toISOString(),
      cta: { label: 'سدّد الآن', href: '/portal' },
      expectedAfterAction:
        'بعد رفع الدفع سيظهر كقيد مراجعة حتى يؤكده أمين الصندوق.',
    };
  }

  private buildPaymentRecordActions(paymentRecords: SurfacePaymentRecord[]) {
    const rejected = paymentRecords.filter(
      (record) => record.status === PaymentRecordStatus.REJECTED,
    );
    const pending = paymentRecords.filter((record) =>
      PENDING_PAYMENT_PROOF_STATUSES.includes(record.status),
    );
    return [
      this.buildGroupedPaymentRecordAction('rejected', rejected),
      this.buildGroupedPaymentRecordAction('pending', pending),
    ].filter((action): action is SurfaceActionDto => Boolean(action));
  }

  private buildGroupedPaymentRecordAction(
    kind: 'rejected' | 'pending',
    records: SurfacePaymentRecord[],
  ): SurfaceActionDto | null {
    if (records.length === 0) return null;

    const amount = records.reduce(
      (sum, record) => sum + this.toNumber(record.amount),
      0,
    );
    const contexts = this.summarizeContexts(
      records.map(
        (record) => record.subscription.governancePath.wallet.entity.name,
      ),
    );

    if (kind === 'rejected') {
      const latestNote = records.find((record) => record.reviewerNotes)
        ?.reviewerNotes;
      return {
        id: 'payment-record-rejected-summary',
        kind: 'PAYMENT_PROOF_REJECTED',
        priority: 'urgent',
        title:
          records.length === 1
            ? 'دفعتك لم تُعتمد'
            : `${records.length} دفعات لم تُعتمد`,
        body: latestNote
          ? `آخر ملاحظة: ${this.simplifySurfaceText(latestNote)}`
          : 'تحتاج مراجعة أو رفع إثبات بديل.',
        contextLabel: contexts,
        amount,
        cta: { label: 'راجع الدفعات', href: '/portal' },
        reason: 'أمين الصندوق رفض الإثبات أو طلب تصحيحاً.',
      };
    }

    return {
      id: 'payment-record-pending-summary',
      kind: 'PAYMENT_PROOF_PENDING',
      priority: 'info',
      title:
        records.length === 1
          ? 'دفعتك وصلت وتنتظر التأكيد'
          : `${records.length} دفعات تنتظر التأكيد`,
      body: 'لا تحتاج متابعة يومية؛ سيظهر التغيير هنا عند اعتمادها أو طلب تصحيحها.',
      contextLabel: contexts,
      amount,
      cta: { label: 'عرض الحالة', href: '/portal' },
    };
  }

  private buildApplicationActions(applications: SurfaceApplication[]) {
    return applications.map<SurfaceActionDto>((application) => {
      const rejected =
        application.status === MembershipApplicationStatus.REJECTED;
      return {
        id: `membership-application-${application.id}`,
        kind: 'MEMBERSHIP_APPLICATION_STATUS',
        priority: rejected ? 'urgent' : 'info',
        title: rejected ? 'طلب الانضمام لم يُقبل' : 'طلب الانضمام قيد المراجعة',
        body: rejected
          ? application.reviewerNotes ??
            'راجع سبب الرفض أو تواصل مع الإدارة قبل إعادة التقديم.'
          : 'لا يوجد إجراء مطلوب منك الآن حتى يصدر قرار الإدارة.',
        contextLabel: application.entity.name,
        cta: { label: rejected ? 'راجع الخيارات' : 'حسنًا', href: '/dashboard' },
      };
    });
  }

  private buildDisbursementActions(disbursements: SurfaceDisbursement[]) {
    return disbursements
      .filter((request) =>
        ACTIONABLE_DISBURSEMENT_STATUSES.includes(request.status),
      )
      .map<SurfaceActionDto>((request) => {
        if (request.status === DisbursementRequestStatus.REJECTED) {
          return {
            id: `disbursement-${request.id}`,
            kind: 'DISBURSEMENT_REQUEST_STATUS',
            priority: 'urgent',
            title: 'طلبك لم يُقبل',
            body:
              request.reviewerNotes ??
              'راجع سبب الرفض قبل تقديم طلب جديد أو اعتراض.',
            contextLabel: request.governancePath.wallet.entity.name,
            amount: this.toNumber(request.amount),
            cta: { label: 'عرض الطلب', href: '/disbursement-requests' },
          };
        }

        return {
          id: `disbursement-${request.id}`,
          kind: 'DISBURSEMENT_REQUEST_STATUS',
          priority: 'info',
          title:
            request.status === DisbursementRequestStatus.APPROVED
              ? 'طلبك معتمد وينتظر التنفيذ'
              : 'طلبك تحت المراجعة',
          body: `${request.spendingItem.name}: ${this.formatMoney(
            request.amount,
          )}.`,
          contextLabel: request.governancePath.wallet.entity.name,
          amount: this.toNumber(request.amount),
          cta: { label: 'متابعة الطلب', href: '/disbursement-requests' },
        };
      });
  }

  private buildVoteActions(
    personId: string,
    decisions: SurfaceDecision[],
    memberships: SurfaceMembership[],
  ) {
    return decisions
      .filter((decision) => decision.votes.length === 0)
      .filter((decision) => this.canVoteForDecision(personId, decision, memberships))
      .slice(0, 6)
      .map<SurfaceActionDto>((decision) => {
        const isCommitteeDecision =
          decision.votersScope === VotersScope.COMMITTEE;
        return {
          id: `vote-${decision.id}`,
          kind: isCommitteeDecision
            ? 'COMMITTEE_REVIEW_REQUIRED'
            : 'VOTE_REQUIRED',
          priority: 'normal',
          title: isCommitteeDecision
            ? 'رأي لجنة مطلوب'
            : 'يوجد قرار يحتاج صوتك',
          body: decision.title,
          contextLabel: decision.governancePath?.wallet.entity.name,
          dueDate: decision.closesAt.toISOString(),
          cta: {
            label: isCommitteeDecision ? 'صوّت باسم اللجنة' : 'صوّت',
            href: `/decisions#decision-${decision.id}`,
          },
          reason: isCommitteeDecision
            ? 'وصل لك لأنك عضو في اللجنة المرتبطة بهذا المسار، وليس لأنه قرار عام لكل الأعضاء.'
            : undefined,
          expectedAfterAction: isCommitteeDecision
            ? 'بعد التصويت سيعرف النظام ما بقي على اللجنة للوصول إلى النصاب.'
            : 'بعد التصويت سيُسجل صوتك ولا تحتاج متابعة يومية.',
        };
      });
  }

  private async buildOperatorExceptions(
    personId: string,
    memberships: SurfaceMembership[],
  ) {
    const founderEntityIds = this.entityIdsForRoles(memberships, FOUNDER_ROLES);
    const adminEntityIds = this.entityIdsForRoles(memberships, ADMIN_ROLES);
    const paymentMatchingEntityIds = this.entityIdsForRoles(
      memberships,
      PAYMENT_MATCHING_ROLES,
    );
    const disbursementReviewEntityIds = this.entityIdsForRoles(
      memberships,
      DISBURSEMENT_REVIEW_ROLES,
    );
    const disbursementExecutionEntityIds = this.entityIdsForRoles(
      memberships,
      DISBURSEMENT_EXECUTION_ROLES,
    );
    const oversightEntityIds = this.entityIdsForRoles(
      memberships,
      OVERSIGHT_ROLES,
    );
    const committeeIds = this.committeeIdsForMemberships(memberships);

    const [
      setupEntities,
      pendingPayments,
      pendingDisbursements,
      approvedDisbursements,
      membershipApplications,
      openDisputes,
      committeeVotes,
      trustRiskDecisions,
    ] = await Promise.all([
      founderEntityIds.length === 0
        ? Promise.resolve([])
        : this.prisma.entity.findMany({
            where: {
              id: { in: founderEntityIds },
            },
            select: {
              id: true,
              name: true,
              isActive: true,
              platformStatus: true,
              bankAccountNumber: true,
              bankName: true,
              _count: { select: { wallets: true, memberships: true } },
            },
          }),
      paymentMatchingEntityIds.length === 0
        ? Promise.resolve([])
        : this.prisma.paymentRecord.findMany({
            where: {
              status: PaymentRecordStatus.SUBMITTED,
              subscription: {
                membership: { entityId: { in: paymentMatchingEntityIds } },
              },
            },
            select: {
              id: true,
              amount: true,
              submittedAt: true,
              subscription: {
                select: {
                  membership: {
                    select: {
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
            orderBy: { submittedAt: 'desc' },
            take: 30,
          }),
      disbursementReviewEntityIds.length === 0
        ? Promise.resolve([])
        : this.prisma.disbursementRequest.findMany({
            where: {
              status: DisbursementRequestStatus.PENDING,
              governancePath: {
                wallet: { entityId: { in: disbursementReviewEntityIds } },
              },
            },
            select: {
              id: true,
              amount: true,
              beneficiaryName: true,
              spendingItem: { select: { name: true } },
              governancePath: {
                select: {
                  wallet: {
                    select: {
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
            orderBy: { requestedAt: 'desc' },
            take: 30,
          }),
      disbursementExecutionEntityIds.length === 0
        ? Promise.resolve([])
        : this.prisma.disbursementRequest.findMany({
            where: {
              status: DisbursementRequestStatus.APPROVED,
              governancePath: {
                wallet: { entityId: { in: disbursementExecutionEntityIds } },
              },
            },
            select: {
              id: true,
              amount: true,
              beneficiaryName: true,
              governancePath: {
                select: {
                  wallet: {
                    select: {
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
            orderBy: { reviewedAt: 'desc' },
            take: 30,
          }),
      adminEntityIds.length === 0
        ? Promise.resolve([])
        : this.prisma.membershipApplication.findMany({
            where: {
              entityId: { in: adminEntityIds },
              status: {
                in: [
                  MembershipApplicationStatus.PENDING,
                  MembershipApplicationStatus.UNDER_REVIEW,
                ],
              },
            },
            select: {
              id: true,
              requestedRole: true,
              submittedAt: true,
              entity: { select: { id: true, name: true } },
            },
            orderBy: { submittedAt: 'desc' },
            take: 30,
          }),
      oversightEntityIds.length === 0
        ? Promise.resolve([])
        : this.prisma.dispute.findMany({
            where: {
              entityId: { in: oversightEntityIds },
              status: {
                in: [
                  DisputeStatus.OPEN,
                  DisputeStatus.UNDER_MEDIATION,
                  DisputeStatus.ESCALATED,
                ],
              },
            },
            select: {
              id: true,
              title: true,
              status: true,
              deadline: true,
              entityId: true,
            },
            orderBy: { openedAt: 'desc' },
            take: 30,
          }),
      committeeIds.length === 0
        ? Promise.resolve([])
        : this.prisma.decision.findMany({
            where: {
              status: DecisionStatus.OPEN,
              votersScope: VotersScope.COMMITTEE,
              governancePath: {
                committeeId: { in: committeeIds },
              },
            },
            select: {
              id: true,
              title: true,
              closesAt: true,
              votes: { where: { personId }, select: { id: true } },
              governancePath: {
                select: {
                  wallet: {
                    select: {
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
            orderBy: { closesAt: 'asc' },
            take: 30,
          }),
      adminEntityIds.length === 0
        ? Promise.resolve([])
        : this.prisma.decision.findMany({
            where: {
              status: DecisionStatus.OPEN,
              decisionType: {
                in: [
                  DecisionType.MODIFY_GOVERNANCE,
                  DecisionType.TRANSFER_BALANCE,
                  DecisionType.CLOSE_WALLET,
                  DecisionType.FREEZE_WALLET,
                ],
              },
              governancePath: {
                wallet: { entityId: { in: adminEntityIds } },
              },
            },
            select: {
              id: true,
              title: true,
              decisionType: true,
              closesAt: true,
              governancePath: {
                select: {
                  wallet: {
                    select: {
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
            orderBy: { closesAt: 'asc' },
            take: 30,
          }),
    ]);

    const pendingPaymentItems = pendingPayments as Array<{
      amount: unknown;
      subscription: { membership: { entity: SurfaceEntityRef } };
    }>;
    const pendingDisbursementItems = pendingDisbursements as Array<{
      amount: unknown;
      governancePath: { wallet: { entity: SurfaceEntityRef } };
    }>;
    const approvedDisbursementItems = approvedDisbursements as Array<{
      amount: unknown;
      governancePath: { wallet: { entity: SurfaceEntityRef } };
    }>;
    const membershipApplicationItems = membershipApplications as Array<{
      entity: SurfaceEntityRef;
    }>;
    const openDisputeItems = openDisputes as Array<{
      entityId: string;
    }>;
    const committeeVoteItems = committeeVotes as Array<{
      title: string;
      votes: Array<{ id: string }>;
      governancePath: { wallet: { entity: SurfaceEntityRef } } | null;
    }>;
    const trustRiskDecisionItems = trustRiskDecisions as Array<{
      title: string;
      governancePath: { wallet: { entity: SurfaceEntityRef } } | null;
    }>;

    const exceptions: SurfaceExceptionDto[] = [
      ...this.buildEntityHealthExceptions(setupEntities),
    ];

    if (pendingPaymentItems.length > 0) {
      exceptions.push({
        id: 'pending-payments',
        kind: 'PAYMENT_MATCHING',
        ownerRole: 'TREASURER',
        severity: 'normal',
        title: `${this.formatNumber(pendingPaymentItems.length)} دفعة تنتظر تأكيد أمين الصندوق`,
        body: `المصدر: ${this.summarizeEntityAmounts(
          pendingPaymentItems,
          (record) => record.subscription.membership.entity,
          (record) => record.amount,
        )}.`,
        contextLabel: this.summarizeEntityCounts(
          pendingPaymentItems,
          (record) => record.subscription.membership.entity,
        ),
        impact:
          'اعتماد الدفعات يحدّث حالة المستحقات ويمنع ظهور متأخرات غير صحيحة للأعضاء.',
        whyShown: 'يظهر لك لأن دورك مسؤول عن الثقة المالية أو مطابقة الدفعات.',
        expectedAfterAction:
          'بعد المطابقة ستتحول الدفعات إلى مؤكدة أو ستظهر للعضو كمرفوضة مع سبب واضح.',
        cta: { label: 'طابق الدفعات', href: '/finance' },
      });
    }
    if (pendingDisbursementItems.length > 0) {
      exceptions.push({
        id: 'pending-disbursements',
        kind: 'DISBURSEMENT_REVIEW',
        ownerRole: 'ADMIN',
        severity: 'normal',
        title: `${this.formatNumber(pendingDisbursementItems.length)} طلب صرف يحتاج قرار مراجعة`,
        body: `موزعة على: ${this.summarizeEntityAmounts(
          pendingDisbursementItems,
          (request) => request.governancePath.wallet.entity,
          (request) => request.amount,
        )}.`,
        contextLabel: this.summarizeEntityCounts(
          pendingDisbursementItems,
          (request) => request.governancePath.wallet.entity,
        ),
        impact:
          'لن يصبح الصرف قابلاً للتنفيذ المالي حتى يرتبط بمراجعة وقرار واضحين.',
        whyShown: 'يظهر لك لأن دورك يسمح بمراجعة الطلبات قبل تحولها إلى التزام مالي.',
        expectedAfterAction:
          'بعد القرار سيعرف مقدم الطلب هل قُبل طلبه أو لماذا رُفض دون متابعة يدوية.',
        cta: { label: 'راجع الطلبات', href: '/review-center' },
      });
    }
    if (approvedDisbursementItems.length > 0) {
      exceptions.push({
        id: 'approved-disbursements',
        kind: 'DISBURSEMENT_EXECUTION',
        ownerRole: 'TREASURER',
        severity: 'urgent',
        title: `${this.formatNumber(approvedDisbursementItems.length)} صرف معتمد ينتظر التنفيذ المالي`,
        body: `إجمالي ظاهر: ${this.formatMoney(
          approvedDisbursementItems.reduce(
            (sum, request) => sum + this.toNumber(request.amount),
            0,
          ),
        )}.`,
        contextLabel: this.summarizeEntityCounts(
          approvedDisbursementItems,
          (request) => request.governancePath.wallet.entity,
        ),
        impact:
          'الرصيد لن يتغير حتى يتم التنفيذ، لذلك يبقى الطلب معلقاً أمام المستفيد.',
        whyShown: 'يظهر لك لأن القرار صدر، والمتبقي عمل مالي تنفيذي مضبوط.',
        expectedAfterAction:
          'بعد التنفيذ سيظهر الأثر المالي في السجل والرصيد بدلاً من بقاء الطلب عالقاً.',
        cta: { label: 'نفّذ الصرف', href: '/disbursement-requests' },
      });
    }
    if (membershipApplicationItems.length > 0) {
      exceptions.push({
        id: 'membership-applications',
        kind: 'MEMBERSHIP_REVIEW',
        ownerRole: 'ADMIN',
        severity: 'normal',
        title: `${this.formatNumber(membershipApplicationItems.length)} طلب انضمام ينتظر قرارك`,
        body: `السياق: ${this.summarizeEntityCounts(
          membershipApplicationItems,
          (application) => application.entity,
        )}.`,
        contextLabel: this.summarizeEntityCounts(
          membershipApplicationItems,
          (application) => application.entity,
        ),
        impact:
          'قبول الطلب يفتح للعضو حقوقه والتزاماته، ورفضه يجب أن يظهر بسبب مفهوم.',
        whyShown: 'يظهر لك لأن دورك إداري داخل الصندوق وليس لأنك تحتاج تصفح كل الأعضاء.',
        expectedAfterAction:
          'بعد القرار سيختفي من الاستثناءات ويعرف مقدم الطلب النتيجة مباشرة.',
        cta: { label: 'راجع الانضمام', href: '/review-center' },
      });
    }
    if (openDisputeItems.length > 0) {
      exceptions.push({
        id: 'open-disputes',
        kind: 'DISPUTE_ATTENTION',
        ownerRole: 'ADMIN',
        severity: 'urgent',
        title: `${this.formatNumber(openDisputeItems.length)} نزاع يحتاج متابعة`,
        body: `موزعة على: ${this.summarizeEntityCounts(
          openDisputeItems,
          (dispute) => this.entityRefForId(memberships, dispute.entityId),
        )}.`,
        contextLabel: this.summarizeEntityCounts(
          openDisputeItems,
          (dispute) => this.entityRefForId(memberships, dispute.entityId),
        ),
        impact:
          'ترك النزاع بلا متابعة يضعف الثقة ويجعل القرار أو الصرف محل اعتراض مستمر.',
        whyShown: 'يظهر لك لأنه استثناء ثقة يحتاج متابعة، لا لأنه سجل يومي عادي.',
        expectedAfterAction:
          'بعد التحديث يجب أن يظهر التسلسل واضحاً للعضو والمدقق دون مراسلات جانبية.',
        cta: { label: 'تابع النزاعات', href: '/disputes' },
      });
    }
    const pendingCommitteeVoteItems = committeeVoteItems.filter(
      (decision) => decision.votes.length === 0,
    );
    if (pendingCommitteeVoteItems.length > 0) {
      exceptions.push({
        id: 'committee-votes',
        kind: 'COMMITTEE_DECISION',
        ownerRole: 'COMMITTEE',
        severity: 'normal',
        title: `${this.formatNumber(
          pendingCommitteeVoteItems.length,
        )} قرار لجنة يحتاج رأيك`,
        body: `الأقرب انتهاءً: ${
          pendingCommitteeVoteItems[0]?.title ?? 'قرار لجنة'
        }.`,
        contextLabel: this.summarizeEntityCounts(
          pendingCommitteeVoteItems,
          (decision) => decision.governancePath?.wallet.entity,
        ),
        impact:
          'عدم التصويت قد يؤخر إغلاق القرار أو يمنع الوصول إلى النصاب المطلوب.',
        whyShown: 'يظهر لك فقط للقرارات المرتبطة بدورك في اللجنة.',
        expectedAfterAction:
          'بعد التصويت سيعرف النظام ما بقي للوصول إلى نتيجة القرار.',
        cta: { label: 'راجع قرارات اللجنة', href: '/decisions' },
      });
    }
    if (trustRiskDecisionItems.length > 0) {
      exceptions.push({
        id: 'trust-risk-decisions',
        kind: 'TRUST_RISK',
        ownerRole: 'ADMIN',
        severity: 'urgent',
        title: `${this.formatNumber(trustRiskDecisionItems.length)} قرار حساس يحتاج انتباه الإدارة`,
        body: `يشمل تغيير حوكمة أو نقل رصيد أو تجميد/إغلاق. الأقرب: ${
          trustRiskDecisionItems[0]?.title ?? 'قرار حساس'
        }.`,
        contextLabel: this.summarizeEntityCounts(
          trustRiskDecisionItems,
          (decision) => decision.governancePath?.wallet.entity,
        ),
        impact:
          'هذه القرارات تغير الثقة أو حركة المال، لذلك لا يجب أن تضيع وسط قرارات عادية.',
        whyShown: 'يظهر لك لأن دورك إداري في صندوق يتأثر بهذا القرار.',
        expectedAfterAction:
          'بعد التصويت أو الإغلاق سيظهر الأثر في القرار والسجل بدل أن يبقى غامضاً.',
        cta: { label: 'راجع القرار', href: '/decisions' },
      });
    }

    return exceptions
      .sort((a, b) => this.priorityRank(a.severity) - this.priorityRank(b.severity))
      .slice(0, 8);
  }

  private async buildCommitteeSummary(
    personId: string,
    memberships: SurfaceMembership[],
    now: Date,
  ): Promise<CommitteeSurfaceSummaryDto> {
    const committeeIds = this.committeeIdsForMemberships(memberships);

    if (committeeIds.length === 0) {
      return {
        isVisible: false,
        committeeCount: 0,
        pendingVoteCount: 0,
        alreadyVotedCount: 0,
        displayText: 'لا توجد مسؤولية لجنة ظاهرة لهذا الحساب.',
        decisions: [],
      };
    }

    const decisions = (await this.prisma.decision.findMany({
      where: {
        status: DecisionStatus.OPEN,
        votersScope: VotersScope.COMMITTEE,
        closesAt: { gte: now },
        governancePath: {
          committeeId: { in: committeeIds },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        decisionType: true,
        amount: true,
        quorumPercent: true,
        approvalPercent: true,
        closesAt: true,
        votes: {
          select: {
            personId: true,
            choice: true,
            notes: true,
            votedAt: true,
          },
          orderBy: { votedAt: 'desc' },
        },
        _count: { select: { votes: true } },
        governancePath: {
          select: {
            id: true,
            name: true,
            committeeId: true,
            committee: {
              select: {
                id: true,
                name: true,
                _count: { select: { members: true } },
              },
            },
            wallet: {
              select: {
                name: true,
                entity: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { closesAt: 'asc' },
      take: 20,
    })) as CommitteeDecisionItem[];

    const decisionItems = decisions.map((decision) => {
      const userVote = decision.votes.find((vote) => vote.personId === personId);
      const eligibleVoterCount =
        decision.governancePath?.committee?._count.members ?? 0;
      const quorumNeeded = Math.ceil(
        (eligibleVoterCount * decision.quorumPercent) / 100,
      );
      const remainingForQuorum = Math.max(
        0,
        quorumNeeded - decision._count.votes,
      );
      const committeeName =
        decision.governancePath?.committee?.name ?? 'اللجنة المختصة';
      const contextLabel =
        decision.governancePath?.wallet.entity.name ?? 'سياق غير محدد';
      const pathName = decision.governancePath?.name;
      const decisionTypeLabel = this.decisionTypeLabel(decision.decisionType);
      const amount = this.toNumber(decision.amount);
      const amountText = amount > 0 ? ` بقيمة ${this.formatMoney(amount)}` : '';
      const hasVoted = Boolean(userVote);
      const title = hasVoted
        ? `تم تسجيل رأيك: ${decision.title}`
        : `رأي لجنة مطلوب: ${decision.title}`;

      return {
        id: decision.id,
        title,
        body:
          decision.description ??
          `${decisionTypeLabel}${amountText}. يحتاج القرار رأي اللجنة قبل إغلاقه.`,
        contextLabel,
        committeeName,
        pathName,
        decisionTypeLabel,
        priority: hasVoted ? ('info' as const) : ('normal' as const),
        closesAt: decision.closesAt.toISOString(),
        hasVoted,
        voteChoice: userVote?.choice,
        voteCount: decision._count.votes,
        eligibleVoterCount,
        remainingForQuorum,
        whyShown: `وصل لك لأنه مرتبط بـ ${committeeName}${
          pathName ? ` في ${pathName}` : ''
        } ضمن ${contextLabel}.`,
        expectedAfterVote: hasVoted
          ? remainingForQuorum > 0
            ? `صوتك محفوظ. يتبقى ${this.formatNumber(
                remainingForQuorum,
              )} صوت للوصول إلى النصاب.`
            : 'صوتك محفوظ. النصاب مكتمل أو بانتظار إغلاق القرار حسب القواعد.'
          : remainingForQuorum > 1
            ? `بعد تصويتك يتبقى ${this.formatNumber(
                remainingForQuorum - 1,
              )} صوت تقريباً للوصول إلى النصاب.`
            : 'بعد تصويتك قد يكتمل النصاب أو ينتظر النظام إغلاق القرار حسب القواعد.',
        cta: {
          label: hasVoted ? 'راجع القرار' : 'صوّت الآن',
          href: `/decisions#decision-${decision.id}`,
        },
      };
    });

    const pendingVoteCount = decisionItems.filter((item) => !item.hasVoted).length;
    const alreadyVotedCount = decisionItems.filter((item) => item.hasVoted).length;
    const displayText =
      pendingVoteCount > 0
        ? `يوجد ${this.formatNumber(
            pendingVoteCount,
          )} قرار لجنة ينتظر رأيك ضمن ${this.formatNumber(
            committeeIds.length,
          )} لجنة.`
        : alreadyVotedCount > 0
          ? 'لا يوجد تصويت لجنة مطلوب منك الآن. تظهر لك قرارات صوّت عليها للمتابعة فقط.'
          : 'لا يوجد عمل لجنة مطلوب منك الآن.';

    return {
      isVisible: true,
      committeeCount: committeeIds.length,
      pendingVoteCount,
      alreadyVotedCount,
      displayText,
      decisions: decisionItems
        .sort((a, b) => {
          if (a.hasVoted !== b.hasVoted) return a.hasVoted ? 1 : -1;
          return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime();
        })
        .slice(0, 6),
    };
  }

  private async buildAuditorSummary(
    memberships: SurfaceMembership[],
  ): Promise<AuditorSurfaceSummaryDto> {
    const auditorEntityIds = [
      ...new Set(this.entityIdsForRoles(memberships, [MemberRole.AUDITOR])),
    ];

    if (auditorEntityIds.length === 0) {
      return {
        isVisible: false,
        entityCount: 0,
        eventCount: 0,
        highRiskCount: 0,
        financeEventCount: 0,
        governanceEventCount: 0,
        membershipEventCount: 0,
        displayText: 'لا توجد مسؤولية تدقيق ظاهرة لهذا الحساب.',
        timeline: [],
        cta: { label: 'فتح سجل المراجعة', href: '/auditor?tab=auditLogs' },
      };
    }

    const logs = (await this.prisma.auditLog.findMany({
      where: { entityId: { in: auditorEntityIds } },
      include: {
        person: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })) as AuditSurfaceLogItem[];

    const timeline = logs
      .map((log) => this.presentAuditorSurfaceEvent(log))
      .sort((a, b) => {
        const priorityDiff =
          this.priorityRank(a.severity) - this.priorityRank(b.severity);
        if (priorityDiff !== 0) return priorityDiff;
        return (
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        );
      });
    const highRiskCount = timeline.filter((event) =>
      ['critical', 'urgent'].includes(event.severity),
    ).length;
    const financeEventCount = timeline.filter(
      (event) => event.category === 'FINANCE',
    ).length;
    const governanceEventCount = timeline.filter(
      (event) => event.category === 'GOVERNANCE',
    ).length;
    const membershipEventCount = timeline.filter(
      (event) => event.category === 'MEMBERSHIP',
    ).length;

    return {
      isVisible: true,
      entityCount: auditorEntityIds.length,
      eventCount: logs.length,
      highRiskCount,
      financeEventCount,
      governanceEventCount,
      membershipEventCount,
      displayText:
        logs.length === 0
          ? `لا توجد أحداث تدقيق جديدة ضمن ${this.formatNumber(
              auditorEntityIds.length,
            )} صندوق.`
          : highRiskCount > 0
            ? `يوجد ${this.formatNumber(
                highRiskCount,
              )} حدث رقابي مهم ضمن ${this.formatNumber(
                auditorEntityIds.length,
              )} صندوق.`
            : `آخر ${this.formatNumber(
                Math.min(logs.length, 7),
              )} أحداث رقابية جاهزة للمراجعة. لا توجد مخاطر عالية الآن.`,
      timeline: timeline.slice(0, 7),
      cta: { label: 'افتح سجل المراجعة الكامل', href: '/auditor?tab=auditLogs' },
    };
  }

  private async buildFinanceSummary(
    memberships: SurfaceMembership[],
  ): Promise<FinanceSurfaceSummaryDto> {
    const financeEntityIds = [
      ...new Set(this.entityIdsForRoles(memberships, PAYMENT_MATCHING_ROLES)),
    ];

    if (financeEntityIds.length === 0) {
      return {
        isVisible: false,
        entityCount: 0,
        pendingPaymentCount: 0,
        pendingPaymentAmount: 0,
        overdueDueCount: 0,
        overdueDueAmount: 0,
        rejectedPaymentCount: 0,
        rejectedPaymentAmount: 0,
        approvedDisbursementCount: 0,
        approvedDisbursementAmount: 0,
        blockedDisbursementCount: 0,
        blockedDisbursementAmount: 0,
        availableBalance: 0,
        displayText: 'لا توجد مسؤولية مالية ظاهرة لهذا الحساب.',
        insights: [],
      };
    }

    const [
      pendingPayments,
      overdueDues,
      rejectedPayments,
      approvedDisbursements,
      pathBalances,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where: {
          status: PaymentRecordStatus.SUBMITTED,
          subscription: {
            membership: { entityId: { in: financeEntityIds } },
          },
        },
        select: {
          id: true,
          amount: true,
          subscription: {
            select: {
              membership: {
                select: {
                  entity: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        take: 50,
      }),
      this.prisma.paymentDue.findMany({
        where: {
          status: PaymentDueStatus.OVERDUE,
          subscription: {
            membership: { entityId: { in: financeEntityIds } },
          },
        },
        select: {
          id: true,
          amountDue: true,
          subscription: {
            select: {
              governancePath: {
                select: {
                  name: true,
                  wallet: {
                    select: {
                      name: true,
                      entity: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      this.prisma.paymentRecord.findMany({
        where: {
          status: PaymentRecordStatus.REJECTED,
          subscription: {
            membership: { entityId: { in: financeEntityIds } },
          },
        },
        select: {
          id: true,
          amount: true,
          reviewerNotes: true,
          subscription: {
            select: {
              membership: {
                select: {
                  entity: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 30,
      }),
      this.prisma.disbursementRequest.findMany({
        where: {
          status: DisbursementRequestStatus.APPROVED,
          governancePath: {
            wallet: { entityId: { in: financeEntityIds } },
          },
        },
        select: {
          id: true,
          amount: true,
          beneficiaryName: true,
          governancePath: {
            select: {
              name: true,
              ledgerAccount: { select: { balance: true } },
              wallet: {
                select: {
                  name: true,
                  entity: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 50,
      }),
      this.prisma.governancePath.findMany({
        where: { wallet: { entityId: { in: financeEntityIds } } },
        select: {
          name: true,
          ledgerAccount: { select: { balance: true } },
          wallet: {
            select: {
              name: true,
              entity: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 80,
      }),
      this.prisma.ledgerTransaction.findMany({
        where: {
          OR: [
            { sourceEntityId: { in: financeEntityIds } },
            { originEntityId: { in: financeEntityIds } },
          ],
        },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          reference: true,
          decisionId: true,
          sourceEntityId: true,
          originEntityId: true,
          originNote: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const pendingPaymentItems =
      pendingPayments as FinancePaymentRecordItem[];
    const overdueDueItems = overdueDues as FinancePaymentDueItem[];
    const rejectedPaymentItems =
      rejectedPayments as FinancePaymentRecordItem[];
    const approvedDisbursementItems =
      approvedDisbursements as FinanceDisbursementItem[];
    const pathBalanceItems = pathBalances as FinancePathBalanceItem[];
    const recentTransactionItems =
      recentTransactions as FinanceLedgerTransactionItem[];

    const pendingPaymentAmount = pendingPaymentItems.reduce(
      (sum, record) => sum + this.toNumber(record.amount),
      0,
    );
    const overdueDueAmount = overdueDueItems.reduce(
      (sum, due) => sum + this.toNumber(due.amountDue),
      0,
    );
    const rejectedPaymentAmount = rejectedPaymentItems.reduce(
      (sum, record) => sum + this.toNumber(record.amount),
      0,
    );
    const approvedDisbursementAmount = approvedDisbursementItems.reduce(
      (sum, request) => sum + this.toNumber(request.amount),
      0,
    );
    const blockedDisbursementItems = approvedDisbursementItems.filter(
      (request) =>
        this.toNumber(request.governancePath.ledgerAccount?.balance) <
        this.toNumber(request.amount),
    );
    const blockedDisbursementAmount = blockedDisbursementItems.reduce(
      (sum, request) => sum + this.toNumber(request.amount),
      0,
    );
    const availableBalance = pathBalanceItems.reduce(
      (sum, path) => sum + this.toNumber(path.ledgerAccount?.balance),
      0,
    );

    const insights: FinanceSurfaceSummaryDto['insights'] = [];

    if (pendingPaymentItems.length > 0) {
      insights.push({
        id: 'finance-pending-payments',
        title: 'دفعات تنتظر المطابقة',
        body: `يوجد ${this.formatNumber(
          pendingPaymentItems.length,
        )} إثبات سداد. اعتمادها يحدّث حالة المستحقات ويوقف ظهور متأخرات غير صحيحة.`,
        severity: 'normal',
        contextLabel: this.summarizeEntityAmounts(
          pendingPaymentItems,
          (record) => record.subscription.membership.entity,
          (record) => record.amount,
        ),
        amount: pendingPaymentAmount,
        cta: { label: 'طابق الدفعات', href: '/finance' },
      });
    }

    if (overdueDueItems.length > 0) {
      insights.push({
        id: 'finance-overdue-dues',
        title: 'متأخرات تحتاج متابعة مالية',
        body: `يوجد ${this.formatNumber(
          overdueDueItems.length,
        )} مستحق متأخر. النظام يعرضها لك كمتابعة مالية، وليس كقائمة أعضاء خام.`,
        severity: 'urgent',
        contextLabel: this.summarizeEntityAmounts(
          overdueDueItems,
          (due) => due.subscription.governancePath.wallet.entity,
          (due) => due.amountDue,
        ),
        amount: overdueDueAmount,
        cta: { label: 'راجع المتأخرات', href: '/finance' },
      });
    }

    if (rejectedPaymentItems.length > 0) {
      insights.push({
        id: 'finance-rejected-payments',
        title: 'دفعات مرفوضة تحتاج سبباً واضحاً للعضو',
        body:
          'رفض الدفع لا يكفي وحده. يجب أن يرى العضو سبباً مفهوماً وما الخطوة التالية لتصحيح السداد.',
        severity: 'normal',
        contextLabel: this.summarizeEntityAmounts(
          rejectedPaymentItems,
          (record) => record.subscription.membership.entity,
          (record) => record.amount,
        ),
        amount: rejectedPaymentAmount,
        cta: { label: 'راجع أسباب الرفض', href: '/finance' },
      });
    }

    if (approvedDisbursementItems.length > 0) {
      insights.push({
        id: 'finance-approved-disbursements',
        title: 'صرف معتمد ينتظر التنفيذ',
        body:
          blockedDisbursementItems.length > 0
            ? 'بعض الصرف المعتمد لا يمكن تنفيذه لأن رصيد المسار لا يكفي. النظام يفصل بين القرار الصحيح والقدرة المالية.'
            : 'هذه الطلبات لديها قرار صرف صالح، والمتبقي تنفيذ مالي مضبوط يظهر أثره على الرصيد.',
        severity: blockedDisbursementItems.length > 0 ? 'urgent' : 'normal',
        contextLabel: this.summarizeEntityAmounts(
          approvedDisbursementItems,
          (request) => request.governancePath.wallet.entity,
          (request) => request.amount,
        ),
        amount: approvedDisbursementAmount,
        cta: { label: 'نفّذ الصرف', href: '/disbursement-requests' },
      });
    }

    if (blockedDisbursementItems.length > 0) {
      insights.push({
        id: 'finance-blocked-disbursements',
        title: 'رصيد غير كافٍ يمنع التنفيذ',
        body:
          'لا يعرض النظام هذا الصرف كجاهز نهائياً؛ يجب رفع الرصيد أو تعديل القرار قبل التنفيذ حتى لا تتغير الأرصدة بشكل مضلل.',
        severity: 'critical',
        contextLabel: this.summarizeEntityAmounts(
          blockedDisbursementItems,
          (request) => request.governancePath.wallet.entity,
          (request) => request.amount,
        ),
        amount: blockedDisbursementAmount,
        cta: { label: 'راجع السبب المالي', href: '/disbursement-requests' },
      });
    }

    insights.push({
      id: 'finance-available-balance',
      title: 'الرصيد المتاح في نطاق مسؤوليتك',
      body:
        availableBalance > 0
          ? 'هذا مجموع أرصدة المسارات التي تقع ضمن دورك المالي. التفاصيل العميقة تبقى في أداة المالية عند الحاجة.'
          : 'لا يوجد رصيد متاح ظاهر في المسارات التي تديرها مالياً.',
      severity: 'info',
      amount: availableBalance,
      cta: { label: 'افتح التقرير المالي', href: '/finance' },
    });

    for (const transaction of recentTransactionItems.slice(0, 3)) {
      const entityRef = this.entityRefForId(
        memberships,
        transaction.originEntityId ?? transaction.sourceEntityId ?? '',
      );
      insights.push({
        id: `finance-transaction-${transaction.id}`,
        title: `لماذا تغير الرصيد؟ ${this.ledgerTransactionTypeLabel(
          transaction.type,
        )}`,
        body: `${this.simplifySurfaceText(
          transaction.description,
        )} بتاريخ ${this.formatDate(transaction.createdAt)}.`,
        severity: 'info',
        contextLabel: entityRef?.name,
        amount: this.toNumber(transaction.amount),
        cta: transaction.decisionId
          ? { label: 'راجع القرار المرتبط', href: '/decisions' }
          : undefined,
      });
    }

    const actionableCount =
      pendingPaymentItems.length +
      overdueDueItems.length +
      rejectedPaymentItems.length +
      approvedDisbursementItems.length;
    const displayText =
      actionableCount > 0
        ? `يوجد ${this.formatNumber(
            actionableCount,
          )} بند مالي يحتاج متابعة ضمن ${this.formatNumber(
            financeEntityIds.length,
          )} صندوق.`
        : 'لا توجد معالجة مالية عاجلة الآن. تظهر لك آخر أسباب تغيّر الرصيد فقط.';

    return {
      isVisible: true,
      entityCount: financeEntityIds.length,
      pendingPaymentCount: pendingPaymentItems.length,
      pendingPaymentAmount,
      overdueDueCount: overdueDueItems.length,
      overdueDueAmount,
      rejectedPaymentCount: rejectedPaymentItems.length,
      rejectedPaymentAmount,
      approvedDisbursementCount: approvedDisbursementItems.length,
      approvedDisbursementAmount,
      blockedDisbursementCount: blockedDisbursementItems.length,
      blockedDisbursementAmount,
      availableBalance,
      displayText,
      insights: insights.slice(0, 8),
    };
  }

  private buildEntityHealthExceptions(
    entities: Array<{
      id: string;
      name: string;
      isActive: boolean;
      platformStatus: EntityPlatformStatus;
      bankAccountNumber: string | null;
      bankName: string | null;
      _count: { wallets: number; memberships: number };
    }>,
  ): SurfaceExceptionDto[] {
    const exceptions: SurfaceExceptionDto[] = [];

    for (const entity of entities) {
      if (!entity.isActive) {
        exceptions.push({
          id: `entity-inactive-${entity.id}`,
          kind: 'ENTITY_HEALTH',
          ownerRole: 'FOUNDER',
          severity: 'critical',
          title: `${entity.name} غير نشط`,
          body:
            'لا يمكن اعتباره صندوقاً تشغيلياً حتى يعود نشطاً أو يكتمل إغلاقه.',
          contextLabel: entity.name,
          impact:
            'الأعضاء قد يرون حالة غير واضحة إذا بقي الصندوق غير نشط دون قرار نهائي.',
          whyShown: 'يظهر لك لأنك مؤسس هذا الصندوق ومسؤول عن حالته الأساسية.',
          expectedAfterAction:
            'بعد التفعيل أو الإغلاق سيختفي كاستثناء من سطح العمل.',
          cta: { label: 'راجع الصندوق', href: `/entities/${entity.id}` },
        });
      }

      if (entity.platformStatus === EntityPlatformStatus.SUSPENDED) {
        exceptions.push({
          id: `entity-platform-suspended-${entity.id}`,
          kind: 'ENTITY_HEALTH',
          ownerRole: 'FOUNDER',
          severity: 'critical',
          title: `${entity.name} موقوف على مستوى المنصة`,
          body:
            'النظام يخفي الإجراءات اليومية للأعضاء حتى لا يجربوا عمليات ستُمنع لاحقاً.',
          contextLabel: entity.name,
          impact:
            'لن تعمل قرارات أو مدفوعات جديدة بشكل طبيعي حتى تعالج حالة الإيقاف.',
          whyShown: 'يظهر لك لأنك المؤسس الأقرب لمعالجة حالة الصندوق مع المنصة.',
          expectedAfterAction:
            'بعد رفع التعليق ستعود الإجراءات المناسبة للظهور حسب كل دور.',
          cta: { label: 'راجع الحالة', href: `/entities/${entity.id}` },
        });
      } else if (entity.platformStatus === EntityPlatformStatus.READ_ONLY) {
        exceptions.push({
          id: `entity-platform-readonly-${entity.id}`,
          kind: 'ENTITY_HEALTH',
          ownerRole: 'FOUNDER',
          severity: 'urgent',
          title: `${entity.name} في وضع المتابعة فقط`,
          body:
            'الأعضاء يستطيعون رؤية حالتهم، لكن النظام لا يفتح إجراءات تشغيلية جديدة.',
          contextLabel: entity.name,
          impact:
            'أي عملية تشغيلية جديدة ستبدو غائبة عمداً حتى تتغير حالة الصندوق.',
          whyShown: 'يظهر لك لأنك مؤسس الصندوق ومسؤول عن قرار التشغيل أو التجميد.',
          expectedAfterAction:
            'بعد تغيير الحالة سيعرض النظام الإجراءات المناسبة تلقائياً.',
          cta: { label: 'راجع الإعداد', href: `/entities/${entity.id}` },
        });
      } else if (entity.platformStatus === EntityPlatformStatus.PENDING_REVIEW) {
        exceptions.push({
          id: `entity-platform-pending-${entity.id}`,
          kind: 'ENTITY_HEALTH',
          ownerRole: 'FOUNDER',
          severity: 'normal',
          title: `${entity.name} قيد مراجعة المنصة`,
          body:
            'ليس على الأعضاء فهم السبب؛ يظهر لهم ما يمكن متابعته فقط حتى تنتهي المراجعة.',
          contextLabel: entity.name,
          impact:
            'بعض الإجراءات قد تبقى مخفية أو محدودة حتى تكتمل مراجعة المنصة.',
          whyShown: 'يظهر لك لأنك مؤسس الصندوق وتحتاج معرفة سبب القيود العامة.',
          expectedAfterAction:
            'بعد انتهاء المراجعة ستتحول الحالة إلى تشغيل أو متابعة فقط بوضوح.',
          cta: { label: 'راجع المتطلبات', href: `/entities/${entity.id}` },
        });
      }

      if (entity._count.wallets === 0) {
        exceptions.push({
          id: `entity-no-wallets-${entity.id}`,
          kind: 'SETUP_BLOCKER',
          ownerRole: 'FOUNDER',
          severity: 'critical',
          title: `${entity.name} بلا محفظة تشغيلية`,
          body:
            'لا يستطيع النظام اشتقاق ما يدفعه العضو أو ما يستفيد منه دون محفظة واحدة على الأقل.',
          contextLabel: entity.name,
          impact:
            'سيبدو الصندوق كواجهة فارغة، لأن علاقة العضو بالمال والحقوق لم تبدأ بعد.',
          whyShown: 'يظهر لك لأن إنشاء المحافظ جزء تأسيسي لا يجب رميه على العضو.',
          expectedAfterAction:
            'بعد إنشاء محفظة ومسار سيبدأ النظام بعرض المطلوب والفائدة للأعضاء.',
          cta: { label: 'أكمل الإعداد', href: `/entities/${entity.id}/settings` },
        });
      }

      if (!entity.bankAccountNumber || !entity.bankName) {
        exceptions.push({
          id: `entity-bank-missing-${entity.id}`,
          kind: 'SETUP_BLOCKER',
          ownerRole: 'FOUNDER',
          severity: 'normal',
          title: `${entity.name}: بيانات التحويل ناقصة`,
          body:
            'يمكن متابعة الصندوق، لكن تجربة الدفع والمطابقة ستبقى أقل وضوحاً للأعضاء وأمين الصندوق.',
          contextLabel: entity.name,
          impact:
            'قد يضطر المستخدمون للسؤال خارج النظام عن طريقة الدفع، وهذا يعيدنا للعمل اليدوي.',
          whyShown: 'يظهر لك لأن المؤسس يجب أن يزيل هذا الاحتكاك قبل التوسع.',
          expectedAfterAction:
            'بعد إكمال البيانات ستصبح تعليمات الدفع أوضح في واجهات العضو والمالية.',
          cta: { label: 'أكمل بيانات الدفع', href: `/entities/${entity.id}/settings` },
        });
      }

      if (entity._count.memberships <= 1) {
        exceptions.push({
          id: `entity-low-members-${entity.id}`,
          kind: 'SETUP_BLOCKER',
          ownerRole: 'FOUNDER',
          severity: 'info',
          title: `${entity.name} لم يبدأ كصندوق جماعي بعد`,
          body:
            'يوجد مؤسس فقط أو عدد قليل جداً؛ لا تظهر تجربة تشغيلية حقيقية قبل دعوة أعضاء.',
          contextLabel: entity.name,
          impact:
            'المدفوعات والتصويت والاستفادة لن تعكس واقع صندوق جماعي حتى توجد عضويات فعلية.',
          whyShown: 'يظهر لك لأن النظام يحاول دفعك للخطوة التالية بدلاً من عرض صفحات فارغة.',
          expectedAfterAction:
            'بعد إضافة أعضاء سيبدأ السطح بعرض الالتزامات والقرارات بحسب أدوارهم.',
          cta: { label: 'ادع الأعضاء', href: `/entities/${entity.id}/members` },
        });
      }
    }

    return exceptions;
  }

  private summarizeEntityCounts<T>(
    items: T[],
    getEntity: (item: T) => SurfaceEntityRef | null | undefined,
  ) {
    const groups = this.groupByEntity(items, getEntity);
    if (groups.length === 0) return 'لا يوجد سياق محدد';

    const visible = groups.slice(0, 3);
    const summary = visible
      .map((group) => `${group.name}: ${this.formatNumber(group.count)}`)
      .join('، ');
    const remaining = groups.length - visible.length;
    return remaining > 0 ? `${summary}، و${this.formatNumber(remaining)} أخرى` : summary;
  }

  private summarizeEntityAmounts<T>(
    items: T[],
    getEntity: (item: T) => SurfaceEntityRef | null | undefined,
    getAmount: (item: T) => unknown,
  ) {
    const groups = this.groupByEntity(items, getEntity).map((group) => {
      const amount = group.items.reduce(
        (sum, item) => sum + this.toNumber(getAmount(item)),
        0,
      );
      return { ...group, amount };
    });
    if (groups.length === 0) return 'لا يوجد سياق محدد';

    const visible = groups.slice(0, 3);
    const summary = visible
      .map((group) => `${group.name}: ${this.formatMoney(group.amount)}`)
      .join('، ');
    const remaining = groups.length - visible.length;
    return remaining > 0 ? `${summary}، و${this.formatNumber(remaining)} أخرى` : summary;
  }

  private groupByEntity<T>(
    items: T[],
    getEntity: (item: T) => SurfaceEntityRef | null | undefined,
  ) {
    const groups = new Map<
      string,
      { id: string; name: string; count: number; items: T[] }
    >();

    for (const item of items) {
      const entity = getEntity(item);
      if (!entity) continue;
      const existing = groups.get(entity.id);
      if (existing) {
        existing.count += 1;
        existing.items.push(item);
      } else {
        groups.set(entity.id, {
          id: entity.id,
          name: entity.name,
          count: 1,
          items: [item],
        });
      }
    }

    return [...groups.values()].sort((a, b) => b.count - a.count);
  }

  private buildMoneySummary(
    dues: SurfacePaymentDue[],
    records: SurfacePaymentRecord[],
  ): MoneySurfaceSummaryDto {
    const dueNow = dues
      .filter((due) => due.status === PaymentDueStatus.PENDING)
      .reduce((sum, due) => sum + this.toNumber(due.amountDue), 0);
    const overdue = dues
      .filter((due) => due.status === PaymentDueStatus.OVERDUE)
      .reduce((sum, due) => sum + this.toNumber(due.amountDue), 0);
    const pendingProofs = records.filter((record) =>
      PENDING_PAYMENT_PROOF_STATUSES.includes(record.status),
    ).length;
    const rejectedProofs = records.filter(
      (record) => record.status === PaymentRecordStatus.REJECTED,
    ).length;

    let displayText = 'لا توجد مستحقات ظاهرة الآن.';
    if (overdue > 0) displayText = `لديك متأخرات ${this.formatMoney(overdue)}.`;
    else if (dueNow > 0) displayText = `عليك ${this.formatMoney(dueNow)} الآن.`;
    else if (pendingProofs > 0)
      displayText = 'دفعتك وصلت وتنتظر تأكيد أمين الصندوق.';

    return {
      dueNow,
      overdue,
      paidThisPeriod: 0,
      pendingProofs,
      rejectedProofs,
      displayText,
    };
  }

  private buildBenefitSummary(
    memberships: SurfaceMembership[],
  ): BenefitSurfaceSummaryDto {
    const items: BenefitSurfaceSummaryDto['items'] = [];
    for (const membership of memberships) {
      for (const subscription of membership.subscriptions) {
        const walletName = this.cleanDisplayName(
          subscription.governancePath.wallet.name,
        );
        const contextLabel = subscription.governancePath.wallet.entity.name;
        if (membership.entity.platformStatus === EntityPlatformStatus.READ_ONLY) {
          items.push({
            id: `subscription-${subscription.id}`,
            title: `${walletName} للمتابعة فقط`,
            state: 'READ_ONLY',
            body: membership.entity.isCampaign
              ? 'هذه الحملة قراءة فقط الآن؛ يمكنك متابعة الحالة دون إنشاء طلب جديد.'
              : 'هذا الصندوق للقراءة فقط حالياً، لذلك لا تظهر إجراءات جديدة.',
            contextLabel,
          });
        } else if (subscription.state === SubscriptionState.ACTIVE) {
          items.push({
            id: `subscription-${subscription.id}`,
            title: `تستفيد من ${walletName}`,
            state: 'AVAILABLE',
            body: subscription.agreedAmount
              ? `مساهمتك المعتادة ${this.formatMoney(
                  subscription.agreedAmount,
                )}.`
              : 'لا يوجد مبلغ ثابت ظاهر عليك الآن.',
            contextLabel,
          });
        } else if (subscription.state === SubscriptionState.SUPPORTER_ONLY) {
          items.push({
            id: `subscription-${subscription.id}`,
            title: `أنت داعم في ${walletName}`,
            state: 'SUPPORT_ONLY',
            body: 'تساهم في الدعم، ولا يظهر لك حق طلب استفادة من هذا البند.',
            contextLabel,
          });
        } else if (subscription.state === SubscriptionState.CONDITIONAL) {
          items.push({
            id: `subscription-${subscription.id}`,
            title: `${walletName} بانتظار اكتمال شرط`,
            state: 'CONDITIONAL',
            body: 'لن يطلب منك النظام تفاصيل إضافية إلا إذا كان هناك إجراء واضح.',
            contextLabel,
          });
        } else if (subscription.state === SubscriptionState.SUSPENDED) {
          items.push({
            id: `subscription-${subscription.id}`,
            title: `${walletName} معلّقة`,
            state: 'SUSPENDED',
            body: 'تحتاج معالجة السبب قبل ظهور الاستفادة كمتاحة.',
            contextLabel,
          });
        } else if (subscription.state === SubscriptionState.EXITED) {
          items.push({
            id: `subscription-${subscription.id}`,
            title: `خرجت من ${walletName}`,
            state: 'EXITED',
            body:
              'يعرض النظام الملخص التاريخي فقط، ولا يفتح طلبات أو تصويتاً جديداً.',
            contextLabel,
          });
        }
      }
    }

    return {
      title: items.length > 0 ? 'استفادتك' : 'استفادتك',
      items: items.slice(0, 8),
    };
  }

  private async buildSharedBenefitSummary(
    personId: string,
    memberships: SurfaceMembership[],
  ): Promise<SharedBenefitSurfaceSummaryDto> {
    const operationalMemberships = memberships.filter(
      (membership) =>
        membership.isActive &&
        membership.entity.isActive &&
        membership.entity.platformStatus === EntityPlatformStatus.ACTIVE,
    );
    const entityIds = [...new Set(operationalMemberships.map((item) => item.entityId))];

    if (entityIds.length === 0) {
      return this.emptySharedBenefitSummary();
    }

    const wallets = await this.prisma.wallet.findMany({
      where: {
        entityId: { in: entityIds },
        benefitType: WalletBenefitType.SHARED,
        isActive: true,
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            memberships: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
        governancePaths: {
          where: { isActive: true },
          include: {
            subscriptions: {
              include: {
                membership: {
                  select: {
                    personId: true,
                    role: true,
                    isActive: true,
                  },
                },
                paymentDues: {
                  where: {
                    status: {
                      in: [PaymentDueStatus.PENDING, PaymentDueStatus.OVERDUE],
                    },
                  },
                  select: {
                    status: true,
                    amountDue: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ entity: { name: 'asc' } }, { name: 'asc' }],
      take: 8,
    });

    const items = wallets.map<SharedBenefitSurfaceSummaryDto['items'][number]>(
      (wallet) => {
        const membership = operationalMemberships.find(
          (item) => item.entityId === wallet.entityId,
        );
        const supportingStates: readonly SubscriptionState[] = [
          SubscriptionState.ACTIVE,
          SubscriptionState.SUPPORTER_ONLY,
        ];
        const billableStates: readonly SubscriptionState[] = [
          SubscriptionState.ACTIVE,
          SubscriptionState.SUPPORTER_ONLY,
          SubscriptionState.SUSPENDED,
          SubscriptionState.CONDITIONAL,
        ];
        const managerRoles: readonly MemberRole[] = [
          MemberRole.FOUNDER,
          MemberRole.ADMIN,
          MemberRole.TREASURER,
          MemberRole.AUDITOR,
        ];
        const subscriptions = wallet.governancePaths.flatMap((path) =>
          path.subscriptions.filter(
            (subscription) => subscription.membership.isActive,
          ),
        );
        const userSubscription = subscriptions.find(
          (subscription) => subscription.membership.personId === personId,
        );
        const activeSupporterCount = subscriptions.filter((subscription) =>
          supportingStates.includes(subscription.state),
        ).length;
        const billableSubscriptions = subscriptions.filter((subscription) =>
          billableStates.includes(subscription.state),
        );
        const expectedMonthlySupport = billableSubscriptions.reduce(
          (sum, subscription) =>
            sum + this.toNumber(subscription.agreedAmount),
          0,
        );
        const dues = subscriptions.flatMap((subscription) =>
          subscription.paymentDues,
        );
        const currentDeficitAmount = dues.reduce(
          (sum, due) => sum + this.toNumber(due.amountDue),
          0,
        );
        const overdueAmount = dues
          .filter((due) => due.status === PaymentDueStatus.OVERDUE)
          .reduce((sum, due) => sum + this.toNumber(due.amountDue), 0);
        const totalMemberCount = wallet.entity.memberships.length;
        const nonSupportingCount = Math.max(
          totalMemberCount - activeSupporterCount,
          0,
        );
        const coveragePercent =
          totalMemberCount > 0
            ? Math.round((activeSupporterCount / totalMemberCount) * 100)
            : 0;
        const canManage = membership
          ? managerRoles.includes(membership.role)
          : false;
        const serviceName = this.cleanDisplayName(wallet.name);
        const tone: SurfaceTone =
          currentDeficitAmount > 0 || nonSupportingCount > 0
            ? 'attention'
            : 'positive';

        return {
          id: `shared-benefit-${wallet.id}`,
          entityId: wallet.entityId,
          entityName: wallet.entity.name,
          walletId: wallet.id,
          serviceName,
          roleLabel: membership ? this.roleLabel(membership.role) : 'عضو',
          tone,
          title: `${serviceName} مصلحة مشتركة`,
          benefitText:
            'هذه خدمة جماعية؛ يستفيد منها السكان أو الأعضاء معاً حتى لو لم يدفع الجميع في نفس الوقت.',
          coveragePercent,
          coverageText:
            totalMemberCount > 0
              ? `${activeSupporterCount} من ${totalMemberCount} يدعمونها الآن`
              : 'لا توجد عضويات نشطة ظاهرة لهذه الخدمة.',
          expectedMonthlySupport,
          currentDeficitAmount,
          overdueAmount,
          activeSupporterCount,
          nonSupportingCount,
          totalMemberCount,
          userContributionText: this.sharedBenefitUserContributionText(
            userSubscription?.state,
          ),
          sharedImpactText:
            nonSupportingCount > 0 || currentDeficitAmount > 0
              ? `الخدمة لا تتوقف عن إفادة الجميع، لكن يوجد ${this.formatNumber(
                  nonSupportingCount,
                )} غير داعمين الآن وعجز ظاهر ${this.formatMoney(
                  currentDeficitAmount,
                )}.`
              : 'التغطية مستقرة ولا يظهر عجز يحتاج متابعة الآن.',
          nextStep: canManage
            ? 'تابع العجز كمسألة تغطية جماعية، وليس كطلب صرف فردي أو نزاع شخصي.'
            : 'تابع مساهمتك فقط؛ لا تحتاج الدخول في تفاصيل كل ساكن أو مسار.',
          whyShown:
            'ظهر هنا لأن هذه منفعة مشتركة يصعب فصل أثرها عن غير الداعمين.',
          canManage,
          cta: canManage
            ? { label: 'راجع تفاصيل المصلحة', href: `/wallets/${wallet.id}` }
            : undefined,
        };
      },
    );

    const totalCurrentDeficit = items.reduce(
      (sum, item) => sum + item.currentDeficitAmount,
      0,
    );
    const totalOverdueAmount = items.reduce(
      (sum, item) => sum + item.overdueAmount,
      0,
    );

    return {
      isVisible: items.length > 0,
      itemCount: items.length,
      totalCurrentDeficit,
      totalOverdueAmount,
      displayText:
        items.length > 0
          ? `لديك ${this.formatNumber(
              items.length,
            )} مصلحة مشتركة. يعرض النظام التغطية والعجز دون تحويلها إلى طلب فردي.`
          : 'لا توجد مصالح مشتركة ظاهرة الآن.',
      items: items.slice(0, 4),
    };
  }

  private emptySharedBenefitSummary(): SharedBenefitSurfaceSummaryDto {
    return {
      isVisible: false,
      itemCount: 0,
      totalCurrentDeficit: 0,
      totalOverdueAmount: 0,
      displayText: 'لا توجد مصالح مشتركة ظاهرة الآن.',
      items: [],
    };
  }

  private sharedBenefitUserContributionText(state?: SubscriptionState) {
    if (state === SubscriptionState.ACTIVE) {
      return 'أنت ضمن الداعمين لهذه الخدمة.';
    }
    if (state === SubscriptionState.SUPPORTER_ONLY) {
      return 'أنت تدعم الخدمة دون حق استفادة فردية منفصلة.';
    }
    if (state === SubscriptionState.SUSPENDED) {
      return 'تستفيد من الخدمة جماعياً، لكن مساهمتك متوقفة الآن.';
    }
    if (state === SubscriptionState.CONDITIONAL) {
      return 'مشاركتك لم تصبح دعماً نشطاً كاملاً بعد.';
    }
    if (state === SubscriptionState.INTERESTED) {
      return 'أظهرت اهتماماً، لكن لا تظهر مساهمة نشطة بعد.';
    }
    if (state === SubscriptionState.EXITED) {
      return 'هذه علاقة سابقة ولا تظهر مساهمة نشطة الآن.';
    }
    return 'تستفيد من المصلحة بصفتك ضمن السياق، ولا يظهر لك دعم نشط هنا.';
  }

  private buildBlockedCapabilities(
    isVerified: boolean,
    memberships: SurfaceMembership[],
  ): BlockedCapabilityDto[] {
    const blocked: BlockedCapabilityDto[] = [];
    if (!isVerified) {
      blocked.push({
        id: 'unverified-account',
        title: 'بعض الإجراءات متوقفة حتى توثيق الحساب',
        reason:
          'يلزم توثيق الحساب قبل إنشاء صناديق أو حملات أو تنفيذ إجراءات حساسة.',
        canFix: true,
        fixCta: { label: 'راجع الملف الشخصي', href: '/profile' },
      });
    }

    for (const membership of memberships) {
      if (membership.entity.platformStatus === EntityPlatformStatus.SUSPENDED) {
        blocked.push({
          id: `entity-suspended-${membership.entityId}`,
          title: `${membership.entity.name} موقوف حالياً`,
          reason: 'لا تظهر إجراءات تشغيلية جديدة حتى ترفع المنصة التعليق.',
          contextLabel: membership.entity.name,
          canFix: false,
        });
      }
      if (membership.entity.platformStatus === EntityPlatformStatus.READ_ONLY) {
        blocked.push({
          id: `entity-readonly-${membership.entityId}`,
          title: `${membership.entity.name} للقراءة فقط`,
          reason: 'يمكنك متابعة الحالة دون إنشاء إجراءات جديدة.',
          contextLabel: membership.entity.name,
          canFix: false,
        });
      }
      if (membership.entity.platformStatus === EntityPlatformStatus.PENDING_REVIEW) {
        blocked.push({
          id: `entity-pending-review-${membership.entityId}`,
          title: `${membership.entity.name} قيد مراجعة المنصة`,
          reason: 'بعض التشغيل قد لا يظهر حتى تنتهي مراجعة المنصة.',
          contextLabel: membership.entity.name,
          canFix: false,
        });
      }

      for (const subscription of membership.subscriptions) {
        const walletName = this.cleanDisplayName(
          subscription.governancePath.wallet.name,
        );
        const contextLabel = subscription.governancePath.wallet.entity.name;

        if (subscription.state === SubscriptionState.SUSPENDED) {
          blocked.push({
            id: `subscription-suspended-${subscription.id}`,
            title: `لا يمكنك الاستفادة من ${walletName} الآن`,
            reason:
              'عضويتك معلقة في هذا السياق، لذلك أخفى النظام إجراءات الاستفادة والتصويت بدلاً من تركك تجرب وتفشل.',
            contextLabel,
            canFix: true,
            fixCta: { label: 'راجع ما يلزم', href: '/portal' },
          });
        } else if (subscription.state === SubscriptionState.CONDITIONAL) {
          blocked.push({
            id: `subscription-conditional-${subscription.id}`,
            title: `حقوقك محدودة في ${walletName}`,
            reason:
              'عضويتك مشروطة ولم تصبح نشطة كاملة، لذلك لا تظهر لك كل الإجراءات.',
            contextLabel,
            canFix: false,
          });
        } else if (subscription.state === SubscriptionState.SUPPORTER_ONLY) {
          blocked.push({
            id: `subscription-supporter-${subscription.id}`,
            title: `لا يظهر لك طلب استفادة من ${walletName}`,
            reason:
              'أنت داعم فقط هنا؛ مساهمتك دعم بلا حق استفادة من هذا البند.',
            contextLabel,
            canFix: false,
          });
        } else if (subscription.state === SubscriptionState.EXITED) {
          blocked.push({
            id: `subscription-exited-${subscription.id}`,
            title: `لا توجد إجراءات نشطة في ${walletName}`,
            reason:
              'أنت خارج هذا السياق، لذلك يعرض النظام الملخص التاريخي فقط.',
            contextLabel,
            canFix: false,
          });
        }
      }
    }

    return blocked.slice(0, 8);
  }

  private buildQuietUpdates(
    notifications: SurfaceNotification[],
    disbursements: SurfaceDisbursement[],
  ): SurfaceUpdateDto[] {
    const updates = notifications
      .filter((notification) => notification.title !== 'استحقاق اشتراك')
      .map<SurfaceUpdateDto>((notification) => ({
        id: `notification-${notification.id}`,
        title: this.simplifySurfaceText(notification.title),
        body: this.simplifySurfaceText(notification.body),
        occurredAt: notification.sentAt.toISOString(),
        href: '/notifications',
      }));

    for (const request of disbursements.slice(0, 2)) {
      updates.push({
        id: `disbursement-update-${request.id}`,
        title: 'تحديث على طلب صرف',
        body: `${request.beneficiaryName}: ${this.disbursementStatusLabel(
          request.status,
        )}`,
        contextLabel: request.governancePath.wallet.entity.name,
        href: '/disbursement-requests',
      });
    }

    return updates.slice(0, 5);
  }

  private buildContexts(memberships: SurfaceMembership[]): SurfaceContextDto[] {
    return memberships.slice(0, 6).map((membership) => ({
      id: membership.entityId,
      kind: membership.entity.isCampaign
        ? 'CAMPAIGN'
        : this.hasSharedBenefitSignal(membership)
          ? 'SHARED_BENEFIT'
          : 'ENTITY',
      label: membership.entity.name,
      roleLabel: this.roleLabel(membership.role),
      stateLabel: this.membershipStateLabel(membership),
      isOperational: this.isOperationalMembership(membership),
    }));
  }

  private buildContextSummaries(
    contexts: SurfaceContextDto[],
    memberships: SurfaceMembership[],
    dues: SurfacePaymentDue[],
    records: SurfacePaymentRecord[],
    actions: SurfaceActionDto[],
    exceptions: SurfaceExceptionDto[],
    benefitSummary: BenefitSurfaceSummaryDto,
    blockedCapabilities: BlockedCapabilityDto[],
  ): ContextSurfaceSummaryDto[] {
    return contexts.map((context) => {
      const contextDues = dues.filter(
        (due) =>
          due.subscription.governancePath.wallet.entity.id === context.id,
      );
      const contextRecords = records.filter(
        (record) =>
          record.subscription.governancePath.wallet.entity.id === context.id,
      );
      const dueNow = contextDues
        .filter((due) => due.status === PaymentDueStatus.PENDING)
        .reduce((sum, due) => sum + this.toNumber(due.amountDue), 0);
      const overdue = contextDues
        .filter((due) => due.status === PaymentDueStatus.OVERDUE)
        .reduce((sum, due) => sum + this.toNumber(due.amountDue), 0);
      const pendingProofs = contextRecords.filter((record) =>
        PENDING_PAYMENT_PROOF_STATUSES.includes(record.status),
      ).length;
      const rejectedProofs = contextRecords.filter(
        (record) => record.status === PaymentRecordStatus.REJECTED,
      ).length;
      const benefitCount = benefitSummary.items.filter(
        (item) =>
          item.contextLabel === context.label && item.state === 'AVAILABLE',
      ).length;
      const blockedCount = blockedCapabilities.filter(
        (item) => item.contextLabel === context.label,
      ).length;
      const actionCount = actions.filter((action) =>
        action.contextLabel?.includes(context.label),
      ).length;
      const exceptionCount = exceptions.filter((exception) =>
        exception.contextLabel?.includes(context.label),
      ).length;
      const membership = memberships.find(
        (item) => item.entityId === context.id,
      );

      return {
        ...context,
        dueNow,
        overdue,
        pendingProofs,
        rejectedProofs,
        benefitCount,
        blockedCount,
        actionCount: actionCount + exceptionCount,
        moneyText: this.contextMoneyText(dueNow, overdue, pendingProofs),
        benefitText:
          benefitCount > 0
            ? `تستفيد من ${benefitCount} ${benefitCount === 1 ? 'بند' : 'بنود'}`
            : 'لا تظهر استفادة نشطة هنا.',
        attentionText: this.contextAttentionText(
          context,
          membership,
          actionCount + exceptionCount,
          blockedCount,
        ),
      };
    });
  }

  private contextMoneyText(
    dueNow: number,
    overdue: number,
    pendingProofs: number,
  ) {
    if (overdue > 0) return `متأخر ${this.formatMoney(overdue)}`;
    if (dueNow > 0) return `مستحق ${this.formatMoney(dueNow)}`;
    if (pendingProofs > 0) return 'دفعة تنتظر التأكيد';
    return 'لا يوجد مطلوب مالي الآن';
  }

  private contextAttentionText(
    context: SurfaceContextDto,
    membership: SurfaceMembership | undefined,
    actionCount: number,
    blockedCount: number,
  ) {
    if (blockedCount > 0) return 'يوجد قيد واضح هنا.';
    if (!context.isOperational) return context.stateLabel;
    if (actionCount > 0) return 'يوجد إجراء مرتبط بهذا الصندوق.';
    if (
      membership &&
      this.hasSubscriptionState(membership, [SubscriptionState.ACTIVE])
    ) {
      return 'الحالة مستقرة.';
    }
    return undefined;
  }

  private buildAdvancedTools(
    memberships: SurfaceMembership[],
  ): AdvancedToolLinkDto[] {
    const tools: AdvancedToolLinkDto[] = [];
    const pushTool = (tool: AdvancedToolLinkDto) => {
      if (!tools.some((item) => item.href === tool.href)) {
        tools.push(tool);
      }
    };

    pushTool({
      href: '/dashboard/legacy',
      label: 'الواجهة التفصيلية القديمة',
      reason: 'للمقارنة أثناء الانتقال إلى Surface الجديد.',
      requiredRole: 'ANY',
    });

    if (memberships.length > 0) {
      pushTool({
        href: '/portal',
        label: 'تفاصيل اشتراكاتي ومدفوعاتي',
        reason:
          'لمن يريد مراجعة التفاصيل، بينما تعرض الواجهة اليومية المطلوب فقط.',
        requiredRole: 'ANY_MEMBER',
      });
      pushTool({
        href: '/subscriptions',
        label: 'سجل الاشتراكات',
        reason: 'للتفصيل التاريخي عند الحاجة، وليس كعمل يومي.',
        requiredRole: 'ANY_MEMBER',
      });
      pushTool({
        href: '/disbursement-requests',
        label: 'طلبات الصرف الخاصة بي',
        reason: 'لفتح طلب أو متابعة طلب قديم عندما تحتاج ذلك.',
        requiredRole: 'ANY_MEMBER',
      });
      pushTool({
        href: '/wallets',
        label: 'تفاصيل المحافظ',
        reason: 'لرؤية البنية التفصيلية للصندوق عند الحاجة فقط.',
        requiredRole: 'ANY_MEMBER',
      });
    }

    if (this.hasAnyRole(memberships, ADMIN_ROLES)) {
      pushTool({
        href: '/review-center',
        label: 'مركز المراجعة',
        reason: 'للاستثناءات التي تحتاج قراراً إدارياً.',
        requiredRole: 'FOUNDER_OR_ADMIN',
      });
      pushTool({
        href: '/documents',
        label: 'المستندات',
        reason: 'لمراجعة وثائق الصندوق عندما تكون جزءاً من قرار أو استثناء.',
        requiredRole: 'FOUNDER_OR_ADMIN',
      });
    }
    if (this.hasAnyRole(memberships, FOUNDER_ROLES)) {
      pushTool({
        href: '/entities',
        label: 'إعدادات التأسيس',
        reason: 'لإنشاء الصناديق وإكمال الإعدادات التي لا تظهر للأعضاء.',
        requiredRole: 'FOUNDER',
      });
      pushTool({
        href: '/health',
        label: 'صحة الصناديق والحملات',
        reason: 'لفحص جاهزية الصناديق ومشاكل الإعداد النادرة.',
        requiredRole: 'FOUNDER',
      });
    }
    if (this.hasAdvancedSettingsAccess(memberships)) {
      pushTool({
        href: '/rules',
        label: 'قواعد وسياسات الصناديق',
        reason: 'لضبط قواعد العضوية والشفافية والحوكمة عند التأسيس.',
        requiredRole: 'ADVANCED_SETTINGS',
      });
    }
    if (this.hasAnyRole(memberships, PAYMENT_MATCHING_ROLES)) {
      pushTool({
        href: '/finance',
        label: 'الأدوات المالية',
        reason: 'للمطابقة والتقارير عند الحاجة.',
        requiredRole: 'FOUNDER_OR_TREASURER',
      });
    }
    if (this.hasAnyRole(memberships, DISBURSEMENT_REVIEW_ROLES)) {
      pushTool({
        href: '/disbursements',
        label: 'تنفيذ الصرف',
        reason: 'للمراجعة والتنفيذ بعد قرار حوكمي صالح.',
        requiredRole: 'FOUNDER_ADMIN_TREASURER',
      });
      pushTool({
        href: '/beneficiaries',
        label: 'المستفيدون',
        reason: 'للمراجعة التفصيلية لحالات الاستفادة عند وجود طلب أو استثناء.',
        requiredRole: 'FOUNDER_ADMIN_TREASURER',
      });
    }
    if (this.hasAnyRole(memberships, OVERSIGHT_ROLES)) {
      pushTool({
        href: '/auditor',
        label: 'الرقابة والتدقيق',
        reason: 'للمراجعة العميقة عند وجود سبب.',
        requiredRole: 'FOUNDER_ADMIN_AUDITOR',
      });
      pushTool({
        href: '/disputes',
        label: 'النزاعات والاعتراضات',
        reason: 'للتعامل مع الاعتراضات والنزاعات خارج العمل اليومي.',
        requiredRole: 'FOUNDER_ADMIN_AUDITOR',
      });
      pushTool({
        href: '/analytics',
        label: 'التحليلات',
        reason: 'للقراءة التحليلية عند مراجعة اتجاهات مالية أو تشغيلية.',
        requiredRole: 'FOUNDER_ADMIN_AUDITOR',
      });
    }
    if (this.hasAnyRole(memberships, COMMITTEE_ROLES)) {
      pushTool({
        href: '/committees',
        label: 'أعمال اللجنة',
        reason: 'للقرارات التي تخص دورك في اللجنة.',
        requiredRole: 'FOUNDER_ADMIN_COMMITTEE',
      });
      pushTool({
        href: '/decisions',
        label: 'القرارات التفصيلية',
        reason: 'لمن يحتاج مراجعة تفاصيل القرار والتصويت خارج السطح اليومي.',
        requiredRole: 'FOUNDER_ADMIN_COMMITTEE',
      });
    }

    return tools;
  }

  private buildPrimaryMessage(
    actions: SurfaceActionDto[],
    exceptions: SurfaceExceptionDto[],
    moneySummary: MoneySurfaceSummaryDto,
    nonOperationalSummary: NonOperationalSurfaceSummaryDto,
  ): SurfaceMessageDto {
    const operationalActionCount = actions.filter(
      (action) =>
        !['MEMBERSHIP_STATUS', 'MEMBERSHIP_APPLICATION_STATUS'].includes(
          action.kind,
        ),
    ).length;

    if (nonOperationalSummary.isVisible && operationalActionCount === 0) {
      const firstItem = nonOperationalSummary.items[0];
      return {
        tone: firstItem.tone,
        title: firstItem.title,
        body: firstItem.whatThisMeans,
        nextStep: firstItem.nextStep,
      };
    }

    const criticalOrUrgent = [...actions, ...exceptions].filter((item) =>
      ['critical', 'urgent'].includes(
        'priority' in item ? item.priority : item.severity,
      ),
    );
    if (criticalOrUrgent.length > 0) {
      return {
        tone: 'attention',
        title: `لديك ${criticalOrUrgent.length} أمر مهم يحتاج انتباهك`,
        body: 'رتبها النظام لك حسب الأولوية بدلاً من عرض كل تفاصيل الصندوق.',
        nextStep: 'ابدأ بأول إجراء ظاهر في القائمة.',
      };
    }
    const normalActions = actions.filter((action) => action.priority === 'normal');
    if (normalActions.length > 0) {
      return {
        tone: 'attention',
        title: normalActions[0].title,
        body: normalActions[0].body,
        nextStep: normalActions[0].cta.label,
      };
    }
    const membershipStatus = actions.find(
      (action) => action.kind === 'MEMBERSHIP_STATUS',
    );
    if (membershipStatus) {
      return {
        tone: membershipStatus.priority === 'info' ? 'neutral' : 'attention',
        title: membershipStatus.title,
        body: membershipStatus.body,
        nextStep: membershipStatus.cta.label,
      };
    }
    if (exceptions.length > 0) {
      return {
        tone: 'attention',
        title: `لديك ${exceptions.length} استثناء تشغيلي يحتاج متابعة`,
        body: 'تظهر لك الاستثناءات فقط لأن دورك يحتاج التدخل عندها.',
      };
    }
    if (moneySummary.pendingProofs > 0) {
      return {
        tone: 'neutral',
        title: 'دفعتك وصلت وتنتظر التأكيد',
        body: moneySummary.displayText,
      };
    }
    return {
      tone: 'positive',
      title: 'لا يوجد مطلوب منك الآن',
      body: moneySummary.displayText,
      nextStep: 'يمكنك الاكتفاء بالمتابعة الهادئة.',
    };
  }

  private canVoteForDecision(
    personId: string,
    decision: SurfaceDecision,
    memberships: SurfaceMembership[],
  ) {
    const entityId = decision.governancePath?.wallet.entityId;
    if (!entityId) return false;
    const membership = memberships.find(
      (item) => item.entityId === entityId && item.personId === personId,
    );
    if (
      !membership?.isActive ||
      !membership.entity.isActive ||
      membership.entity.platformStatus !== EntityPlatformStatus.ACTIVE
    ) {
      return false;
    }
    if (decision.votersScope === VotersScope.ALL_MEMBERS) {
      if (!this.isOperationalMembership(membership)) return false;
      return this.hasSubscriptionState(membership, [SubscriptionState.ACTIVE]);
    }
    if (decision.votersScope === VotersScope.PATH_SUBSCRIBERS) {
      if (!this.isOperationalMembership(membership)) return false;
      return membership.subscriptions.some(
        (subscription) =>
          subscription.governancePathId === decision.governancePathId &&
          subscription.state === SubscriptionState.ACTIVE,
      );
    }
    if (decision.votersScope === VotersScope.COMMITTEE) {
      const committeeId = decision.governancePath?.committeeId;
      if (committeeId) {
        return membership.committeeMembers.some(
          (committee) => committee.committeeId === committeeId,
        );
      }
      return COMMITTEE_ROLES.includes(membership.role);
    }
    return false;
  }

  private resolveSurfaceKind(memberships: SurfaceMembership[]): SurfaceKind {
    if (this.hasAnyRole(memberships, [MemberRole.FOUNDER])) return 'FOUNDER';
    if (this.hasAnyRole(memberships, [MemberRole.ADMIN])) return 'ADMIN';
    if (this.hasAnyRole(memberships, [MemberRole.TREASURER])) return 'TREASURER';
    if (this.hasAnyRole(memberships, [MemberRole.AUDITOR])) return 'AUDITOR';
    if (this.hasAnyRole(memberships, [MemberRole.COMMITTEE_MEMBER])) {
      return 'COMMITTEE_MEMBER';
    }
    if (
      memberships.some(
        (membership) =>
          membership.entity.platformStatus === EntityPlatformStatus.SUSPENDED ||
          this.hasSubscriptionState(membership, [SubscriptionState.SUSPENDED]),
      )
    ) {
      return 'SUSPENDED_MEMBER';
    }
    if (
      memberships.some(
        (membership) =>
          membership.entity.platformStatus === EntityPlatformStatus.READ_ONLY,
      )
    ) {
      return 'READ_ONLY_MEMBER';
    }
    if (
      memberships.some(
        (membership) =>
          membership.entity.platformStatus === EntityPlatformStatus.PENDING_REVIEW,
      )
    ) {
      return 'PENDING_REVIEW_MEMBER';
    }
    if (
      memberships.some((membership) =>
        this.hasSubscriptionState(membership, [SubscriptionState.CONDITIONAL]),
      )
    ) {
      return 'CONDITIONAL_MEMBER';
    }
    const subscriptionStates = memberships.flatMap((membership) =>
      membership.subscriptions.map((subscription) => subscription.state),
    );
    if (
      subscriptionStates.length > 0 &&
      subscriptionStates.every((state) => state === SubscriptionState.EXITED)
    ) {
      return 'EXITED_MEMBER';
    }
    if (
      subscriptionStates.length > 0 &&
      subscriptionStates.every(
        (state) => state === SubscriptionState.SUPPORTER_ONLY,
      )
    ) {
      return 'SUPPORTER_ONLY';
    }
    return memberships.length > 1 ? 'MULTI_ENTITY_MEMBER' : 'MEMBER';
  }

  private isOperationalMembership(membership: SurfaceMembership) {
    if (!membership.isActive || !membership.entity.isActive) return false;
    if (membership.entity.platformStatus !== EntityPlatformStatus.ACTIVE) {
      return false;
    }
    if (membership.subscriptions.length === 0) return true;
    return this.hasSubscriptionState(membership, [
      SubscriptionState.ACTIVE,
      SubscriptionState.SUPPORTER_ONLY,
    ]);
  }

  private membershipStateLabel(membership: SurfaceMembership) {
    if (!membership.isActive || !membership.entity.isActive) return 'غير نشط';
    if (membership.entity.platformStatus === EntityPlatformStatus.SUSPENDED) {
      return 'معلق من المنصة';
    }
    if (membership.entity.platformStatus === EntityPlatformStatus.READ_ONLY) {
      return 'قراءة فقط';
    }
    if (membership.entity.platformStatus === EntityPlatformStatus.PENDING_REVIEW) {
      return 'قيد المراجعة';
    }
    if (this.hasSubscriptionState(membership, [SubscriptionState.SUSPENDED])) {
      return 'معلق';
    }
    if (this.hasSubscriptionState(membership, [SubscriptionState.CONDITIONAL])) {
      return 'مشروط';
    }
    if (
      membership.subscriptions.length > 0 &&
      membership.subscriptions.every(
        (subscription) => subscription.state === SubscriptionState.EXITED,
      )
    ) {
      return 'خارج';
    }
    if (
      membership.subscriptions.length > 0 &&
      membership.subscriptions.every(
        (subscription) => subscription.state === SubscriptionState.SUPPORTER_ONLY,
      )
    ) {
      return 'داعم فقط';
    }
    return 'نشط';
  }

  private hasSubscriptionState(
    membership: SurfaceMembership,
    states: readonly SubscriptionState[],
  ) {
    return membership.subscriptions.some((subscription) =>
      states.includes(subscription.state),
    );
  }

  private subscriptionStateReason(
    subscription: SurfaceMembership['subscriptions'][number],
  ) {
    if (subscription.notes) {
      return `السبب المسجل: ${this.simplifySurfaceText(subscription.notes)}`;
    }
    if (subscription.state === SubscriptionState.SUSPENDED) {
      return 'السبب غالباً متأخرات أو تغيّر شروط المشاركة.';
    }
    if (subscription.state === SubscriptionState.CONDITIONAL) {
      return 'ينقص تحقق شرط المشاركة قبل تفعيل الحقوق كاملة.';
    }
    if (subscription.state === SubscriptionState.EXITED) {
      return subscription.exitedAt
        ? `خرجت من هذا السياق بتاريخ ${this.formatDate(subscription.exitedAt)}.`
        : 'هذه علاقة سابقة وليست عضوية نشطة الآن.';
    }
    return 'لا يوجد سبب إضافي ظاهر.';
  }

  private entityIdsForRoles(
    memberships: SurfaceMembership[],
    roles: readonly MemberRole[],
  ) {
    return memberships
      .filter((membership) => membership.isActive && roles.includes(membership.role))
      .map((membership) => membership.entityId);
  }

  private committeeIdsForMemberships(memberships: SurfaceMembership[]) {
    return [
      ...new Set(
        memberships
          .filter(
            (membership) =>
              membership.isActive &&
              membership.entity.isActive &&
              membership.entity.platformStatus !== EntityPlatformStatus.SUSPENDED,
          )
          .flatMap((membership) =>
            membership.committeeMembers.map((committee) => committee.committeeId),
          ),
      ),
    ];
  }

  private entityRefForId(
    memberships: SurfaceMembership[],
    entityId: string,
  ): SurfaceEntityRef | undefined {
    const membership = memberships.find((item) => item.entityId === entityId);
    return membership
      ? { id: membership.entityId, name: membership.entity.name }
      : undefined;
  }

  private hasAnyRole(
    memberships: SurfaceMembership[],
    roles: readonly MemberRole[],
  ) {
    return memberships.some(
      (membership) => membership.isActive && roles.includes(membership.role),
    );
  }

  private hasAdvancedSettingsAccess(memberships: SurfaceMembership[]) {
    return memberships.some(
      (membership) =>
        membership.isActive &&
        (membership.role === MemberRole.FOUNDER ||
          membership.canManageAdvancedSettings),
    );
  }

  private hasSharedBenefitSignal(membership: SurfaceMembership) {
    return (
      membership.entity.wallets.some(
        (wallet) => wallet.isActive && wallet.benefitType === 'SHARED',
      ) ||
      membership.subscriptions.some(
        (subscription) =>
          subscription.governancePath.wallet.benefitType === 'SHARED',
      ) ||
      membership.entity.type === 'BUILDING'
    );
  }

  private priorityRank(priority: SurfacePriority) {
    if (priority === 'critical') return 0;
    if (priority === 'urgent') return 1;
    if (priority === 'normal') return 2;
    return 3;
  }

  private roleLabel(role: MemberRole) {
    switch (role) {
      case MemberRole.FOUNDER:
        return 'مؤسس';
      case MemberRole.ADMIN:
        return 'مسؤول';
      case MemberRole.TREASURER:
        return 'أمين صندوق';
      case MemberRole.AUDITOR:
        return 'مدقق';
      case MemberRole.COMMITTEE_MEMBER:
        return 'عضو لجنة';
      case MemberRole.MEMBER:
        return 'عضو';
    }
  }

  private decisionTypeLabel(type: DecisionType) {
    switch (type) {
      case DecisionType.CREATE_WALLET:
        return 'إنشاء محفظة';
      case DecisionType.CREATE_PATH:
        return 'إنشاء مسار';
      case DecisionType.DISBURSE_FUNDS:
        return 'صرف مبلغ';
      case DecisionType.MODIFY_SUBSCRIPTION:
        return 'تعديل اشتراك';
      case DecisionType.MODIFY_GOVERNANCE:
        return 'تعديل حوكمة';
      case DecisionType.TRANSFER_BALANCE:
        return 'نقل رصيد';
      case DecisionType.ACCEPT_MEMBER:
        return 'قبول عضو';
      case DecisionType.EXPEL_MEMBER:
        return 'إيقاف عضو';
      case DecisionType.OPEN_DISPUTE:
        return 'فتح نزاع';
      case DecisionType.CLOSE_WALLET:
        return 'إغلاق محفظة';
      case DecisionType.FREEZE_WALLET:
        return 'تجميد محفظة';
      case DecisionType.MERGE_PATHS:
        return 'دمج مسارات';
    }
  }

  private ledgerTransactionTypeLabel(type: LedgerTransactionType) {
    switch (type) {
      case LedgerTransactionType.SUBSCRIPTION_PAYMENT:
        return 'سداد اشتراك';
      case LedgerTransactionType.DONATION:
        return 'تبرع';
      case LedgerTransactionType.SERVICE_FEE:
        return 'رسم خدمة';
      case LedgerTransactionType.PROJECT_CONTRIBUTION:
        return 'مساهمة مشروع';
      case LedgerTransactionType.DISBURSEMENT:
        return 'صرف لمستفيد';
      case LedgerTransactionType.TRANSFER:
        return 'تحويل رصيد';
      case LedgerTransactionType.ENTITY_SUPPORT:
        return 'دعم بين صناديق';
      case LedgerTransactionType.ADJUSTMENT:
        return 'تعديل رصيد';
      case LedgerTransactionType.REVERSAL:
        return 'عكس عملية';
    }
  }

  private disbursementStatusLabel(status: DisbursementRequestStatus) {
    switch (status) {
      case DisbursementRequestStatus.PENDING:
        return 'تحت المراجعة';
      case DisbursementRequestStatus.APPROVED:
        return 'معتمد وينتظر التنفيذ';
      case DisbursementRequestStatus.REJECTED:
        return 'مرفوض';
      case DisbursementRequestStatus.EXECUTED:
        return 'تم تنفيذه';
      case DisbursementRequestStatus.CANCELLED:
        return 'ملغى';
    }
  }

  private presentAuditorSurfaceEvent(log: AuditSurfaceLogItem) {
    const oldValue = this.auditJsonObject(log.oldValue);
    const newValue = this.auditJsonObject(log.newValue);
    const value = { ...oldValue, ...newValue };
    const actorName = log.person?.name ?? 'النظام';
    const actionLabel = this.auditActionLabel(String(log.action));
    const targetLabel = this.auditTargetLabel(log.targetType);
    const category = this.auditCategory(log, value);
    const severity = this.auditSurfaceSeverity(log, category);
    const contextLabel = log.entity?.name ?? 'سياق غير محدد';

    return {
      id: log.id,
      title: `${actorName} ${actionLabel} ${targetLabel}`,
      actorName,
      contextLabel,
      occurredAt: log.createdAt.toISOString(),
      actionLabel,
      targetLabel,
      severity,
      severityLabel: this.surfaceSeverityLabel(severity),
      category,
      effect: this.auditSurfaceEffect(log, category, value),
      whyShown: `ظهر لك لأنك مدقق في ${contextLabel}.`,
      linkedRecords: this.auditLinkedRecords(log, value),
      changes: this.auditSurfaceChanges(oldValue, newValue),
      cta: {
        label: 'راجع السجل',
        href: `/auditor?tab=auditLogs${
          log.entityId ? `&entityId=${log.entityId}` : ''
        }`,
      },
    };
  }

  private auditJsonObject(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private auditActionLabel(action: string) {
    const labels: Record<string, string> = {
      CREATE: 'أنشأ',
      UPDATE: 'غيّر',
      DELETE: 'حاول حذف',
      APPROVE: 'اعتمد',
      REJECT: 'رفض',
      VOTE: 'صوّت على',
      APPEAL: 'قدّم',
      LOGIN: 'سجّل دخولاً إلى',
      LOGOUT: 'سجّل خروجاً من',
    };
    return labels[action] ?? action;
  }

  private auditTargetLabel(targetType: string) {
    const labels: Record<string, string> = {
      entities: 'صندوق',
      memberships: 'عضوية',
      membership_applications: 'طلب عضوية',
      wallets: 'محفظة',
      governance_paths: 'مسار حوكمة',
      subscriptions: 'اشتراك',
      payment_records: 'إثبات سداد',
      payment_dues: 'مستحق دفع',
      decisions: 'قرار',
      votes: 'تصويت',
      disbursement_requests: 'طلب صرف',
      ledger_transactions: 'حركة مالية',
      balance_transfer_requests: 'طلب نقل رصيد',
      disputes: 'نزاع',
      appeals: 'اعتراض',
      documents: 'مستند',
      support_sessions: 'جلسة دعم',
      wallet_relationships: 'علاقة محفظة',
      entity_relationships: 'علاقة صندوق',
      persons: 'حساب مستخدم',
    };
    return labels[targetType] ?? targetType;
  }

  private auditCategory(
    log: AuditSurfaceLogItem,
    value: Record<string, unknown>,
  ): 'FINANCE' | 'GOVERNANCE' | 'MEMBERSHIP' | 'ACCESS' | 'OPERATIONS' {
    const targetType = log.targetType;
    if (String(log.action) === 'LOGIN' || String(log.action) === 'LOGOUT') {
      return 'ACCESS';
    }
    if (
      targetType.includes('payment') ||
      targetType.includes('ledger') ||
      targetType.includes('disbursement') ||
      targetType.includes('balance_transfer') ||
      value.amount !== undefined
    ) {
      return 'FINANCE';
    }
    if (
      targetType.includes('decision') ||
      targetType.includes('vote') ||
      targetType.includes('governance') ||
      targetType.includes('wallet') ||
      targetType.includes('relationship')
    ) {
      return 'GOVERNANCE';
    }
    if (
      targetType.includes('membership') ||
      targetType.includes('subscription')
    ) {
      return 'MEMBERSHIP';
    }
    return 'OPERATIONS';
  }

  private auditSurfaceSeverity(
    log: AuditSurfaceLogItem,
    category: 'FINANCE' | 'GOVERNANCE' | 'MEMBERSHIP' | 'ACCESS' | 'OPERATIONS',
  ): SurfacePriority {
    const action = String(log.action);
    if (action === 'DELETE') return 'critical';
    if (
      category === 'FINANCE' ||
      log.targetType.includes('dispute') ||
      action === 'APPEAL'
    ) {
      return 'urgent';
    }
    if (action === 'APPROVE' || action === 'REJECT' || category === 'MEMBERSHIP') {
      return 'normal';
    }
    return 'info';
  }

  private surfaceSeverityLabel(severity: SurfacePriority) {
    if (severity === 'critical') return 'حرج';
    if (severity === 'urgent') return 'مهم';
    if (severity === 'normal') return 'للمراجعة';
    return 'معلومة';
  }

  private auditSurfaceEffect(
    log: AuditSurfaceLogItem,
    category: 'FINANCE' | 'GOVERNANCE' | 'MEMBERSHIP' | 'ACCESS' | 'OPERATIONS',
    value: Record<string, unknown>,
  ) {
    const amount = this.toNumber(value.amount);
    if (category === 'FINANCE') {
      return amount > 0
        ? `أثر مالي: يتعلّق بحركة أو طلب مالي بقيمة ${this.formatMoney(
            amount,
          )}. راجع الربط بالقرار أو المستحق قبل الاعتماد النهائي.`
        : 'أثر مالي: يتعلّق بدفع أو صرف أو نقل رصيد. راجع الربط بالقرار أو المستحق قبل الاعتماد النهائي.';
    }
    if (category === 'GOVERNANCE') {
      return 'أثر حوكمي: قد يغير قراراً أو تصويتاً أو قاعدة تشغيل، لذلك يجب أن يكون مرتبطاً بسياقه.';
    }
    if (category === 'MEMBERSHIP') {
      return 'أثر عضوية: قد يغير حق الوصول أو التصويت أو الاستفادة داخل الصندوق.';
    }
    if (category === 'ACCESS') {
      return 'أثر وصول: حدث دخول أو خروج محفوظ لتتبع الحساب عند الحاجة.';
    }
    if (String(log.action) === 'DELETE') {
      return 'أثر تشغيلي حساس: محاولة حذف أو تنظيف يجب أن تبقى قابلة للتتبع.';
    }
    return 'حدث تشغيلي محفوظ للمراجعة والتتبع.';
  }

  private auditSurfaceChanges(
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
  ) {
    const ignored = new Set(['attachments', 'userAgent', 'ipAddress']);
    return Array.from(
      new Set([...Object.keys(oldValue), ...Object.keys(newValue)]),
    )
      .filter((field) => !ignored.has(field))
      .slice(0, 5)
      .map((field) => ({
        field,
        label: this.auditFieldLabel(field),
        before: this.auditValueLabel(oldValue[field]),
        after: this.auditValueLabel(newValue[field]),
      }));
  }

  private auditFieldLabel(field: string) {
    const labels: Record<string, string> = {
      status: 'الحالة',
      title: 'العنوان',
      type: 'النوع',
      decisionType: 'نوع القرار',
      choice: 'الصوت',
      weight: 'الوزن',
      amount: 'المبلغ',
      applicantId: 'طالب العضوية',
      reviewerNotes: 'ملاحظات المراجع',
      closureStatus: 'حالة الإغلاق',
      closureReason: 'سبب الإغلاق',
      prevented: 'تم المنع',
      reason: 'السبب',
      via: 'طريقة الدخول',
    };
    return labels[field] ?? field;
  }

  private auditValueLabel(value: unknown) {
    if (value === null || value === undefined || value === '') return 'غير موجود';
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (typeof value === 'number') return this.formatNumber(value);
    if (typeof value === 'string') {
      return value.length > 80 ? `${value.slice(0, 77)}...` : value;
    }
    if (Array.isArray(value)) {
      return value.length === 0 ? 'قائمة فارغة' : value.join('، ');
    }
    const text = JSON.stringify(value);
    return text.length > 90 ? `${text.slice(0, 87)}...` : text;
  }

  private auditLinkedRecords(
    log: AuditSurfaceLogItem,
    value: Record<string, unknown>,
  ) {
    const records = [
      { type: log.targetType, id: log.targetId, label: this.auditTargetLabel(log.targetType) },
      { type: 'decisions', id: value.decisionId, label: 'قرار' },
      { type: 'wallets', id: value.walletId, label: 'محفظة' },
      {
        type: 'governance_paths',
        id: value.pathId ?? value.governancePathId,
        label: 'مسار',
      },
      { type: 'spending_items', id: value.spendingItemId, label: 'بند صرف' },
      { type: 'payment_dues', id: value.paymentDueId, label: 'مستحق' },
      {
        type: 'disbursement_requests',
        id: value.disbursementRequestId,
        label: 'طلب صرف',
      },
      { type: 'memberships', id: value.membershipId, label: 'عضوية' },
      { type: 'persons', id: value.applicantId, label: 'شخص' },
    ];

    const seen = new Set<string>();
    return records
      .filter((record): record is { type: string; id: string; label: string } => {
        if (!record.id || typeof record.id !== 'string') return false;
        const key = `${record.type}:${record.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((record) => ({
        ...record,
        shortId: record.id.slice(0, 8),
        href: this.auditRecordHref(record.type, record.id, log.entityId ?? undefined),
      }));
  }

  private auditRecordHref(type: string, id: string, entityId?: string) {
    if (type === 'decisions') return `/decisions#decision-${id}`;
    if (type === 'wallets') return `/wallets/${id}`;
    if (type === 'governance_paths') return `/paths/${id}`;
    if (type === 'disbursement_requests') {
      return `/disbursement-requests?requestId=${id}`;
    }
    if (type === 'payment_dues' || type === 'payment_records') {
      return '/finance?tab=reviews';
    }
    if (type === 'balance_transfer_requests' || type === 'ledger_transactions') {
      return '/finance';
    }
    if (type === 'memberships' && entityId) {
      return `/entities/${entityId}/members`;
    }
    if (type === 'membership_applications' && entityId) {
      return `/entities/${entityId}/review`;
    }
    if (type === 'disputes' || type === 'appeals') return `/disputes/${id}`;
    if (type === 'documents') return '/documents';
    return undefined;
  }

  private summarizeContexts(names: string[]) {
    const uniqueNames = [...new Set(names.filter(Boolean))];
    if (uniqueNames.length === 0) return undefined;
    if (uniqueNames.length === 1) return uniqueNames[0];
    if (uniqueNames.length === 2) return uniqueNames.join(' و ');
    return `${uniqueNames[0]} و ${uniqueNames.length - 1} صناديق أخرى`;
  }

  private paymentDueBreakdown(dues: SurfacePaymentDue[]) {
    const totals = new Map<string, number>();
    for (const due of dues) {
      const entityName = due.subscription.governancePath.wallet.entity.name;
      totals.set(
        entityName,
        (totals.get(entityName) ?? 0) + this.toNumber(due.amountDue),
      );
    }

    return [...totals.entries()]
      .map(([entityName, amount]) => `${entityName}: ${this.formatMoney(amount)}`)
      .join('، ');
  }

  private cleanDisplayName(value: string) {
    return this.simplifySurfaceText(value)
      .replace(/^محفظة\s+/u, '')
      .replace(/^مسار\s+/u, '')
      .trim();
  }

  private simplifySurfaceText(value: string) {
    return value
      .replace(/مسار\s+"([^"]+)"/gu, '"$1"')
      .replace(/محفظة\s+/gu, '')
      .replace(/الكيان/gu, 'الصندوق')
      .trim();
  }

  private toNumber(value: unknown) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  }

  private formatMoney(value: unknown) {
    const amount = this.toNumber(value);
    return `${amount.toLocaleString('ar-SA', {
      maximumFractionDigits: 2,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    })} ر.س`;
  }

  private formatNumber(value: number) {
    return value.toLocaleString('ar-SA');
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(value);
  }
}
