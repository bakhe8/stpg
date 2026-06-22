import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  CreateHouseholdDto,
  AssignMemberToHouseholdDto,
} from './dto/household.dto';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(adminId: string, dto: CreateHouseholdDto) {
    await this.requireAdminOrFounder(dto.entityId, adminId);

    return this.prisma.household.create({
      data: { entityId: dto.entityId, name: dto.name },
      include: {
        members: {
          include: {
            membership: {
              include: { person: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
  }

  async findByEntity(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    return this.prisma.household.findMany({
      where: { entityId },
      include: {
        _count: { select: { members: true } },
        members: {
          include: {
            membership: {
              include: { person: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, requesterId: string) {
    const household = await this.prisma.household.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            membership: {
              include: { person: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!household) throw new NotFoundException('الأسرة غير موجودة');
    await this.requireMember(household.entityId, requesterId);
    return household;
  }

  async assignMember(
    id: string,
    adminId: string,
    dto: AssignMemberToHouseholdDto,
  ) {
    const household = await this.prisma.household.findUnique({ where: { id } });
    if (!household) throw new NotFoundException('الأسرة غير موجودة');

    await this.requireAdminOrFounder(household.entityId, adminId);

    const membership = await this.prisma.membership.findUnique({
      where: { id: dto.membershipId },
    });
    if (!membership) throw new NotFoundException('العضوية غير موجودة');
    if (!membership.isActive) {
      throw new ForbiddenException('لا يمكن إضافة عضو غير نشط للأسرة');
    }
    if (membership.entityId !== household.entityId) {
      throw new ForbiddenException('العضوية لا تنتمي لنفس الكيان');
    }

    // عضو واحد لكل أسرة داخل نفس الكيان
    const existing = await this.prisma.householdMembership.findUnique({
      where: { membershipId: dto.membershipId },
    });
    if (existing) {
      if (existing.householdId === id)
        throw new ConflictException('العضو مضاف لهذه الأسرة مسبقاً');
      throw new ConflictException(
        'العضو منتسب لأسرة أخرى في هذا الكيان — أزله أولاً',
      );
    }

    try {
      return await this.prisma.householdMembership.create({
        data: { householdId: id, membershipId: dto.membershipId },
        include: {
          membership: {
            include: { person: { select: { id: true, name: true } } },
          },
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'العضو منتسب لأسرة أخرى في هذا الكيان — أزله أولاً',
        );
      }
      throw err;
    }
  }

  async removeMember(id: string, membershipId: string, adminId: string) {
    const household = await this.prisma.household.findUnique({ where: { id } });
    if (!household) throw new NotFoundException('الأسرة غير موجودة');

    await this.requireAdminOrFounder(household.entityId, adminId);

    const link = await this.prisma.householdMembership.findUnique({
      where: { membershipId },
    });
    if (!link || link.householdId !== id)
      throw new NotFoundException('العضو غير موجود في هذه الأسرة');

    await this.prisma.householdMembership.delete({ where: { membershipId } });
    return { removed: true };
  }

  async delete(id: string, adminId: string) {
    const household = await this.prisma.household.findUnique({ where: { id } });
    if (!household) throw new NotFoundException('الأسرة غير موجودة');
    await this.requireAdminOrFounder(household.entityId, adminId);

    await this.prisma.$transaction([
      this.prisma.householdMembership.deleteMany({
        where: { householdId: id },
      }),
      this.prisma.household.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }

  // Returns the householdId for a given membershipId, or null if not in any household
  // Used by DecisionsService for ONE_FAMILY_ONE_VOTE to enforce household-level unique constraint
  async getHouseholdIdForMembership(
    membershipId: string,
  ): Promise<string | null> {
    const link = await this.prisma.householdMembership.findUnique({
      where: { membershipId },
      select: { householdId: true },
    });
    return link?.householdId ?? null;
  }

  // Returns: Map of householdId -> list of membershipIds
  // Used by DecisionsService for ONE_FAMILY_ONE_VOTE
  async getHouseholdVoterMap(entityId: string): Promise<Map<string, string[]>> {
    const households = await this.prisma.household.findMany({
      where: { entityId },
      include: { members: { select: { membershipId: true } } },
    });

    const map = new Map<string, string[]>();
    for (const h of households) {
      map.set(
        h.id,
        h.members.map((m) => m.membershipId),
      );
    }
    return map;
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

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }
}
