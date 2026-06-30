import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  AuditAction,
  BeneficiaryType,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  DisbursementRequestStatus,
  MemberRole,
  SubscriptionState,
} from '@prisma/client';
import { buildPrivacyContext, canView } from '../common/privacy.helper';
import { CreateDisbursementRequestDto } from './dto/create-disbursement-request.dto';
import {
  ApproveDisbursementRequestDto,
  RejectDisbursementRequestDto,
  ExecuteDisbursementRequestDto,
} from './dto/review-disbursement-request.dto';

@Injectable()
export class DisbursementRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  async createRequest(
    requesterId: string,
    pathId: string,
    dto: CreateDisbursementRequestDto,
  ) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: { wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');

    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId: path.wallet.entityId,
        personId: requesterId,
        isActive: true,
      },
    });
    if (!membership) throw new ForbiddenException('لست عضواً في هذا الكيان');

    // BL-012 — يتطلب اشتراكاً نشطاً في هذا المسار (ACTIVE أو CONDITIONAL فقط)
    // يمنع: SUPPORTER_ONLY / INTERESTED / SUSPENDED / EXITED
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        membershipId: membership.id,
        governancePathId: pathId,
        state: { in: [SubscriptionState.ACTIVE, SubscriptionState.CONDITIONAL] },
      },
      select: { id: true },
    });
    if (!activeSubscription) {
      throw new ForbiddenException(
        'يتطلب تقديم طلب الصرف اشتراكاً نشطاً في هذا المسار',
      );
    }

    const spendingItem = await this.prisma.spendingItem.findUnique({
      where: { id: dto.spendingItemId },
    });
    if (!spendingItem || spendingItem.governancePathId !== pathId) {
      throw new BadRequestException('بند الصرف لا ينتمي لهذا المسار');
    }

    if (
      spendingItem.maxAmountPerRequest &&
      dto.amount > Number(spendingItem.maxAmountPerRequest)
    ) {
      throw new BadRequestException(
        `المبلغ يتجاوز الحد الأقصى للطلب الواحد (${spendingItem.maxAmountPerRequest.toString()})`,
      );
    }

    const beneficiary = await this.resolveBeneficiary(
      path.wallet.entityId,
      dto.beneficiaryId,
      dto.beneficiaryName,
      dto.beneficiaryNotes,
    );
    await this.ensureAnnualCapNotExceeded(
      beneficiary.id,
      beneficiary.annualCap,
      dto.amount,
    );

    const request = await this.prisma.disbursementRequest.create({
      data: {
        governancePathId: pathId,
        spendingItemId: dto.spendingItemId,
        requestedById: requesterId,
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.displayName,
        beneficiaryNotes: dto.beneficiaryNotes ?? beneficiary.notes,
        amount: dto.amount,
        description: dto.description,
        attachments: dto.attachments ?? [],
        status: DisbursementRequestStatus.PENDING,
      },
      include: {
        beneficiary: {
          select: { id: true, type: true, displayName: true, annualCap: true },
        },
        spendingItem: { select: { id: true, name: true } },
        governancePath: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: requesterId,
        entityId: path.wallet.entityId,
        targetType: 'disbursement_requests',
        targetId: request.id,
        newValue: {
          amount: dto.amount,
          beneficiaryId: beneficiary.id,
          beneficiary: beneficiary.displayName,
        },
      },
    });

    const managers = await this.prisma.membership.findMany({
      where: {
        entityId: path.wallet.entityId,
        isActive: true,
        role: { in: [MemberRole.FOUNDER, MemberRole.ADMIN, MemberRole.TREASURER] },
        personId: { not: requesterId },
      },
      select: { personId: true },
    });
    if (managers.length > 0) {
      await this.prisma.notification.createMany({
        data: managers.map((m) => ({
          personId: m.personId,
          type: 'DISBURSEMENT_REQUESTED',
          title: 'طلب صرف جديد',
          body: `طلب صرف بمبلغ ${dto.amount} لـ${beneficiary.displayName} ينتظر المراجعة.`,
          targetType: 'ENTITY',
          targetId: path.wallet.entityId,
        })),
      });
    }

    return request;
  }

  async findPathRequests(pathId: string, requesterId: string) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: { wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('المسار غير موجود');

    await this.requireMember(path.wallet.entityId, requesterId);

    const isAdmin = await this.isAdminOrTreasurer(
      path.wallet.entityId,
      requesterId,
    );

    const requests = await this.prisma.disbursementRequest.findMany({
      where: {
        governancePathId: pathId,
        ...(isAdmin ? {} : { requestedById: requesterId }),
      },
      include: {
        beneficiary: {
          select: { id: true, type: true, displayName: true, annualCap: true },
        },
        spendingItem: {
          select: { id: true, name: true, privacyLevel: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    // فلترة حسب مستوى الخصوصية لبند الإنفاق
    const privacyCtx = await buildPrivacyContext(
      this.prisma,
      path.wallet.entityId,
      requesterId,
      { pathId },
    );

    return requests.filter((req) => {
      const level = req.spendingItem?.privacyLevel;
      if (!level) return true;
      // المالك دائماً يرى طلبه الخاص
      if (req.requestedById === requesterId) return true;
      return canView(level, privacyCtx);
    });
  }

  async findById(id: string, requesterId: string) {
    const req = await this.prisma.disbursementRequest.findUnique({
      where: { id },
      include: {
        beneficiary: {
          select: { id: true, type: true, displayName: true, annualCap: true },
        },
        spendingItem: { select: { id: true, name: true } },
        governancePath: {
          select: {
            id: true,
            name: true,
            wallet: { select: { entityId: true } },
          },
        },
      },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');

    const isOwner = req.requestedById === requesterId;
    const isAdmin = await this.isAdminOrTreasurer(
      req.governancePath.wallet.entityId,
      requesterId,
    );
    if (!isOwner && !isAdmin) throw new ForbiddenException('ليس لديك صلاحية');

    return req;
  }

  async approveRequest(
    id: string,
    adminId: string,
    dto: ApproveDisbursementRequestDto,
  ) {
    const req = await this.loadAndAuthorize(id, adminId);

    if (req.status !== DisbursementRequestStatus.PENDING) {
      throw new ConflictException('الطلب لم يعد في حالة الانتظار');
    }

    await this.ensureApprovedDisbursementDecision({
      requestId: req.id,
      entityId: req.governancePath.wallet.entityId,
      governancePathId: req.governancePathId,
      spendingItemId: req.spendingItemId,
      amount: req.amount,
      decisionId: dto.decisionId,
      actorId: adminId,
      operation: 'APPROVE_DISBURSEMENT',
      missingDecisionMessage:
        'يجب ربط قرار صرف مغلق ومعتمد قبل اعتماد طلب الصرف.',
    });

    const updated = await this.prisma.disbursementRequest.update({
      where: { id },
      data: {
        status: DisbursementRequestStatus.APPROVED,
        reviewedById: adminId,
        reviewerNotes: dto.reviewerNotes,
        decisionId: dto.decisionId,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.APPROVE,
        personId: adminId,
        entityId: req.governancePath.wallet.entityId,
        targetType: 'disbursement_requests',
        targetId: id,
        newValue: {
          status: 'APPROVED',
          decisionId: dto.decisionId,
          reviewerNotes: dto.reviewerNotes ?? null,
        },
      },
    });

    await this.prisma.notification.create({
      data: {
        personId: req.requestedById,
        type: 'DISBURSEMENT_APPROVED',
        title: 'تم اعتماد طلب الصرف',
        body: `اعتُمد طلب الصرف بمبلغ ${req.amount} وينتظر التنفيذ.`,
        targetType: 'ENTITY',
        targetId: req.governancePath.wallet.entityId,
      },
    });

    return updated;
  }

  async rejectRequest(
    id: string,
    adminId: string,
    dto: RejectDisbursementRequestDto,
  ) {
    const req = await this.loadAndAuthorize(id, adminId);

    if (req.status !== DisbursementRequestStatus.PENDING) {
      throw new ConflictException('الطلب لم يعد في حالة الانتظار');
    }

    const updated = await this.prisma.disbursementRequest.update({
      where: { id },
      data: {
        status: DisbursementRequestStatus.REJECTED,
        reviewedById: adminId,
        reviewerNotes: dto.reviewerNotes,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.REJECT,
        personId: adminId,
        entityId: req.governancePath.wallet.entityId,
        targetType: 'disbursement_requests',
        targetId: id,
        newValue: { status: 'REJECTED', reason: dto.reviewerNotes },
      },
    });

    await this.prisma.notification.create({
      data: {
        personId: req.requestedById,
        type: 'DISBURSEMENT_REJECTED',
        title: 'تعذر اعتماد طلب الصرف',
        body: dto.reviewerNotes ?? 'راجع إدارة الكيان لمعرفة سبب الرفض.',
        targetType: 'ENTITY',
        targetId: req.governancePath.wallet.entityId,
      },
    });

    return updated;
  }

  async executeRequest(
    id: string,
    adminId: string,
    dto: ExecuteDisbursementRequestDto,
  ) {
    const req = await this.loadAndAuthorize(id, adminId);

    if (req.status !== DisbursementRequestStatus.APPROVED) {
      await this.auditDisbursementFailure({
        entityId: req.governancePath.wallet.entityId,
        targetId: req.id,
        actorId: adminId,
        operation: 'EXECUTE_DISBURSEMENT',
        reason: 'يجب اعتماد الطلب أولاً قبل تنفيذه',
        extra: { currentStatus: req.status },
      });
      throw new BadRequestException('يجب اعتماد الطلب أولاً قبل تنفيذه');
    }
    if (req.transactionId) {
      await this.auditDisbursementFailure({
        entityId: req.governancePath.wallet.entityId,
        targetId: req.id,
        actorId: adminId,
        operation: 'EXECUTE_DISBURSEMENT',
        reason: 'تم تنفيذ هذا الطلب مسبقاً',
        extra: { transactionId: req.transactionId },
      });
      throw new ConflictException('تم تنفيذ هذا الطلب مسبقاً');
    }
    if (req.reviewedById === adminId) {
      const reason =
        'لا يمكن للشخص ذاته اعتماد طلب الصرف وتنفيذه (مبدأ الفصل بين المهام)';
      await this.auditDisbursementFailure({
        entityId: req.governancePath.wallet.entityId,
        targetId: req.id,
        actorId: adminId,
        operation: 'EXECUTE_DISBURSEMENT',
        reason,
        extra: { reviewedById: req.reviewedById },
      });
      throw new ForbiddenException(reason);
    }

    await this.ensureApprovedDisbursementDecision({
      requestId: req.id,
      entityId: req.governancePath.wallet.entityId,
      governancePathId: req.governancePathId,
      spendingItemId: req.spendingItemId,
      amount: req.amount,
      decisionId: req.decisionId,
      actorId: adminId,
      operation: 'EXECUTE_DISBURSEMENT',
      missingDecisionMessage:
        'يجب ربط قرار صرف معتمد بالطلب قبل التنفيذ.',
    });

    const ledgerAccount = await this.prisma.ledgerAccount.findUnique({
      where: { governancePathId: req.governancePathId },
    });
    if (!ledgerAccount) {
      await this.auditDisbursementFailure({
        entityId: req.governancePath.wallet.entityId,
        targetId: req.id,
        actorId: adminId,
        operation: 'EXECUTE_DISBURSEMENT',
        reason: 'لا يوجد حساب دفتري لهذا المسار',
        extra: { governancePathId: req.governancePathId },
      });
      throw new BadRequestException('لا يوجد حساب دفتري لهذا المسار');
    }

    const availableBalance = this.toMoneyCents(ledgerAccount.balance);
    const requestedAmount = this.toMoneyCents(req.amount);
    if (availableBalance < requestedAmount) {
      await this.auditDisbursementFailure({
        entityId: req.governancePath.wallet.entityId,
        targetId: req.id,
        actorId: adminId,
        operation: 'EXECUTE_DISBURSEMENT',
        reason: 'رصيد المسار غير كاف للصرف',
        extra: {
          availableBalance: this.moneyToDisplay(ledgerAccount.balance),
          requestedAmount: this.moneyToDisplay(req.amount),
          decisionId: req.decisionId,
        },
      });
      throw new BadRequestException(
        `رصيد المسار (${this.moneyToDisplay(ledgerAccount.balance)}) غير كافٍ للصرف`,
      );
    }

    await this.ensureAnnualCapNotExceeded(
      req.beneficiaryId,
      req.beneficiary?.annualCap ?? null,
      Number(req.amount),
      req.id,
    );

    let transaction: Awaited<ReturnType<LedgerService['recordDisbursement']>>;
    try {
      transaction = await this.ledgerService.recordDisbursement(adminId, {
        pathId: req.governancePathId,
        spendingItemId: req.spendingItemId,
        decisionId: req.decisionId!,
        amount: Number(req.amount),
        description: req.description,
        reference: dto.reference,
        attachments: req.attachments,
      });
    } catch (error) {
      await this.auditDisbursementFailure({
        entityId: req.governancePath.wallet.entityId,
        targetId: req.id,
        actorId: adminId,
        operation: 'EXECUTE_DISBURSEMENT',
        reason: error instanceof Error ? error.message : 'فشل تنفيذ الصرف',
        extra: {
          decisionId: req.decisionId,
          requestedAmount: this.moneyToDisplay(req.amount),
        },
      });
      throw error;
    }

    const updated = await this.prisma.disbursementRequest.update({
      where: { id },
      data: {
        status: DisbursementRequestStatus.EXECUTED,
        transactionId: transaction.id,
        executedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: req.governancePath.wallet.entityId,
        targetType: 'disbursement_requests',
        targetId: id,
        oldValue: { status: DisbursementRequestStatus.APPROVED },
        newValue: {
          status: DisbursementRequestStatus.EXECUTED,
          decisionId: req.decisionId,
          transactionId: transaction.id,
        },
      },
    });

    const beneficiaryPersonId = req.beneficiary?.membership?.personId;
    if (beneficiaryPersonId) {
      await this.prisma.notification.create({
        data: {
          personId: beneficiaryPersonId,
          type: 'DISBURSEMENT_EXECUTED',
          title: 'تم تنفيذ الصرف',
          body: `تم صرف مبلغ ${this.moneyToDisplay(req.amount)} لصالحك.`,
          targetType: 'ENTITY',
          targetId: req.governancePath.wallet.entityId,
        },
      });
    }

    return updated;
  }

  async cancelRequest(id: string, requesterId: string) {
    const req = await this.prisma.disbursementRequest.findUnique({
      where: { id },
      include: {
        governancePath: { select: { wallet: { select: { entityId: true } } } },
      },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    if (req.requestedById !== requesterId) {
      throw new ForbiddenException('يمكن للمقدِّم فقط إلغاء طلبه');
    }
    if (req.status !== DisbursementRequestStatus.PENDING) {
      throw new BadRequestException('لا يمكن إلغاء طلب تمت مراجعته');
    }

    return this.prisma.disbursementRequest.update({
      where: { id },
      data: { status: DisbursementRequestStatus.CANCELLED },
    });
  }

  // ── مساعدات ──────────────────────────────────────────────────────

  private async ensureApprovedDisbursementDecision(params: {
    requestId: string;
    entityId: string;
    governancePathId: string;
    spendingItemId: string;
    amount: unknown;
    decisionId?: string | null;
    actorId: string;
    operation: string;
    missingDecisionMessage: string;
  }) {
    const fail = async (
      reason: string,
      extra: Record<string, string | number | boolean | null | undefined> = {},
    ): Promise<never> => {
      await this.auditDisbursementFailure({
        entityId: params.entityId,
        targetId: params.requestId,
        actorId: params.actorId,
        operation: params.operation,
        reason,
        extra,
      });
      throw new BadRequestException(reason);
    };

    const decisionId = params.decisionId;
    if (!decisionId) {
      return fail(params.missingDecisionMessage);
    }

    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
    });
    if (!decision) {
      return fail('قرار الصرف المرتبط غير موجود', { decisionId });
    }
    if (decision.decisionType !== DecisionType.DISBURSE_FUNDS) {
      return fail('القرار المرتبط ليس قرار صرف', {
        decisionId,
        decisionType: decision.decisionType,
      });
    }
    if (
      decision.status !== DecisionStatus.CLOSED ||
      decision.result !== DecisionResult.APPROVED
    ) {
      return fail('قرار الصرف يجب أن يكون مغلقاً وموافقاً عليه قبل الاعتماد أو التنفيذ', {
        decisionId,
        decisionStatus: decision.status,
        decisionResult: decision.result,
      });
    }
    if (decision.governancePathId !== params.governancePathId) {
      return fail('قرار الصرف لا يخص مسار هذا الطلب', {
        decisionId,
        decisionPathId: decision.governancePathId,
        requestPathId: params.governancePathId,
      });
    }
    if (decision.spendingItemId !== params.spendingItemId) {
      return fail('قرار الصرف لا يخص بند الصرف في هذا الطلب', {
        decisionId,
        decisionSpendingItemId: decision.spendingItemId,
        requestSpendingItemId: params.spendingItemId,
      });
    }
    if (decision.amount === null) {
      return fail('يجب أن يحتوي قرار الصرف على مبلغ يطابق الطلب', {
        decisionId,
      });
    }
    if (this.toMoneyCents(decision.amount) !== this.toMoneyCents(params.amount)) {
      return fail('مبلغ قرار الصرف لا يطابق مبلغ الطلب', {
        decisionId,
        decisionAmount: this.moneyToDisplay(decision.amount),
        requestAmount: this.moneyToDisplay(params.amount),
      });
    }
  }

  private async auditDisbursementFailure(params: {
    entityId: string;
    targetId: string;
    actorId: string;
    operation: string;
    reason: string;
    extra?: Record<string, string | number | boolean | null | undefined>;
  }) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: params.actorId,
        entityId: params.entityId,
        targetType: 'disbursement_requests',
        targetId: params.targetId,
        newValue: {
          operation: params.operation,
          failed: true,
          reason: params.reason,
          ...(params.extra ?? {}),
        },
      },
    });
  }

  private toMoneyCents(value: unknown) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      throw new BadRequestException('قيمة مالية غير صالحة');
    }
    return Math.round(amount * 100);
  }

  private moneyToDisplay(value: unknown) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : String(value);
  }

  private async loadAndAuthorize(id: string, adminId: string) {
    const req = await this.prisma.disbursementRequest.findUnique({
      where: { id },
      include: {
        beneficiary: {
          select: {
            id: true,
            type: true,
            displayName: true,
            annualCap: true,
            membership: { select: { personId: true } },
          },
        },
        governancePath: {
          select: {
            id: true,
            name: true,
            wallet: { select: { entityId: true } },
          },
        },
      },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    await this.requireAdminOrTreasurer(
      req.governancePath.wallet.entityId,
      adminId,
    );
    return req;
  }

  private async resolveBeneficiary(
    entityId: string,
    beneficiaryId?: string,
    beneficiaryName?: string,
    beneficiaryNotes?: string,
  ) {
    if (beneficiaryId) {
      const beneficiary = await this.prisma.beneficiary.findUnique({
        where: { id: beneficiaryId },
      });
      if (
        !beneficiary ||
        beneficiary.entityId !== entityId ||
        !beneficiary.isActive
      ) {
        throw new BadRequestException('المستفيد غير صالح لهذا الكيان');
      }
      return beneficiary;
    }

    const trimmedName = beneficiaryName?.trim();
    if (!trimmedName) {
      throw new BadRequestException(
        'يجب اختيار مستفيد أو إدخال اسم مستفيد خارجي',
      );
    }

    const existingExternal = await this.prisma.beneficiary.findFirst({
      where: {
        entityId,
        type: BeneficiaryType.EXTERNAL,
        displayName: trimmedName,
        isActive: true,
      },
    });
    if (existingExternal) {
      return existingExternal;
    }

    return this.prisma.beneficiary.create({
      data: {
        entityId,
        type: BeneficiaryType.EXTERNAL,
        displayName: trimmedName,
        notes: beneficiaryNotes,
      },
    });
  }

  private async ensureAnnualCapNotExceeded(
    beneficiaryId: string | null | undefined,
    annualCap: unknown,
    amount: number,
    excludedRequestId?: string,
  ) {
    if (!beneficiaryId || annualCap === null || annualCap === undefined) {
      return;
    }

    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const aggregate = await this.prisma.disbursementRequest.aggregate({
      where: {
        beneficiaryId,
        status: DisbursementRequestStatus.EXECUTED,
        executedAt: { gte: startOfYear },
        ...(excludedRequestId ? { id: { not: excludedRequestId } } : {}),
      },
      _sum: { amount: true },
    });

    const used = Number(aggregate._sum.amount ?? 0);
    const cap = Number(annualCap);
    if (used + amount > cap) {
      throw new BadRequestException(
        `المبلغ يتجاوز السقف السنوي للمستفيد (${cap.toFixed(2)})`,
      );
    }
  }

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('لست عضواً في هذا الكيان');
  }

  private async isAdminOrTreasurer(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.ADMIN, MemberRole.FOUNDER, MemberRole.TREASURER],
        },
      },
    });
    return !!m;
  }

  private async requireAdminOrTreasurer(entityId: string, personId: string) {
    const ok = await this.isAdminOrTreasurer(entityId, personId);
    if (!ok) throw new ForbiddenException('تحتاج دور مدير أو أمين صندوق');
  }
}
