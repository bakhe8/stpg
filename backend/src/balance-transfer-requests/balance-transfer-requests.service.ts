import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  CreateTransferRequestDto,
  ReviewTransferDto,
} from './dto/balance-transfer.dto';
import {
  AuditAction,
  BalanceTransferRequestStatus,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  MemberRole,
  VoteType,
  VotersScope,
} from '@prisma/client';

@Injectable()
export class BalanceTransferRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
    private readonly ledgerService: LedgerService,
  ) {}

  async createRequest(requesterId: string, dto: CreateTransferRequestDto) {
    const fromPath = await this.prisma.governancePath.findUnique({
      where: { id: dto.fromPathId },
      include: {
        wallet: { select: { entityId: true } },
        policy: true,
        ledgerAccount: true,
      },
    });
    const toPath = await this.prisma.governancePath.findUnique({
      where: { id: dto.toPathId },
      include: { wallet: { select: { entityId: true } } },
    });

    if (!fromPath) throw new NotFoundException('المسار المصدر غير موجود');
    if (!toPath) throw new NotFoundException('المسار الهدف غير موجود');

    const entityId = fromPath.wallet.entityId;
    if (toPath.wallet.entityId !== entityId) {
      throw new BadRequestException('لا يمكن النقل بين كيانات مختلفة');
    }

    // التحقق من صلاحيات مقدم الطلب
    await this.requireAdminOrTreasurer(entityId, requesterId);

    if (!fromPath.policy?.allowBalanceTransfer) {
      throw new ForbiddenException('سياسة المسار لا تسمح بنقل الأرصدة');
    }

    if (Number(fromPath.ledgerAccount?.balance ?? 0) < dto.amount) {
      throw new BadRequestException('الرصيد غير كافٍ في المسار المصدر');
    }

    const transferRules = await this.rulesService.evaluateTransferRules({
      entityId,
      sourceWalletId: fromPath.walletId,
      sourcePathId: dto.fromPathId,
      targetWalletId: toPath.walletId,
      targetPathId: dto.toPathId,
      amount: dto.amount,
    });

    if (!transferRules.allowed) {
      throw new BadRequestException(
        `يُخالف النقل القواعد المحددة: ${transferRules.violations.join('؛ ')}`,
      );
    }

    const request = await this.prisma.balanceTransferRequest.create({
      data: {
        fromPathId: dto.fromPathId,
        toPathId: dto.toPathId,
        amount: dto.amount,
        reason: dto.reason,
        requestedById: requesterId,
        status: BalanceTransferRequestStatus.PENDING,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: requesterId,
        entityId,
        targetType: 'balance_transfer_requests',
        targetId: request.id,
        newValue: {
          amount: dto.amount,
          from: dto.fromPathId,
          to: dto.toPathId,
        },
      },
    });

    return request;
  }

  async reviewRequest(id: string, reviewerId: string, dto: ReviewTransferDto) {
    const request = await this.prisma.balanceTransferRequest.findUnique({
      where: { id },
      include: {
        fromPath: {
          include: {
            wallet: { select: { entityId: true } },
            policy: true,
          },
        },
      },
    });

    if (!request) throw new NotFoundException('طلب النقل غير موجود');
    if (request.status !== BalanceTransferRequestStatus.PENDING) {
      throw new BadRequestException('الطلب لم يعد معلقاً');
    }

    const entityId = request.fromPath.wallet.entityId;
    await this.requireAdminOrTreasurer(entityId, reviewerId);

    if (dto.status === 'REJECTED') {
      return this.prisma.balanceTransferRequest.update({
        where: { id },
        data: {
          status: BalanceTransferRequestStatus.REJECTED,
          reviewedById: reviewerId,
          reviewerNotes: dto.reviewerNotes,
          reviewedAt: new Date(),
        },
      });
    }

    // إذا تمت الموافقة، نتحقق مما إذا كان النقل يتطلب قراراً حوكمياً
    const policy = request.fromPath.policy;
    let decisionId = null;

    if (policy?.voteType && policy.voteType !== VoteType.INDIVIDUAL_WITH_CAP) {
      // إنشاء قرار آلي
      const decision = await this.prisma.decision.create({
        data: {
          decisionType: DecisionType.TRANSFER_BALANCE,
          subjectType: 'PATH',
          subjectId: request.fromPathId,
          governancePathId: request.fromPathId,
          createdById: reviewerId,
          title: `طلب نقل رصيد بقيمة ${request.amount.toString()}`,
          description: `نقل رصيد إلى المسار الهدف للأسباب التالية: ${request.reason}`,
          amount: request.amount,
          voteType: policy.voteType ?? VoteType.SIMPLE_MAJORITY,
          votersScope: VotersScope.PATH_SUBSCRIBERS,
          quorumPercent: policy.quorumPercent ?? 50,
          approvalPercent: policy.approvalPercent ?? 51,
          closesAt: new Date(
            Date.now() + (policy.votingDurationHours ?? 48) * 60 * 60 * 1000,
          ),
          status: DecisionStatus.OPEN,
          result: DecisionResult.PENDING,
        },
      });
      decisionId = decision.id;

      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: reviewerId,
          entityId,
          targetType: 'decisions',
          targetId: decision.id,
          newValue: { type: 'TRANSFER_BALANCE', requestId: id },
        },
      });
    }

    return this.prisma.balanceTransferRequest.update({
      where: { id },
      data: {
        status: BalanceTransferRequestStatus.APPROVED,
        reviewedById: reviewerId,
        reviewerNotes: dto.reviewerNotes,
        reviewedAt: new Date(),
        decisionId,
      },
    });
  }

  async executeRequest(id: string, executorId: string) {
    const request = await this.prisma.balanceTransferRequest.findUnique({
      where: { id },
      include: {
        fromPath: { include: { wallet: { select: { entityId: true } } } },
        decision: true,
      },
    });

    if (!request) throw new NotFoundException('طلب النقل غير موجود');
    if (request.status !== BalanceTransferRequestStatus.APPROVED) {
      throw new BadRequestException('يجب أن يكون الطلب معتمداً قبل تنفيذه');
    }
    if (request.transactionId) {
      throw new BadRequestException('الطلب منفذ مسبقاً');
    }

    const entityId = request.fromPath.wallet.entityId;
    await this.requireAdminOrTreasurer(entityId, executorId);

    // إذا كان هناك قرار مرتبط، يجب أن يكون مغلقاً ومقبولاً
    if (request.decision) {
      if (
        request.decision.status !== DecisionStatus.CLOSED ||
        request.decision.result !== DecisionResult.APPROVED
      ) {
        throw new BadRequestException(
          'القرار المرتبط بالنقل لم يتم اعتماده بعد',
        );
      }
    }

    const reference = `TRF-${Date.now().toString().slice(-6)}-${request.id.slice(0, 4)}`;

    const txn = await this.ledgerService.recordTransfer(executorId, {
      sourcePathId: request.fromPathId,
      targetPathId: request.toPathId,
      amount: Number(request.amount),
      description: request.reason,
      reference,
      decisionId: request.decisionId ?? undefined,
    });

    return this.prisma.balanceTransferRequest.update({
      where: { id },
      data: {
        status: BalanceTransferRequestStatus.EXECUTED,
        transactionId: txn.id,
        executedAt: new Date(),
      },
    });
  }

  async findPathTransfers(pathId: string, requesterId: string) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: { wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('المسار غير موجود');

    await this.requireMember(path.wallet.entityId, requesterId);

    return this.prisma.balanceTransferRequest.findMany({
      where: {
        OR: [{ fromPathId: pathId }, { toPathId: pathId }],
      },
      include: {
        decision: { select: { id: true, status: true, result: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, requesterId: string) {
    const request = await this.prisma.balanceTransferRequest.findUnique({
      where: { id },
      include: {
        fromPath: { include: { wallet: { select: { entityId: true } } } },
        toPath: true,
        decision: { select: { id: true, status: true, result: true } },
      },
    });
    if (!request) throw new NotFoundException('الطلب غير موجود');

    await this.requireMember(request.fromPath.wallet.entityId, requesterId);
    return request;
  }

  private async requireAdminOrTreasurer(entityId: string, personId: string) {
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
    if (!m) throw new ForbiddenException('يجب أن تكون مديراً أو أمين صندوق');
  }

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }
}
