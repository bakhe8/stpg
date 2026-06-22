import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, MemberRole, RelationshipStatus } from '@prisma/client';
import { CreateWalletRelationshipDto } from './dto/create-wallet-relationship.dto';
import { UpdateWalletRelationshipDto } from './dto/update-wallet-relationship.dto';
import { toJsonValue } from '../prisma/json-value';
import { RejectWalletRelationshipDto } from './dto/reject-wallet-relationship.dto';

@Injectable()
export class WalletRelationshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRelationship(
    creatorId: string,
    dto: CreateWalletRelationshipDto,
  ) {
    if (dto.sourceWalletId === dto.targetWalletId) {
      throw new BadRequestException('لا يمكن ربط المحفظة بنفسها');
    }

    const [sourceWallet, targetWallet] = await Promise.all([
      this.prisma.wallet.findUnique({
        where: { id: dto.sourceWalletId },
        select: { id: true, entityId: true, name: true, isActive: true },
      }),
      this.prisma.wallet.findUnique({
        where: { id: dto.targetWalletId },
        select: { id: true, entityId: true, name: true, isActive: true },
      }),
    ]);
    if (!sourceWallet) throw new NotFoundException('المحفظة المصدر غير موجودة');
    if (!targetWallet) throw new NotFoundException('المحفظة الهدف غير موجودة');
    if (!sourceWallet.isActive || !targetWallet.isActive) {
      throw new BadRequestException('لا يمكن ربط محفظة مغلقة');
    }

    await this.requireAdminOrFounder(sourceWallet.entityId, creatorId);

    // إذا كانت المحافظ من كيانات مختلفة → تأكد من سياسة الكيانين
    if (sourceWallet.entityId !== targetWallet.entityId) {
      const [sourcePolicy, targetPolicy] = await Promise.all([
        this.prisma.entityPolicy.findUnique({
          where: { entityId: sourceWallet.entityId },
        }),
        this.prisma.entityPolicy.findUnique({
          where: { entityId: targetWallet.entityId },
        }),
      ]);
      if (!sourcePolicy?.allowEntityRelations) {
        throw new ForbiddenException(
          'سياسة الكيان المصدر لا تسمح بالمحافظ المشتركة',
        );
      }
      if (!targetPolicy?.allowEntityRelations) {
        throw new ForbiddenException(
          'سياسة الكيان الهدف لا تسمح بالمحافظ المشتركة',
        );
      }
    }

    this.validateRelationshipTerms(dto);

    const existing = await this.prisma.walletRelationship.findFirst({
      where: {
        approvalStatus: {
          in: [RelationshipStatus.PENDING, RelationshipStatus.ACTIVE],
        },
        relationshipType: dto.relationshipType,
        OR: [
          {
            sourceWalletId: dto.sourceWalletId,
            targetWalletId: dto.targetWalletId,
          },
          {
            sourceWalletId: dto.targetWalletId,
            targetWalletId: dto.sourceWalletId,
          },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('علاقة محافظ من هذا النوع موجودة بالفعل');
    }

    return this.prisma.$transaction(async (tx) => {
      const sameEntity = sourceWallet.entityId === targetWallet.entityId;

      const relationship = await tx.walletRelationship.create({
        data: {
          sourceWalletId: dto.sourceWalletId,
          targetWalletId: dto.targetWalletId,
          relationshipType: dto.relationshipType,
          contributionPercent: dto.contributionPercent,
          hasVotingRights: dto.hasVotingRights ?? false,
          hasOversightRights: dto.hasOversightRights ?? false,
          approvalStatus: sameEntity
            ? RelationshipStatus.ACTIVE
            : RelationshipStatus.PENDING,
          approvedById: sameEntity ? creatorId : undefined,
          approvedAt: sameEntity ? new Date() : undefined,
          isActive: sameEntity,
        },
        include: {
          sourceWallet: { select: { id: true, name: true, entityId: true } },
          targetWallet: { select: { id: true, name: true, entityId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: creatorId,
          entityId: sourceWallet.entityId,
          targetType: 'wallet_relationships',
          targetId: relationship.id,
          newValue: {
            type: dto.relationshipType,
            targetWalletId: dto.targetWalletId,
            contributionPercent: dto.contributionPercent,
            approvalStatus: relationship.approvalStatus,
          },
        },
      });

      return relationship;
    });
  }

  async findWalletRelationships(walletId: string, requesterId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { entityId: true },
    });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');

    await this.requireMember(wallet.entityId, requesterId);

    const [outgoing, incoming] = await Promise.all([
      this.prisma.walletRelationship.findMany({
        where: { sourceWalletId: walletId },
        include: {
          targetWallet: {
            select: {
              id: true,
              name: true,
              entityId: true,
              ledgerAccount: { select: { balance: true } },
            },
          },
        },
      }),
      this.prisma.walletRelationship.findMany({
        where: { targetWalletId: walletId },
        include: {
          sourceWallet: {
            select: {
              id: true,
              name: true,
              entityId: true,
              ledgerAccount: { select: { balance: true } },
            },
          },
        },
      }),
    ]);

    return { outgoing, incoming };
  }

  async findById(id: string, requesterId: string) {
    const rel = await this.prisma.walletRelationship.findUnique({
      where: { id },
      include: {
        sourceWallet: { select: { id: true, name: true, entityId: true } },
        targetWallet: { select: { id: true, name: true, entityId: true } },
      },
    });
    if (!rel) throw new NotFoundException('علاقة المحافظ غير موجودة');

    const canAccess =
      (await this.isMember(rel.sourceWallet.entityId, requesterId)) ||
      (await this.isMember(rel.targetWallet.entityId, requesterId));
    if (!canAccess)
      throw new ForbiddenException('ليس لديك صلاحية رؤية هذه العلاقة');

    return rel;
  }

  async updateRelationship(
    id: string,
    adminId: string,
    dto: UpdateWalletRelationshipDto,
  ) {
    const rel = await this.prisma.walletRelationship.findUnique({
      where: { id },
      include: { sourceWallet: { select: { entityId: true } } },
    });
    if (!rel) throw new NotFoundException('علاقة المحافظ غير موجودة');

    await this.requireAdminOrFounder(rel.sourceWallet.entityId, adminId);

    if (
      dto.isActive === true &&
      rel.approvalStatus !== RelationshipStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'لا يمكن تفعيل العلاقة قبل موافقة الطرف الهدف',
      );
    }

    this.validateRelationshipTerms({
      relationshipType: dto.relationshipType ?? rel.relationshipType,
      contributionPercent:
        dto.contributionPercent ?? Number(rel.contributionPercent),
      hasVotingRights: dto.hasVotingRights ?? rel.hasVotingRights,
      hasOversightRights: dto.hasOversightRights ?? rel.hasOversightRights,
    });

    const nextApprovalStatus =
      dto.isActive === false && rel.approvalStatus === RelationshipStatus.ACTIVE
        ? RelationshipStatus.ENDED
        : undefined;

    const updated = await this.prisma.walletRelationship.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        approvalStatus: nextApprovalStatus,
        relationshipType: dto.relationshipType,
        contributionPercent: dto.contributionPercent,
        hasVotingRights: dto.hasVotingRights,
        hasOversightRights: dto.hasOversightRights,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: rel.sourceWallet.entityId,
        targetType: 'wallet_relationships',
        targetId: id,
        newValue: toJsonValue(dto),
      },
    });

    return updated;
  }

  async approveRelationship(id: string, approverId: string) {
    const rel = await this.prisma.walletRelationship.findUnique({
      where: { id },
      include: {
        sourceWallet: { select: { entityId: true } },
        targetWallet: { select: { entityId: true } },
      },
    });
    if (!rel) throw new NotFoundException('علاقة المحافظ غير موجودة');

    await this.requireAdminOrFounder(rel.targetWallet.entityId, approverId);

    if (rel.approvalStatus === RelationshipStatus.ACTIVE) {
      throw new ConflictException('العلاقة معتمدة بالفعل');
    }
    if (rel.approvalStatus === RelationshipStatus.REJECTED) {
      throw new BadRequestException('العلاقة مرفوضة ولا يمكن اعتمادها');
    }
    if (rel.approvalStatus === RelationshipStatus.ENDED) {
      throw new BadRequestException('العلاقة منتهية ولا يمكن اعتمادها');
    }

    const updated = await this.prisma.walletRelationship.update({
      where: { id },
      data: {
        approvalStatus: RelationshipStatus.ACTIVE,
        approvedById: approverId,
        approvedAt: new Date(),
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: approverId,
        entityId: rel.targetWallet.entityId,
        targetType: 'wallet_relationships',
        targetId: id,
        newValue: {
          approvalStatus: RelationshipStatus.ACTIVE,
          approvedById: approverId,
        },
      },
    });

    return updated;
  }

  async rejectRelationship(
    id: string,
    approverId: string,
    dto: RejectWalletRelationshipDto,
  ) {
    const rel = await this.prisma.walletRelationship.findUnique({
      where: { id },
      include: {
        sourceWallet: { select: { entityId: true } },
        targetWallet: { select: { entityId: true } },
      },
    });
    if (!rel) throw new NotFoundException('علاقة المحافظ غير موجودة');

    await this.requireAdminOrFounder(rel.targetWallet.entityId, approverId);

    if (rel.approvalStatus === RelationshipStatus.ACTIVE) {
      throw new ConflictException('العلاقة معتمدة بالفعل ولا يمكن رفضها');
    }
    if (rel.approvalStatus === RelationshipStatus.REJECTED) {
      throw new ConflictException('العلاقة مرفوضة بالفعل');
    }
    if (rel.approvalStatus === RelationshipStatus.ENDED) {
      throw new BadRequestException('العلاقة منتهية بالفعل');
    }

    const updated = await this.prisma.walletRelationship.update({
      where: { id },
      data: {
        approvalStatus: RelationshipStatus.REJECTED,
        isActive: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: approverId,
        entityId: rel.targetWallet.entityId,
        targetType: 'wallet_relationships',
        targetId: id,
        newValue: {
          approvalStatus: RelationshipStatus.REJECTED,
          rejectedById: approverId,
          reason: dto.reason,
        },
      },
    });

    return updated;
  }

  // ── تقرير المحفظة المشتركة: الأرصدة والتشارك ───────────────────
  async getSharedWalletReport(walletId: string, requesterId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        entity: { select: { id: true, name: true } },
        ledgerAccount: { select: { balance: true } },
        outgoingWalletRelationships: {
          where: { isActive: true, relationshipType: 'SHARED' },
          include: {
            targetWallet: {
              include: {
                entity: { select: { name: true } },
                ledgerAccount: { select: { balance: true } },
              },
            },
          },
        },
        incomingWalletRelationships: {
          where: { isActive: true, relationshipType: 'SHARED' },
          include: {
            sourceWallet: {
              include: {
                entity: { select: { name: true } },
                ledgerAccount: { select: { balance: true } },
              },
            },
          },
        },
      },
    });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');

    await this.requireMember(wallet.entityId, requesterId);

    // إجمالي الرصيد للمحافظ المرتبطة
    const linkedBalances = [
      ...wallet.outgoingWalletRelationships.map((r) => ({
        direction: 'outgoing',
        type: r.relationshipType,
        walletId: r.targetWalletId,
        walletName: r.targetWallet.name,
        entityName: r.targetWallet.entity.name,
        balance: r.targetWallet.ledgerAccount?.balance ?? 0,
        contributionPercent: r.contributionPercent,
        hasVotingRights: r.hasVotingRights,
        hasOversightRights: r.hasOversightRights,
      })),
      ...wallet.incomingWalletRelationships.map((r) => ({
        direction: 'incoming',
        type: r.relationshipType,
        walletId: r.sourceWalletId,
        walletName: r.sourceWallet.name,
        entityName: r.sourceWallet.entity.name,
        balance: r.sourceWallet.ledgerAccount?.balance ?? 0,
        contributionPercent: r.contributionPercent,
        hasVotingRights: r.hasVotingRights,
        hasOversightRights: r.hasOversightRights,
      })),
    ];

    return {
      wallet: {
        id: wallet.id,
        name: wallet.name,
        entityName: wallet.entity.name,
        balance: wallet.ledgerAccount?.balance ?? 0,
      },
      linkedWallets: linkedBalances,
      totalLinkedBalance: linkedBalances.reduce(
        (sum, w) => sum + Number(w.balance),
        0,
      ),
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
    if (!m) throw new ForbiddenException('يجب أن تكون مديراً أو مؤسساً');
  }

  private validateRelationshipTerms(dto: {
    relationshipType: string;
    contributionPercent?: number;
    hasVotingRights?: boolean;
    hasOversightRights?: boolean;
  }) {
    if (
      dto.relationshipType === 'SHARED' &&
      (!dto.contributionPercent || dto.contributionPercent <= 0)
    ) {
      throw new BadRequestException('المحفظة المشتركة تتطلب نسبة مساهمة موجبة');
    }
    if (dto.relationshipType === 'SUPPORT' && dto.hasVotingRights) {
      throw new BadRequestException('علاقة الدعم لا تمنح حق التصويت تلقائياً');
    }
    if (
      dto.relationshipType === 'REPORT_ONLY' &&
      (dto.contributionPercent || dto.hasVotingRights)
    ) {
      throw new BadRequestException(
        'علاقة التقارير لا تحمل مساهمة مالية أو حق تصويت',
      );
    }
  }

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }

  private async isMember(entityId: string, personId: string): Promise<boolean> {
    return !!(await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    }));
  }
}
