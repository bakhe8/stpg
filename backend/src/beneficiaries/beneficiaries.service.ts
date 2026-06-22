import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, BeneficiaryType, MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEntity(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    return this.prisma.beneficiary.findMany({
      where: { entityId, isActive: true },
      include: {
        membership: {
          include: {
            person: { select: { id: true, name: true, username: true } },
          },
        },
        dependent: {
          select: { id: true, name: true, relation: true, membershipId: true },
        },
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async create(
    entityId: string,
    requesterId: string,
    dto: CreateBeneficiaryDto,
  ) {
    await this.requireAdminRole(entityId, requesterId);

    const existing = await this.findExistingBeneficiary(entityId, dto);
    if (existing) {
      return existing;
    }

    const data = await this.buildBeneficiaryData(entityId, dto);

    const beneficiary = await this.prisma.beneficiary.create({
      data,
      include: {
        membership: {
          include: {
            person: { select: { id: true, name: true, username: true } },
          },
        },
        dependent: {
          select: { id: true, name: true, relation: true, membershipId: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: requesterId,
        entityId,
        targetType: 'beneficiaries',
        targetId: beneficiary.id,
        newValue: {
          type: beneficiary.type,
          displayName: beneficiary.displayName,
          annualCap: beneficiary.annualCap?.toString() ?? null,
        },
      },
    });

    return beneficiary;
  }

  private async findExistingBeneficiary(
    entityId: string,
    dto: CreateBeneficiaryDto,
  ) {
    if (dto.membershipId) {
      return this.prisma.beneficiary.findUnique({
        where: { membershipId: dto.membershipId },
        include: {
          membership: {
            include: {
              person: { select: { id: true, name: true, username: true } },
            },
          },
          dependent: {
            select: {
              id: true,
              name: true,
              relation: true,
              membershipId: true,
            },
          },
        },
      });
    }

    if (dto.dependentId) {
      return this.prisma.beneficiary.findUnique({
        where: { dependentId: dto.dependentId },
        include: {
          membership: {
            include: {
              person: { select: { id: true, name: true, username: true } },
            },
          },
          dependent: {
            select: {
              id: true,
              name: true,
              relation: true,
              membershipId: true,
            },
          },
        },
      });
    }

    if (dto.type === BeneficiaryType.EXTERNAL && dto.displayName) {
      return this.prisma.beneficiary.findFirst({
        where: {
          entityId,
          type: BeneficiaryType.EXTERNAL,
          displayName: dto.displayName.trim(),
          isActive: true,
        },
        include: {
          membership: {
            include: {
              person: { select: { id: true, name: true, username: true } },
            },
          },
          dependent: {
            select: {
              id: true,
              name: true,
              relation: true,
              membershipId: true,
            },
          },
        },
      });
    }

    return null;
  }

  private async buildBeneficiaryData(
    entityId: string,
    dto: CreateBeneficiaryDto,
  ) {
    if (dto.type === BeneficiaryType.MEMBER) {
      if (!dto.membershipId) {
        throw new BadRequestException('membershipId مطلوب للمستفيد العضو');
      }

      const membership = await this.prisma.membership.findUnique({
        where: { id: dto.membershipId },
        include: {
          person: { select: { name: true } },
        },
      });
      if (
        !membership ||
        membership.entityId !== entityId ||
        !membership.isActive
      ) {
        throw new NotFoundException('العضوية غير صالحة لهذا الكيان');
      }

      return {
        entityId,
        type: BeneficiaryType.MEMBER,
        membershipId: membership.id,
        displayName: membership.person.name,
        notes: dto.notes,
        annualCap: dto.annualCap,
      };
    }

    if (dto.type === BeneficiaryType.DEPENDENT) {
      if (!dto.dependentId) {
        throw new BadRequestException('dependentId مطلوب للمستفيد المُعال');
      }

      const dependent = await this.prisma.dependent.findUnique({
        where: { id: dto.dependentId },
        include: {
          membership: { select: { entityId: true } },
        },
      });
      if (!dependent || dependent.membership.entityId !== entityId) {
        throw new NotFoundException('المُعال غير صالح لهذا الكيان');
      }

      return {
        entityId,
        type: BeneficiaryType.DEPENDENT,
        dependentId: dependent.id,
        displayName: dependent.name,
        notes: dto.notes ?? dependent.notes,
        annualCap: dto.annualCap,
      };
    }

    if (!dto.displayName?.trim()) {
      throw new BadRequestException('displayName مطلوب للمستفيد الخارجي');
    }

    return {
      entityId,
      type: BeneficiaryType.EXTERNAL,
      displayName: dto.displayName.trim(),
      notes: dto.notes,
      annualCap: dto.annualCap,
    };
  }

  private async requireMember(entityId: string, requesterId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { entityId, personId: requesterId, isActive: true },
    });
    if (!membership) {
      throw new ForbiddenException('يجب أن تكون عضواً في هذا الكيان');
    }
  }

  private async requireAdminRole(entityId: string, requesterId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId: requesterId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    if (!membership) {
      throw new ForbiddenException('إنشاء المستفيدين يتطلب دور مؤسس أو مدير');
    }
  }

  async requireFinanceRole(entityId: string, requesterId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId: requesterId,
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
}
