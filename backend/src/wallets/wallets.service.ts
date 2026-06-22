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
  LedgerAccountType,
  MemberRole,
  SubjectType,
} from '@prisma/client';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { UpdateWalletPolicyDto } from './dto/update-wallet-policy.dto';
import { CloseWalletDto } from './dto/close-wallet.dto';
import { toJsonValue } from '../prisma/json-value';
import { SetWalletOwnershipDto } from './dto/set-wallet-ownership.dto';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async createWallet(entityId: string, adminId: string, dto: CreateWalletDto) {
    await this.requireAdminOrFounder(entityId, adminId);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.create({
        data: {
          entityId,
          name: dto.name,
          description: dto.description,
          benefitType: dto.benefitType,
          policy: { create: {} },
          ledgerAccount: { create: { type: LedgerAccountType.WALLET } },
        },
        include: { policy: true },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: adminId,
          entityId,
          targetType: 'wallets',
          targetId: wallet.id,
          newValue: { name: wallet.name, benefitType: wallet.benefitType },
        },
      });

      return wallet;
    });
  }

  async findEntityWallets(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    return this.prisma.wallet.findMany({
      where: { entityId, isActive: true },
      include: {
        _count: { select: { governancePaths: { where: { isActive: true } } } },
        ledgerAccount: { select: { id: true, balance: true, currency: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, requesterId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      include: {
        policy: true,
        ledgerAccount: { select: { id: true, balance: true, currency: true } },
        _count: { select: { governancePaths: { where: { isActive: true } } } },
      },
    });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');

    await this.requireMember(wallet.entityId, requesterId);
    return wallet;
  }

  async updateWallet(id: string, adminId: string, dto: UpdateWalletDto) {
    const wallet = await this.getWalletOrThrow(id);
    await this.requireAdminOrFounder(wallet.entityId, adminId);

    const updated = await this.prisma.wallet.update({
      where: { id },
      data: dto,
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: wallet.entityId,
        targetType: 'wallets',
        targetId: id,
        newValue: toJsonValue(dto),
      },
    });

    return updated;
  }

  async getPolicy(walletId: string, requesterId: string) {
    const wallet = await this.getWalletOrThrow(walletId);
    await this.requireMember(wallet.entityId, requesterId);

    const policy = await this.prisma.walletPolicy.findUnique({
      where: { walletId },
      include: { policyVersions: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!policy) throw new NotFoundException('سياسة المحفظة غير موجودة');
    return policy;
  }

  async updatePolicy(
    walletId: string,
    adminId: string,
    dto: UpdateWalletPolicyDto,
  ) {
    const wallet = await this.getWalletOrThrow(walletId);
    await this.requireAdminOrFounder(wallet.entityId, adminId);

    const policy = await this.prisma.walletPolicy.findUnique({
      where: { walletId },
    });
    if (!policy) throw new NotFoundException('سياسة المحفظة غير موجودة');

    return this.prisma.$transaction(async (tx) => {
      await tx.policyVersion.create({
        data: {
          walletPolicyId: policy.id,
          version: policy.version,
          snapshot: toJsonValue(policy),
          changedById: adminId,
        },
      });

      const updated = await tx.walletPolicy.update({
        where: { walletId },
        data: { ...dto, version: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          personId: adminId,
          entityId: wallet.entityId,
          targetType: 'wallet_policies',
          targetId: policy.id,
          oldValue: toJsonValue(policy),
          newValue: toJsonValue(dto),
        },
      });

      return updated;
    });
  }

  async closeWallet(walletId: string, adminId: string, dto: CloseWalletDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        ledgerAccount: { select: { balance: true } },
        _count: { select: { governancePaths: { where: { isActive: true } } } },
      },
    });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
    await this.requireAdminOrFounder(wallet.entityId, adminId);

    if (!wallet.isActive) {
      throw new BadRequestException('المحفظة مغلقة بالفعل');
    }
    if (wallet._count.governancePaths > 0) {
      throw new BadRequestException('يجب إغلاق مسارات المحفظة النشطة أولاً');
    }
    if (wallet.ledgerAccount && !wallet.ledgerAccount.balance.isZero()) {
      throw new BadRequestException('لا يمكن إغلاق محفظة برصيد غير صفري');
    }

    const decision = await this.prisma.decision.findUnique({
      where: { id: dto.decisionId },
    });
    if (
      !decision ||
      decision.decisionType !== DecisionType.CLOSE_WALLET ||
      decision.subjectType !== SubjectType.WALLET ||
      decision.subjectId !== walletId ||
      decision.status !== DecisionStatus.CLOSED ||
      decision.result !== DecisionResult.APPROVED
    ) {
      throw new BadRequestException(
        'يتطلب إغلاق المحفظة قرار CLOSE_WALLET مغلقاً ومعتمداً',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: walletId },
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
          entityId: wallet.entityId,
          targetType: 'wallets',
          targetId: walletId,
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

  // ── ملكية نسبية للمحفظة ──────────────────────────────────────────
  async setWalletOwnership(
    walletId: string,
    adminId: string,
    dto: SetWalletOwnershipDto,
  ) {
    const wallet = await this.getWalletOrThrow(walletId);
    await this.requireAdminOrFounder(wallet.entityId, adminId);

    if (dto.ownerships.length === 0) {
      throw new BadRequestException('يجب تحديد مالك واحد على الأقل');
    }

    const total = dto.ownerships.reduce((s, o) => s + o.sharePercent, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new BadRequestException(
        `مجموع نسب الملكية يجب أن يساوي 100% (الحالي: ${total.toFixed(2)}%)`,
      );
    }

    const ids = dto.ownerships.map((o) => o.entityId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('لا يمكن تكرار الكيان في قائمة الملكية');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.walletOwnership.deleteMany({ where: { walletId } });

      await tx.walletOwnership.createMany({
        data: dto.ownerships.map((o) => ({
          walletId,
          entityId: o.entityId,
          sharePercent: o.sharePercent,
        })),
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          personId: adminId,
          entityId: wallet.entityId,
          targetType: 'wallet_ownerships',
          targetId: walletId,
          newValue: toJsonValue({ ownerships: dto.ownerships }),
        },
      });

      return tx.walletOwnership.findMany({
        where: { walletId },
        include: { entity: { select: { id: true, name: true, type: true } } },
      });
    });
  }

  async getWalletOwnershipReport(walletId: string, requesterId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        ledgerAccount: { select: { balance: true, currency: true } },
        ownerships: {
          include: {
            entity: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
    await this.requireMember(wallet.entityId, requesterId);

    const balance = Number(wallet.ledgerAccount?.balance ?? 0);
    const currency = wallet.ledgerAccount?.currency ?? 'SAR';

    return {
      walletId,
      balance,
      currency,
      ownerships: wallet.ownerships.map((o) => ({
        entityId: o.entityId,
        entityName: o.entity.name,
        entityType: o.entity.type,
        sharePercent: Number(o.sharePercent),
        shareAmount: parseFloat(
          ((Number(o.sharePercent) / 100) * balance).toFixed(2),
        ),
      })),
    };
  }

  private async getWalletOrThrow(id: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id } });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
    return wallet;
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
