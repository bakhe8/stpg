import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditAction,
  DecisionExecutionStatus,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  GovernancePathType,
  LedgerAccountType,
  MemberRole,
  SubjectType,
  VoteType,
} from '@prisma/client';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { UpdatePathPolicyDto } from './dto/update-path-policy.dto';
import { ClosePathDto } from './dto/close-path.dto';
import { toJsonValue } from '../prisma/json-value';

@Injectable()
export class GovernancePathsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPath(walletId: string, adminId: string, dto: CreatePathDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');

    await this.requireAdminOrFounder(wallet.entityId, adminId);

    // التحقق من سياسة الكيان
    const entityPolicy = await this.prisma.entityPolicy.findUnique({
      where: { entityId: wallet.entityId },
    });
    const allowedGovernanceTypes = entityPolicy?.allowedGovernanceTypes ?? [];
    if (
      allowedGovernanceTypes.length > 0 &&
      !allowedGovernanceTypes.includes(dto.type)
    ) {
      throw new ForbiddenException(
        'نوع الحوكمة هذا غير مسموح به في سياسة الكيان',
      );
    }

    if (entityPolicy && !entityPolicy.allowMultiplePaths) {
      const activePathCount = await this.prisma.governancePath.count({
        where: { walletId, isActive: true },
      });
      if (activePathCount > 0) {
        throw new ForbiddenException(
          'سياسة الكيان لا تسمح بأكثر من مسار حوكمة في المحفظة',
        );
      }
    }

    // محافظ المنفعة المشتركة: مسار واحد فقط لمنع تشتت القرار
    if (wallet.benefitType === 'SHARED') {
      const existingPathsCount = await this.prisma.governancePath.count({
        where: { walletId, isActive: true },
      });
      if (existingPathsCount >= 1) {
        throw new BadRequestException(
          'محافظ المنفعة المشتركة تستخدم مسار حوكمة واحداً فقط — هذا يمنع تشتت القرار في المنافع المشتركة',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const path = await tx.governancePath.create({
        data: {
          walletId,
          name: dto.name,
          type: dto.type,
          description: dto.description,
          policy: {
            create: { voteType: this.defaultVoteType(dto.type) },
          },
          ledgerAccount: { create: { type: LedgerAccountType.PATH } },
        },
        include: { policy: true },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: adminId,
          entityId: wallet.entityId,
          targetType: 'governance_paths',
          targetId: path.id,
          newValue: { name: path.name, type: path.type },
        },
      });

      return path;
    });
  }

  async findWalletPaths(walletId: string, requesterId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');

    await this.requireMember(wallet.entityId, requesterId);

    return this.prisma.governancePath.findMany({
      where: { walletId, isActive: true },
      include: {
        policy: true,
        ledgerAccount: { select: { id: true, balance: true, currency: true } },
        _count: {
          select: {
            subscriptions: { where: { state: 'ACTIVE' } },
            spendingItems: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, requesterId: string) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id },
      include: {
        policy: true,
        wallet: { select: { id: true, name: true, entityId: true } },
        ledgerAccount: { select: { id: true, balance: true, currency: true } },
        _count: {
          select: {
            subscriptions: { where: { state: 'ACTIVE' } },
            spendingItems: { where: { isActive: true } },
          },
        },
      },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');

    await this.requireMember(path.wallet.entityId, requesterId);
    return path;
  }

  async updatePath(id: string, adminId: string, dto: UpdatePathDto) {
    const path = await this.getPathWithEntityOrThrow(id);
    await this.requireAdminOrFounder(path.wallet.entityId, adminId);

    if (dto.type && dto.type !== path.type) {
      throw new BadRequestException(
        'تغيير نوع الحوكمة يتطلب قرار MODIFY_GOVERNANCE معتمد',
      );
    }

    const updated = await this.prisma.governancePath.update({
      where: { id },
      data: dto,
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: path.wallet.entityId,
        targetType: 'governance_paths',
        targetId: id,
        newValue: toJsonValue(dto),
      },
    });

    return updated;
  }

  async getPolicy(pathId: string, requesterId: string) {
    const path = await this.getPathWithEntityOrThrow(pathId);
    await this.requireMember(path.wallet.entityId, requesterId);

    const policy = await this.prisma.pathPolicy.findUnique({
      where: { governancePathId: pathId },
      include: { policyVersions: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!policy) throw new NotFoundException('سياسة المسار غير موجودة');
    return policy;
  }

  async updatePolicy(
    pathId: string,
    adminId: string,
    dto: UpdatePathPolicyDto,
  ) {
    const path = await this.getPathWithEntityOrThrow(pathId);
    await this.requireAdminOrFounder(path.wallet.entityId, adminId);

    const activeSubscriptionCount = await this.prisma.subscription.count({
      where: {
        governancePathId: pathId,
        state: 'ACTIVE',
      },
    });
    if (activeSubscriptionCount > 0) {
      throw new BadRequestException(
        'تعديل سياسة مسار فعّال يتطلب قرار MODIFY_GOVERNANCE معتمد',
      );
    }

    const policy = await this.prisma.pathPolicy.findUnique({
      where: { governancePathId: pathId },
    });
    if (!policy) throw new NotFoundException('سياسة المسار غير موجودة');

    return this.prisma.$transaction(async (tx) => {
      await tx.policyVersion.create({
        data: {
          pathPolicyId: policy.id,
          version: policy.version,
          snapshot: toJsonValue(policy),
          changedById: adminId,
        },
      });

      const updated = await tx.pathPolicy.update({
        where: { governancePathId: pathId },
        data: { ...dto, version: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          personId: adminId,
          entityId: path.wallet.entityId,
          targetType: 'path_policies',
          targetId: policy.id,
          oldValue: toJsonValue(policy),
          newValue: toJsonValue(dto),
        },
      });

      return updated;
    });
  }

  async closePath(pathId: string, adminId: string, dto: ClosePathDto) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: {
        wallet: { select: { entityId: true } },
        ledgerAccount: { select: { balance: true } },
        _count: {
          select: {
            subscriptions: {
              where: { state: { in: ['ACTIVE', 'CONDITIONAL', 'SUSPENDED'] } },
            },
          },
        },
      },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');
    await this.requireAdminOrFounder(path.wallet.entityId, adminId);

    if (!path.isActive) {
      throw new BadRequestException('مسار الحوكمة مغلق بالفعل');
    }
    if (path._count.subscriptions > 0) {
      throw new BadRequestException(
        'يجب إنهاء الاشتراكات المرتبطة بالمسار قبل إغلاقه',
      );
    }
    if (path.ledgerAccount && !path.ledgerAccount.balance.isZero()) {
      throw new BadRequestException('لا يمكن إغلاق مسار برصيد غير صفري');
    }

    const decision = await this.prisma.decision.findUnique({
      where: { id: dto.decisionId },
    });
    if (
      !decision ||
      decision.decisionType !== DecisionType.MODIFY_GOVERNANCE ||
      decision.subjectType !== SubjectType.PATH ||
      decision.subjectId !== pathId ||
      decision.status !== DecisionStatus.CLOSED ||
      decision.result !== DecisionResult.APPROVED
    ) {
      throw new BadRequestException(
        'يتطلب إغلاق المسار قرار MODIFY_GOVERNANCE مغلقاً ومعتمداً',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.governancePath.update({
        where: { id: pathId },
        data: { isActive: false },
      });

      await tx.decision.update({
        where: { id: decision.id },
        data: {
          executionStatus: DecisionExecutionStatus.COMPLETED,
          executionUpdatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          personId: adminId,
          entityId: path.wallet.entityId,
          targetType: 'governance_paths',
          targetId: pathId,
          oldValue: { isActive: true },
          newValue: {
            isActive: false,
            decisionId: decision.id,
          },
        },
      });

      return updated;
    });
  }

  private defaultVoteType(pathType: GovernancePathType): VoteType {
    const map: Record<GovernancePathType, VoteType> = {
      BOARD: VoteType.COMMITTEE_APPROVAL,
      COMMITTEE: VoteType.COMMITTEE_APPROVAL,
      INDIVIDUAL_WITH_CAP: VoteType.INDIVIDUAL_WITH_CAP,
      PUBLIC_VOTE: VoteType.ONE_MEMBER_ONE_VOTE,
      DONATION_ONLY: VoteType.INDIVIDUAL_WITH_CAP,
      EMERGENCY_FAST: VoteType.EMERGENCY_THEN_REVIEW,
    };
    return map[pathType];
  }

  private async getPathWithEntityOrThrow(id: string) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id },
      include: { wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');
    return path;
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

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }
}
