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
  DisbursementRequestStatus,
  MemberRole,
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
        newValue: { status: 'APPROVED' },
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

    return updated;
  }

  async executeRequest(
    id: string,
    adminId: string,
    dto: ExecuteDisbursementRequestDto,
  ) {
    const req = await this.loadAndAuthorize(id, adminId);

    if (req.status !== DisbursementRequestStatus.APPROVED) {
      throw new BadRequestException('يجب اعتماد الطلب أولاً قبل تنفيذه');
    }
    if (req.transactionId) {
      throw new ConflictException('تم تنفيذ هذا الطلب مسبقاً');
    }

    const ledgerAccount = await this.prisma.ledgerAccount.findUnique({
      where: { governancePathId: req.governancePathId },
    });
    if (!ledgerAccount) {
      throw new BadRequestException('لا يوجد حساب دفتري لهذا المسار');
    }

    if (ledgerAccount.balance < req.amount) {
      throw new BadRequestException(
        `رصيد المسار (${ledgerAccount.balance.toString()}) غير كافٍ للصرف`,
      );
    }

    if (!req.decisionId) {
      throw new BadRequestException(
        'يجب ربط قرار DISBURSE_FUNDS معتمد بالطلب قبل التنفيذ. استخدم نقطة الاعتماد مع decisionId.',
      );
    }

    await this.ensureAnnualCapNotExceeded(
      req.beneficiaryId,
      req.beneficiary?.annualCap ?? null,
      Number(req.amount),
      req.id,
    );

    const transaction = await this.ledgerService.recordDisbursement(adminId, {
      pathId: req.governancePathId,
      spendingItemId: req.spendingItemId,
      decisionId: req.decisionId,
      amount: Number(req.amount),
      description: req.description,
      reference: dto.reference,
      attachments: req.attachments,
    });

    const updated = await this.prisma.disbursementRequest.update({
      where: { id },
      data: {
        status: DisbursementRequestStatus.EXECUTED,
        transactionId: transaction.id,
        executedAt: new Date(),
      },
    });

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

  private async loadAndAuthorize(id: string, adminId: string) {
    const req = await this.prisma.disbursementRequest.findUnique({
      where: { id },
      include: {
        beneficiary: {
          select: { id: true, type: true, displayName: true, annualCap: true },
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
