import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LedgerService } from '../ledger/ledger.service';
import { RulesService } from '../rules/rules.service';
import {
  AuditAction,
  GovernancePathType,
  MemberPreference,
  MemberRole,
  PathPolicy,
  PaymentDueStatus,
  PaymentRecordStatus,
  SubscriptionState,
  VoteType,
} from '@prisma/client';
import { GovernancePath } from '@prisma/client';
import { SubscribeDto } from './dto/subscribe.dto';
import { CreatePaymentRecordDto } from './dto/create-payment-record.dto';
import {
  ApprovePaymentRecordDto,
  RejectPaymentRecordDto,
} from './dto/review-payment-record.dto';

type PathWithPolicy = GovernancePath & {
  policy: PathPolicy | null;
  wallet: { entityId: string };
};

export interface CompatibilityConflict {
  field: string;
  memberValue: string;
  pathValue: string;
  resolution: string;
}

export interface CompatibilityResult {
  isEligible: boolean;
  canVote: boolean;
  canBenefit: boolean;
  canAppeal: boolean;
  conflicts: CompatibilityConflict[];
  recommendedState: SubscriptionState;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly ledgerService: LedgerService,
    private readonly rulesService: RulesService,
  ) {}

  async subscribe(pathId: string, requesterId: string, dto: SubscribeDto) {
    // جلب المسار مع سياسته والمحفظة
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: { policy: true, wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');
    if (!path.isActive) throw new BadRequestException('المسار غير نشط');

    // جلب العضوية مع التفضيلات
    const membership = await this.prisma.membership.findUnique({
      where: { id: dto.membershipId },
      include: { preferences: true },
    });
    if (!membership) throw new NotFoundException('العضوية غير موجودة');

    // التحقق من الملكية وحالة العضوية
    if (membership.personId !== requesterId) {
      throw new ForbiddenException('يمكنك الاشتراك فقط بعضويتك الخاصة');
    }
    if (!membership.isActive) {
      throw new ForbiddenException(
        'العضوية غير نشطة أو ما زالت بانتظار الموافقة',
      );
    }

    // التحقق من أن العضوية في نفس كيان المسار
    if (membership.entityId !== path.wallet.entityId) {
      throw new ForbiddenException('العضوية لا تنتمي لكيان هذا المسار');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: {
        membershipId_governancePathId: {
          membershipId: dto.membershipId,
          governancePathId: pathId,
        },
      },
    });
    if (existing && existing.state !== SubscriptionState.EXITED) {
      throw new ConflictException('أنت مشترك بالفعل في هذا المسار');
    }

    const compatibility = await this.evaluateSubscriptionCompatibility(
      membership,
      path,
      dto.agreedAmount ?? null,
    );
    const policySnapshot = this.buildPolicySnapshot(
      path,
      membership.preferences,
      null,
    );

    return this.prisma.$transaction(async (tx) => {
      const subscription = existing
        ? await tx.subscription.update({
            where: { id: existing.id },
            data: {
              state: SubscriptionState.INTERESTED,
              policySnapshot,
              agreedAmount: dto.agreedAmount,
              notes: dto.notes,
              interestedAt: new Date(),
              activeAt: null,
              suspendedAt: null,
              exitedAt: null,
            },
          })
        : await tx.subscription.create({
            data: {
              membershipId: dto.membershipId,
              governancePathId: pathId,
              state: SubscriptionState.INTERESTED,
              policySnapshot,
              agreedAmount: dto.agreedAmount,
              notes: dto.notes,
            },
          });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: requesterId,
          entityId: path.wallet.entityId,
          targetType: 'subscriptions',
          targetId: subscription.id,
          newValue: {
            state: SubscriptionState.INTERESTED,
            pathId,
          },
        },
      });

      return { ...subscription, compatibilityResult: compatibility };
    });
  }

  async findMemberSubscriptions(membershipId: string, requesterId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });
    if (!membership) throw new NotFoundException('العضوية غير موجودة');

    const isOwner = membership.personId === requesterId;
    const isAdmin = await this.isAdminOrFounder(
      membership.entityId,
      requesterId,
    );
    if (!isOwner && !isAdmin) throw new ForbiddenException('غير مصرح بالوصول');

    return this.prisma.subscription.findMany({
      where: { membershipId },
      include: {
        governancePath: {
          select: { id: true, name: true, type: true, walletId: true },
        },
      },
      orderBy: { interestedAt: 'desc' },
    });
  }

  async findEntitySubscriptions(entityId: string, requesterId: string) {
    await this.requireAdminOrFounder(entityId, requesterId);

    return this.prisma.subscription.findMany({
      where: {
        membership: { entityId },
        state: { not: SubscriptionState.EXITED },
      },
      include: {
        governancePath: { select: { id: true, name: true, type: true } },
        membership: {
          include: {
            person: { select: { id: true, name: true, username: true } },
          },
        },
      },
      orderBy: { interestedAt: 'desc' },
    });
  }

  async findPathSubscriptions(pathId: string, requesterId: string) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: { wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');

    await this.requireAdminOrFounder(path.wallet.entityId, requesterId);

    return this.prisma.subscription.findMany({
      where: { governancePathId: pathId },
      include: {
        membership: {
          include: {
            person: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
      orderBy: { interestedAt: 'asc' },
    });
  }

  async findMySubscriptions(personId: string) {
    return this.prisma.subscription.findMany({
      where: {
        membership: { personId, isActive: true },
        state: { not: SubscriptionState.EXITED },
      },
      include: {
        governancePath: {
          select: {
            id: true,
            name: true,
            type: true,
            walletId: true,
          },
        },
        membership: {
          include: {
            person: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
      orderBy: { interestedAt: 'desc' },
    });
  }

  async getCompatibility(subscriptionId: string, requesterId: string) {
    const sub = await this.getSubscriptionWithPath(subscriptionId);
    const isOwner = sub.subscription.membership.personId === requesterId;
    const isAdmin = await this.isAdminOrFounder(sub.entityId, requesterId);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('غير مصرح بالوصول');
    }

    return this.evaluateSubscriptionCompatibility(
      sub.subscription.membership,
      sub.subscription.governancePath,
      sub.subscription.agreedAmount,
    );
  }

  async confirm(subscriptionId: string, requesterId: string) {
    const sub = await this.getSubscriptionWithPath(subscriptionId);

    if (sub.subscription.membership.personId !== requesterId) {
      throw new ForbiddenException('يمكنك فقط تأكيد اشتراكاتك الخاصة');
    }
    if (!sub.subscription.membership.isActive) {
      throw new ForbiddenException('العضوية غير نشطة');
    }
    if (sub.subscription.state === SubscriptionState.EXITED) {
      throw new BadRequestException('يجب طلب الاشتراك مجددًا بعد الانسحاب');
    }
    if (sub.subscription.state === SubscriptionState.ACTIVE) {
      throw new BadRequestException('الاشتراك فعال بالفعل');
    }

    const compatibility = await this.evaluateSubscriptionCompatibility(
      sub.subscription.membership,
      sub.subscription.governancePath,
      sub.subscription.agreedAmount,
    );
    const agreedAt = new Date();
    const nextState = compatibility.recommendedState;

    const updated = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          state: nextState,
          policySnapshot: this.buildPolicySnapshot(
            sub.subscription.governancePath,
            sub.subscription.membership.preferences,
            agreedAt,
          ),
          activeAt: nextState === SubscriptionState.ACTIVE ? agreedAt : null,
          suspendedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          personId: requesterId,
          entityId: sub.entityId,
          targetType: 'subscriptions',
          targetId: subscriptionId,
          oldValue: { state: sub.subscription.state },
          newValue: { state: nextState },
        },
      });

      return subscription;
    });

    return { ...updated, compatibilityResult: compatibility };
  }

  async activate(subscriptionId: string, adminId: string) {
    const sub = await this.getSubscriptionWithPath(subscriptionId);
    await this.requireAdminOrFounder(sub.entityId, adminId);

    if (sub.subscription.state === SubscriptionState.ACTIVE) {
      throw new BadRequestException('الاشتراك فعال بالفعل');
    }
    if (sub.subscription.state === SubscriptionState.EXITED) {
      throw new BadRequestException('لا يمكن تفعيل اشتراك منسحب');
    }
    if (!sub.subscription.membership.isActive) {
      throw new BadRequestException('لا يمكن تفعيل اشتراك لعضوية غير نشطة');
    }

    const transitionRules =
      await this.rulesService.evaluateSubscriptionTransitionRules({
        entityId: sub.entityId,
        walletId: sub.subscription.governancePath.walletId,
        pathId: sub.subscription.governancePathId,
        membershipId: sub.subscription.membershipId,
        fromState: sub.subscription.state,
        toState: SubscriptionState.ACTIVE,
        suspendedAt: sub.subscription.suspendedAt,
      });
    if (!transitionRules.allowed) {
      throw new BadRequestException(
        `يخالف الانتقال القواعد المحددة: ${transitionRules.violations.join('؛ ')}`,
      );
    }

    const compatibility = await this.evaluateSubscriptionCompatibility(
      sub.subscription.membership,
      sub.subscription.governancePath,
      sub.subscription.agreedAmount,
    );
    if (!compatibility.isEligible) {
      throw new BadRequestException({
        message: 'لا يمكن تفعيل اشتراك غير متوافق',
        conflicts: compatibility.conflicts,
      });
    }

    const activeAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          state: SubscriptionState.ACTIVE,
          activeAt,
          suspendedAt: null,
          policySnapshot: this.buildPolicySnapshot(
            sub.subscription.governancePath,
            sub.subscription.membership.preferences,
            activeAt,
          ),
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.APPROVE,
          personId: adminId,
          entityId: sub.entityId,
          targetType: 'subscriptions',
          targetId: subscriptionId,
          oldValue: { state: sub.subscription.state },
          newValue: { state: SubscriptionState.ACTIVE },
        },
      });

      return upd;
    });

    // توليد الدفعات المستحقة للأشهر الثلاثة القادمة
    void this.generatePaymentDues(subscriptionId).catch(() => {});

    return updated;
  }

  async generatePaymentDues(subscriptionId: string, months = 3): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        governancePath: { include: { wallet: { select: { policy: true } } } },
      },
    });
    if (!sub || sub.state !== SubscriptionState.ACTIVE) return;

    const amount =
      sub.agreedAmount ?? sub.governancePath.wallet.policy?.subscriptionAmount;
    if (!amount) return;

    const baseDate = sub.activeAt ?? new Date();
    for (let i = 0; i < months; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      const periodLabel = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;

      await this.prisma.paymentDue.upsert({
        where: { subscriptionId_periodLabel: { subscriptionId, periodLabel } },
        update: {},
        create: {
          subscriptionId,
          periodLabel,
          dueDate,
          amountDue: amount,
        },
      });
    }
  }

  async getMyPaymentDues(personId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { personId, isActive: true },
      select: { id: true },
    });
    const membershipIds = memberships.map((m) => m.id);

    return this.prisma.paymentDue.findMany({
      where: {
        subscription: {
          membershipId: { in: membershipIds },
          state: SubscriptionState.ACTIVE,
        },
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      include: {
        subscription: {
          include: {
            membership: {
              select: {
                entityId: true,
                person: { select: { id: true, name: true, username: true } },
              },
            },
            governancePath: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createPaymentRecord(personId: string, dto: CreatePaymentRecordDto) {
    const due = await this.prisma.paymentDue.findUnique({
      where: { id: dto.paymentDueId },
      include: {
        subscription: {
          include: {
            membership: {
              select: { personId: true, entityId: true },
            },
            governancePath: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!due) throw new NotFoundException('الدفعة المستحقة غير موجودة');

    if (due.subscription.membership.personId !== personId) {
      throw new ForbiddenException('يمكنك رفع إثبات سداد لدفعاتك فقط');
    }
    if (due.subscription.state !== SubscriptionState.ACTIVE) {
      throw new BadRequestException('الاشتراك غير فعّال');
    }
    if (
      due.status !== PaymentDueStatus.PENDING &&
      due.status !== PaymentDueStatus.OVERDUE
    ) {
      throw new BadRequestException('هذه الدفعة ليست بانتظار السداد');
    }
    if (due.transactionId) {
      throw new ConflictException('هذه الدفعة مرتبطة بسداد سابق');
    }

    const existingPending = await this.prisma.paymentRecord.findFirst({
      where: {
        paymentDueId: due.id,
        status: PaymentRecordStatus.SUBMITTED,
      },
      select: { id: true },
    });
    if (existingPending) {
      throw new ConflictException(
        'يوجد إثبات سداد قيد المراجعة لهذه الدفعة بالفعل',
      );
    }

    const duplicateReference = await this.prisma.paymentRecord.findFirst({
      where: {
        paymentDueId: due.id,
        reference: dto.reference,
        status: {
          in: [PaymentRecordStatus.SUBMITTED, PaymentRecordStatus.CONFIRMED],
        },
      },
      select: { id: true },
    });
    if (duplicateReference) {
      throw new ConflictException('رقم مرجع السداد مستخدم لهذه الدفعة مسبقاً');
    }

    const record = await this.prisma.paymentRecord.create({
      data: {
        subscriptionId: due.subscriptionId,
        paymentDueId: due.id,
        submittedById: personId,
        amount: due.amountDue,
        reference: dto.reference,
        description: dto.description,
        attachments: dto.attachments ?? [],
        status: PaymentRecordStatus.SUBMITTED,
      },
      include: {
        paymentDue: true,
        subscription: {
          include: {
            governancePath: { select: { id: true, name: true } },
            membership: {
              include: {
                person: { select: { id: true, name: true, username: true } },
              },
            },
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId,
        entityId: due.subscription.membership.entityId,
        targetType: 'payment_records',
        targetId: record.id,
        newValue: {
          paymentDueId: due.id,
          subscriptionId: due.subscriptionId,
          amount: Number(due.amountDue),
          reference: dto.reference,
        },
      },
    });

    return record;
  }

  async getMyPaymentRecords(personId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { personId, isActive: true },
      select: { id: true },
    });
    const membershipIds = memberships.map((membership) => membership.id);

    return this.prisma.paymentRecord.findMany({
      where: {
        subscription: {
          membershipId: { in: membershipIds },
        },
      },
      include: {
        paymentDue: true,
        subscription: {
          include: {
            governancePath: { select: { id: true, name: true } },
            membership: {
              include: {
                person: { select: { id: true, name: true, username: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getEntityPaymentRecords(entityId: string, requesterId: string) {
    await this.requireAdminOrTreasurerOrFounder(entityId, requesterId);

    return this.prisma.paymentRecord.findMany({
      where: {
        subscription: {
          membership: { entityId },
        },
      },
      include: {
        paymentDue: true,
        subscription: {
          include: {
            governancePath: { select: { id: true, name: true } },
            membership: {
              include: {
                person: { select: { id: true, name: true, username: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async approvePaymentRecord(
    id: string,
    reviewerId: string,
    dto: ApprovePaymentRecordDto,
  ) {
    const record = await this.loadPaymentRecordForReview(id);
    await this.requireAdminOrTreasurerOrFounder(
      record.subscription.membership.entityId,
      reviewerId,
    );

    if (record.status !== PaymentRecordStatus.SUBMITTED) {
      throw new ConflictException('إثبات السداد لم يعد في انتظار المراجعة');
    }
    if (
      record.paymentDue.status !== PaymentDueStatus.PENDING &&
      record.paymentDue.status !== PaymentDueStatus.OVERDUE
    ) {
      throw new ConflictException('الدفعة لم تعد متاحة للاعتماد');
    }
    if (record.paymentDue.transactionId) {
      throw new ConflictException('تم تسجيل سداد هذه الدفعة مسبقاً');
    }

    const confirmedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const transaction = await this.ledgerService.recordPaymentWithClient(
        tx,
        reviewerId,
        {
          subscriptionId: record.subscriptionId,
          paymentDueId: record.paymentDueId,
          amount: Number(record.amount),
          reference: record.reference,
          description:
            record.description ??
            `سداد اشتراك للفترة ${record.paymentDue.periodLabel}`,
          attachments: record.attachments,
        },
      );

      const paymentRecord = await tx.paymentRecord.update({
        where: { id },
        data: {
          status: PaymentRecordStatus.CONFIRMED,
          reviewedById: reviewerId,
          reviewerNotes: dto.reviewerNotes,
          reviewedAt: confirmedAt,
          confirmedAt,
          transactionId: transaction.id,
        },
        include: {
          paymentDue: true,
          subscription: {
            include: {
              governancePath: { select: { id: true, name: true } },
              membership: {
                include: {
                  person: {
                    select: { id: true, name: true, username: true },
                  },
                },
              },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.APPROVE,
          personId: reviewerId,
          entityId: record.subscription.membership.entityId,
          targetType: 'payment_records',
          targetId: id,
          newValue: {
            status: PaymentRecordStatus.CONFIRMED,
            transactionId: transaction.id,
          },
        },
      });

      return paymentRecord;
    });

    void this.notificationsService
      .notifyPaymentRecorded(
        record.subscription.membership.personId,
        Number(record.amount),
        record.subscriptionId,
      )
      .catch(() => {});

    return updated;
  }

  async rejectPaymentRecord(
    id: string,
    reviewerId: string,
    dto: RejectPaymentRecordDto,
  ) {
    const record = await this.loadPaymentRecordForReview(id);
    await this.requireAdminOrTreasurerOrFounder(
      record.subscription.membership.entityId,
      reviewerId,
    );

    if (record.status !== PaymentRecordStatus.SUBMITTED) {
      throw new ConflictException('إثبات السداد لم يعد في انتظار المراجعة');
    }

    const updated = await this.prisma.paymentRecord.update({
      where: { id },
      data: {
        status: PaymentRecordStatus.REJECTED,
        reviewedById: reviewerId,
        reviewerNotes: dto.reviewerNotes,
        reviewedAt: new Date(),
      },
      include: {
        paymentDue: true,
        subscription: {
          include: {
            governancePath: { select: { id: true, name: true } },
            membership: {
              include: {
                person: { select: { id: true, name: true, username: true } },
              },
            },
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.REJECT,
        personId: reviewerId,
        entityId: record.subscription.membership.entityId,
        targetType: 'payment_records',
        targetId: id,
        newValue: {
          status: PaymentRecordStatus.REJECTED,
          reason: dto.reviewerNotes,
        },
      },
    });

    return updated;
  }

  async cancelPaymentRecord(id: string, requesterId: string) {
    const record = await this.loadPaymentRecordForReview(id);

    if (record.submittedById !== requesterId) {
      throw new ForbiddenException(
        'يمكنك إلغاء إثباتات السداد التي رفعتها فقط',
      );
    }
    if (record.status !== PaymentRecordStatus.SUBMITTED) {
      throw new BadRequestException('لا يمكن إلغاء إثبات سداد تمت مراجعته');
    }

    return this.prisma.paymentRecord.update({
      where: { id },
      data: { status: PaymentRecordStatus.CANCELLED },
      include: {
        paymentDue: true,
        subscription: {
          include: {
            governancePath: { select: { id: true, name: true } },
            membership: {
              include: {
                person: { select: { id: true, name: true, username: true } },
              },
            },
          },
        },
      },
    });
  }

  async settlePaymentDue(
    dueId: string,
    transactionId: string,
    adminId: string,
  ) {
    const due = await this.prisma.paymentDue.findUnique({
      where: { id: dueId },
      include: {
        subscription: {
          include: {
            membership: { select: { personId: true, entityId: true } },
          },
        },
      },
    });
    if (!due) throw new NotFoundException('الدفعة المستحقة غير موجودة');

    await this.requireAdminOrFounder(
      due.subscription.membership.entityId,
      adminId,
    );

    return this.prisma.paymentDue.update({
      where: { id: dueId },
      data: { status: 'PAID', settledAt: new Date(), transactionId },
    });
  }

  async suspend(subscriptionId: string, adminId: string) {
    const sub = await this.getSubscriptionWithPath(subscriptionId);
    await this.requireAdminOrFounder(sub.entityId, adminId);

    if (sub.subscription.state !== SubscriptionState.ACTIVE) {
      throw new BadRequestException('يمكن تعليق الاشتراكات النشطة فقط');
    }

    const transitionRules =
      await this.rulesService.evaluateSubscriptionTransitionRules({
        entityId: sub.entityId,
        walletId: sub.subscription.governancePath.walletId,
        pathId: sub.subscription.governancePathId,
        membershipId: sub.subscription.membershipId,
        fromState: SubscriptionState.ACTIVE,
        toState: SubscriptionState.SUSPENDED,
      });
    if (!transitionRules.allowed) {
      throw new BadRequestException(
        `يخالف التعليق القواعد المحددة: ${transitionRules.violations.join('؛ ')}`,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { state: SubscriptionState.SUSPENDED, suspendedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: sub.entityId,
        targetType: 'subscriptions',
        targetId: subscriptionId,
        newValue: { state: SubscriptionState.SUSPENDED },
      },
    });

    return updated;
  }

  async exit(subscriptionId: string, requesterId: string) {
    const sub = await this.getSubscriptionWithPath(subscriptionId);

    const membership = await this.prisma.membership.findUnique({
      where: { id: sub.subscription.membershipId },
    });
    if (!membership || membership.personId !== requesterId) {
      throw new ForbiddenException('يمكنك فقط الانسحاب من اشتراكاتك الخاصة');
    }

    if (sub.subscription.state === SubscriptionState.EXITED) {
      throw new BadRequestException('الاشتراك منسحب بالفعل');
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { state: SubscriptionState.EXITED, exitedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: requesterId,
        entityId: sub.entityId,
        targetType: 'subscriptions',
        targetId: subscriptionId,
        newValue: { state: SubscriptionState.EXITED },
      },
    });
  }

  // ── تحديث حالة الاشتراكات عند تغيير حوكمة المسار ──────────────────
  async onGovernanceChanged(pathId: string): Promise<void> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        governancePathId: pathId,
        state: {
          in: [SubscriptionState.ACTIVE, SubscriptionState.CONDITIONAL],
        },
      },
      include: {
        membership: { include: { preferences: true } },
        governancePath: {
          include: {
            policy: true,
            wallet: { select: { entityId: true } },
          },
        },
      },
    });

    const suspendedPersonIds: string[] = [];
    const allAffectedPersonIds: string[] = [];
    const pathName = subscriptions[0]?.governancePath?.name ?? 'مسار الحوكمة';

    for (const sub of subscriptions) {
      allAffectedPersonIds.push(sub.membership.personId);
      const compatibility = await this.evaluateSubscriptionCompatibility(
        sub.membership,
        sub.governancePath,
        sub.agreedAmount,
      );
      if (!compatibility.isEligible && sub.state === SubscriptionState.ACTIVE) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { state: SubscriptionState.SUSPENDED, suspendedAt: new Date() },
        });
        await this.prisma.auditLog.create({
          data: {
            action: AuditAction.UPDATE,
            personId: sub.membership.personId,
            entityId: sub.governancePath.wallet.entityId,
            targetType: 'subscriptions',
            targetId: sub.id,
            newValue: {
              state: SubscriptionState.SUSPENDED,
              reason: 'governance_changed_incompatible',
            },
          },
        });
        suspendedPersonIds.push(sub.membership.personId);
      }
    }

    if (allAffectedPersonIds.length > 0) {
      void this.notificationsService
        .notifyGovernanceChanged(pathId, allAffectedPersonIds, pathName)
        .catch(() => {});
    }
  }

  private async evaluateSubscriptionCompatibility(
    membership: {
      id: string;
      isActive: boolean;
      preferences: MemberPreference | null;
    },
    path: PathWithPolicy,
    agreedAmount: unknown,
  ): Promise<CompatibilityResult> {
    const compatibility = await this.checkCompatibility(
      membership.preferences,
      path,
    );
    const hasAuditor = !!(await this.prisma.membership.findFirst({
      where: {
        entityId: path.wallet.entityId,
        role: MemberRole.AUDITOR,
        isActive: true,
      },
      select: { id: true },
    }));

    const rulesResult = await this.rulesService.evaluateSubscriptionRules({
      entityId: path.wallet.entityId,
      walletId: path.walletId,
      pathId: path.id,
      pathType: path.type,
      membershipId: membership.id,
      agreedAmount:
        agreedAmount === null || agreedAmount === undefined
          ? null
          : Number(agreedAmount),
      hasActiveMembership: membership.isActive,
      hasAuditor,
      hasCommitteeApprovalPath:
        path.type === GovernancePathType.COMMITTEE ||
        path.type === GovernancePathType.BOARD ||
        path.policy?.voteType === VoteType.COMMITTEE_APPROVAL,
      allowAppeals: path.policy?.allowAppeals ?? true,
    });

    if (rulesResult.allowed) {
      return compatibility;
    }

    return {
      ...compatibility,
      isEligible: false,
      canVote: false,
      canBenefit: false,
      conflicts: [
        ...compatibility.conflicts,
        ...rulesResult.violations.map((violation) => ({
          field: 'rule',
          memberValue: 'N/A',
          pathValue: 'N/A',
          resolution: violation,
        })),
      ],
      recommendedState: SubscriptionState.CONDITIONAL,
    };
  }

  // ── محرك التوافق (المرحلة 1) ──────────────────────────────────────
  private async checkCompatibility(
    preferences: MemberPreference | null,
    path: PathWithPolicy,
  ): Promise<CompatibilityResult> {
    const conflicts: CompatibilityConflict[] = [];

    if (!path.isActive) {
      conflicts.push({
        field: 'pathStatus',
        memberValue: 'ACTIVE_REQUIRED',
        pathValue: 'INACTIVE',
        resolution: 'اختر مسارًا نشطًا',
      });
    }

    if (
      preferences &&
      preferences.acceptedGovernanceTypes.length > 0 &&
      !preferences.acceptedGovernanceTypes.includes(path.type)
    ) {
      conflicts.push({
        field: 'governanceType',
        memberValue: preferences.acceptedGovernanceTypes.join(','),
        pathValue: path.type,
        resolution: 'اختر مسارًا من أنواع الحوكمة المقبولة لديك',
      });
    }

    if (
      preferences &&
      path.type === GovernancePathType.INDIVIDUAL_WITH_CAP &&
      preferences.maxSpendingCapAccepted !== null &&
      path.policy?.individualSpendingCap !== null &&
      path.policy?.individualSpendingCap !== undefined &&
      Number(preferences.maxSpendingCapAccepted) <
        Number(path.policy.individualSpendingCap)
    ) {
      conflicts.push({
        field: 'individualSpendingCap',
        memberValue: preferences.maxSpendingCapAccepted.toString(),
        pathValue: path.policy.individualSpendingCap.toString(),
        resolution: 'اختر مسارًا بسقف صرف يطابق الحد المقبول لديك',
      });
    }

    if (preferences?.requiresAuditAccess) {
      const auditor = await this.prisma.membership.findFirst({
        where: {
          entityId: path.wallet.entityId,
          role: MemberRole.AUDITOR,
          isActive: true,
        },
      });
      if (!auditor) {
        conflicts.push({
          field: 'requiresAuditAccess',
          memberValue: 'true',
          pathValue: 'false',
          resolution: 'يجب تعيين مراجع نشط في الكيان',
        });
      }
    }

    if (preferences?.requiresCommitteeApproval) {
      const hasCommitteeGovernance =
        path.type === GovernancePathType.COMMITTEE ||
        path.type === GovernancePathType.BOARD ||
        path.policy?.voteType === VoteType.COMMITTEE_APPROVAL;
      if (!hasCommitteeGovernance) {
        conflicts.push({
          field: 'requiresCommitteeApproval',
          memberValue: 'true',
          pathValue: path.type,
          resolution: 'اختر مسارًا يعتمد موافقة لجنة',
        });
      }
    }

    const isEligible = conflicts.length === 0;
    return {
      isEligible,
      canVote:
        isEligible &&
        path.type !== GovernancePathType.DONATION_ONLY &&
        path.policy?.voteType !== VoteType.INDIVIDUAL_WITH_CAP,
      canBenefit: isEligible && path.type !== GovernancePathType.DONATION_ONLY,
      canAppeal: path.policy?.allowAppeals ?? true,
      conflicts,
      recommendedState: isEligible
        ? SubscriptionState.ACTIVE
        : SubscriptionState.CONDITIONAL,
    };
  }

  private async getSubscriptionWithPath(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        governancePath: {
          include: {
            policy: true,
            wallet: { select: { entityId: true } },
          },
        },
        membership: { include: { preferences: true } },
      },
    });
    if (!subscription) throw new NotFoundException('الاشتراك غير موجود');
    return {
      subscription,
      entityId: subscription.governancePath.wallet.entityId,
    };
  }

  private async loadPaymentRecordForReview(id: string) {
    const record = await this.prisma.paymentRecord.findUnique({
      where: { id },
      include: {
        paymentDue: true,
        subscription: {
          include: {
            governancePath: { select: { id: true, name: true } },
            membership: {
              include: {
                person: { select: { id: true, name: true, username: true } },
              },
            },
          },
        },
      },
    });
    if (!record) throw new NotFoundException('إثبات السداد غير موجود');
    return record;
  }

  private buildPolicySnapshot(
    path: PathWithPolicy,
    preferences: MemberPreference | null,
    agreedAt: Date | null,
  ) {
    return {
      pathId: path.id,
      pathType: path.type,
      pathPolicySnapshot: path.policy
        ? {
            voteType: path.policy.voteType,
            individualSpendingCap:
              path.policy.individualSpendingCap?.toString() ?? null,
            requiresDocuments: path.policy.requiresDocuments,
            quorumPercent: path.policy.quorumPercent,
            approvalPercent: path.policy.approvalPercent,
            votingDurationHours: path.policy.votingDurationHours,
            allowAppeals: path.policy.allowAppeals,
            appealWindowDays: path.policy.appealWindowDays,
            allowBalanceTransfer: path.policy.allowBalanceTransfer,
            version: path.policy.version,
          }
        : null,
      memberPreferencesSnapshot: preferences
        ? {
            acceptedGovernanceTypes: preferences.acceptedGovernanceTypes,
            maxSpendingCapAccepted:
              preferences.maxSpendingCapAccepted?.toString() ?? null,
            requiresAuditAccess: preferences.requiresAuditAccess,
            requiresCommitteeApproval: preferences.requiresCommitteeApproval,
          }
        : null,
      agreedAt: agreedAt?.toISOString() ?? null,
      agreedVersion: path.policy?.version ?? null,
    };
  }

  private async requireAdminOrFounder(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون مديراً أو مؤسساً للكيان');
  }

  private async requireAdminOrTreasurerOrFounder(
    entityId: string,
    personId: string,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.ADMIN, MemberRole.FOUNDER, MemberRole.TREASURER],
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException('تحتاج دور مدير أو مؤسس أو أمين صندوق');
    }
  }

  private async isAdminOrFounder(
    entityId: string,
    personId: string,
  ): Promise<boolean> {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    return !!m;
  }
}
