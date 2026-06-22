import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, LedgerAccountType, MemberRole } from '@prisma/client';
import { CreateSpendingItemDto } from './dto/create-spending-item.dto';
import { UpdateSpendingItemDto } from './dto/update-spending-item.dto';
import { toJsonValue } from '../prisma/json-value';

@Injectable()
export class SpendingItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSpendingItem(
    pathId: string,
    adminId: string,
    dto: CreateSpendingItemDto,
  ) {
    const entityId = await this.resolveEntityId(pathId);
    await this.requireAdminOrFounder(entityId, adminId);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.spendingItem.create({
        data: {
          governancePathId: pathId,
          name: dto.name,
          description: dto.description,
          eligibilityCriteria: dto.eligibilityCriteria
            ? toJsonValue(dto.eligibilityCriteria)
            : undefined,
          requiredDocuments: dto.requiredDocuments ?? [],
          maxAmountPerRequest: dto.maxAmountPerRequest,
          maxAmountPerYear: dto.maxAmountPerYear,
          privacyLevel: dto.privacyLevel,
          requiresCommitteeApproval: dto.requiresCommitteeApproval ?? false,
          allowsException: dto.allowsException ?? false,
          ledgerAccount: { create: { type: LedgerAccountType.SPENDING_ITEM } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: adminId,
          entityId,
          targetType: 'spending_items',
          targetId: item.id,
          newValue: { name: item.name },
        },
      });

      return item;
    });
  }

  async findPathItems(pathId: string, requesterId: string) {
    const entityId = await this.resolveEntityId(pathId);
    await this.requireMember(entityId, requesterId);

    return this.prisma.spendingItem.findMany({
      where: { governancePathId: pathId, isActive: true },
      include: { ledgerAccount: { select: { balance: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, requesterId: string) {
    const item = await this.prisma.spendingItem.findUnique({
      where: { id },
      include: { ledgerAccount: { select: { balance: true } } },
    });
    if (!item) throw new NotFoundException('بند الصرف غير موجود');

    const entityId = await this.resolveEntityId(item.governancePathId);
    await this.requireMember(entityId, requesterId);

    return item;
  }

  async updateSpendingItem(
    id: string,
    adminId: string,
    dto: UpdateSpendingItemDto,
  ) {
    const item = await this.prisma.spendingItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('بند الصرف غير موجود');

    const entityId = await this.resolveEntityId(item.governancePathId);
    await this.requireAdminOrFounder(entityId, adminId);

    const updated = await this.prisma.spendingItem.update({
      where: { id },
      data: {
        ...dto,
        eligibilityCriteria: dto.eligibilityCriteria
          ? toJsonValue(dto.eligibilityCriteria)
          : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId,
        targetType: 'spending_items',
        targetId: id,
        newValue: toJsonValue(dto),
      },
    });

    return updated;
  }

  async removeSpendingItem(id: string, adminId: string) {
    const item = await this.prisma.spendingItem.findUnique({
      where: { id },
      include: { ledgerAccount: { select: { id: true } } },
    });
    if (!item) throw new NotFoundException('بند الصرف غير موجود');

    const entityId = await this.resolveEntityId(item.governancePathId);
    await this.requireAdminOrFounder(entityId, adminId);

    if (!item.isActive) {
      throw new BadRequestException('بند الصرف غير نشط بالفعل');
    }

    const entryCount = item.ledgerAccount
      ? await this.prisma.ledgerEntry.count({
          where: { accountId: item.ledgerAccount.id },
        })
      : 0;
    if (entryCount > 0) {
      throw new BadRequestException(
        'لا يمكن حذف بند صرف توجد عليه معاملات مالية',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.spendingItem.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.DELETE,
          personId: adminId,
          entityId,
          targetType: 'spending_items',
          targetId: id,
          oldValue: { isActive: true },
          newValue: { isActive: false },
        },
      });
    });
  }

  // يجلب entityId من سلسلة path → wallet → entity
  private async resolveEntityId(pathId: string): Promise<string> {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: { wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');
    return path.wallet.entityId;
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
