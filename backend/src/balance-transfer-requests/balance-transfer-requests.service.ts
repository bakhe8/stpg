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
  TransferReviewStatus,
} from './dto/balance-transfer.dto';
import {
  AuditAction,
  BalanceTransferRequestStatus,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  MemberRole,
  PathPolicy,
  Prisma,
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

    if (dto.status === TransferReviewStatus.REJECTED) {
      return this.prisma.$transaction(async (tx) => {
        const rejected = await tx.balanceTransferRequest.update({
          where: { id },
          data: {
            status: BalanceTransferRequestStatus.REJECTED,
            reviewedById: reviewerId,
            reviewerNotes: dto.reviewerNotes,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            action: AuditAction.REJECT,
            personId: reviewerId,
            entityId,
            targetType: 'balance_transfer_requests',
            targetId: id,
            oldValue: { status: request.status },
            newValue: {
              status: BalanceTransferRequestStatus.REJECTED,
              reviewerNotes: dto.reviewerNotes,
            },
          },
        });

        return rejected;
      });
    }

    const policy = request.fromPath.policy;
    if (!policy) {
      throw new BadRequestException('لا توجد سياسة حوكمة للمسار المصدر');
    }

    return this.prisma.$transaction(async (tx) => {
      const decision = await this.createTransferDecision(
        tx,
        request,
        policy,
        reviewerId,
      );

      const approved = await tx.balanceTransferRequest.update({
        where: { id },
        data: {
          status: BalanceTransferRequestStatus.APPROVED,
          reviewedById: reviewerId,
          reviewerNotes: dto.reviewerNotes,
          reviewedAt: new Date(),
          decisionId: decision.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: reviewerId,
          entityId,
          targetType: 'decisions',
          targetId: decision.id,
          newValue: {
            type: DecisionType.TRANSFER_BALANCE,
            requestId: id,
            autoApproved:
              policy.voteType === VoteType.INDIVIDUAL_WITH_CAP ? true : false,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.APPROVE,
          personId: reviewerId,
          entityId,
          targetType: 'balance_transfer_requests',
          targetId: id,
          oldValue: { status: request.status },
          newValue: {
            status: BalanceTransferRequestStatus.APPROVED,
            decisionId: decision.id,
            reviewerNotes: dto.reviewerNotes,
          },
        },
      });

      return approved;
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

    if (!request.decisionId || !request.decision) {
      throw new BadRequestException('يتطلب تنفيذ النقل قراراً موثقاً');
    }

    if (
      request.decision.status !== DecisionStatus.CLOSED ||
      request.decision.result !== DecisionResult.APPROVED
    ) {
      throw new BadRequestException('القرار المرتبط بالنقل لم يتم اعتماده بعد');
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

  private async createTransferDecision(
    tx: Prisma.TransactionClient,
    request: {
      id: string;
      fromPathId: string;
      toPathId: string;
      amount: Prisma.Decimal | number;
      reason: string;
    },
    policy: PathPolicy,
    reviewerId: string,
  ) {
    const amount = Number(request.amount);
    const now = new Date();
    const isIndividualApproval =
      policy.voteType === VoteType.INDIVIDUAL_WITH_CAP;

    if (isIndividualApproval) {
      const cap =
        policy.individualSpendingCap === null
          ? null
          : Number(policy.individualSpendingCap);
      if (cap === null) {
        throw new BadRequestException(
          'سياسة القرار الفردي لا تحدد سقفاً للنقل',
        );
      }
      if (amount > cap) {
        throw new BadRequestException('مبلغ النقل يتجاوز سقف القرار الفردي');
      }
    }

    return tx.decision.create({
      data: {
        decisionType: DecisionType.TRANSFER_BALANCE,
        subjectType: 'PATH',
        subjectId: request.fromPathId,
        governancePathId: request.fromPathId,
        createdById: reviewerId,
        title: `طلب نقل رصيد بقيمة ${request.amount.toString()}`,
        description: `نقل رصيد إلى المسار الهدف ${request.toPathId}. السبب: ${request.reason}`,
        amount: request.amount,
        voteType: policy.voteType,
        votersScope: VotersScope.PATH_SUBSCRIBERS,
        quorumPercent: policy.quorumPercent ?? 50,
        approvalPercent: policy.approvalPercent ?? 51,
        closesAt: isIndividualApproval
          ? now
          : new Date(
              now.getTime() +
                (policy.votingDurationHours ?? 48) * 60 * 60 * 1000,
            ),
        closedAt: isIndividualApproval ? now : null,
        status: isIndividualApproval
          ? DecisionStatus.CLOSED
          : DecisionStatus.OPEN,
        result: isIndividualApproval
          ? DecisionResult.APPROVED
          : DecisionResult.PENDING,
      },
    });
  }
}
