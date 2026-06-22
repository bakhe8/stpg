import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import {
  CreateCommitteeDto,
  UpdateCommitteeDto,
  AddCommitteeMemberDto,
} from './dto/create-committee.dto';

@Injectable()
export class CommitteesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(adminId: string, dto: CreateCommitteeDto) {
    await this.requireAdminOrFounder(dto.entityId, adminId);

    return this.prisma.committee.create({
      data: {
        entityId: dto.entityId,
        name: dto.name,
        description: dto.description,
      },
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

    return this.prisma.committee.findMany({
      where: { entityId, isActive: true },
      include: {
        _count: { select: { members: true, paths: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, requesterId: string) {
    const committee = await this.prisma.committee.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            membership: {
              include: { person: { select: { id: true, name: true } } },
            },
          },
        },
        paths: { select: { id: true, name: true, type: true, isActive: true } },
      },
    });
    if (!committee) throw new NotFoundException('اللجنة غير موجودة');

    await this.requireMember(committee.entityId, requesterId);
    return committee;
  }

  async update(id: string, adminId: string, dto: UpdateCommitteeDto) {
    const committee = await this.prisma.committee.findUnique({ where: { id } });
    if (!committee) throw new NotFoundException('اللجنة غير موجودة');

    await this.requireAdminOrFounder(committee.entityId, adminId);

    return this.prisma.committee.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
    });
  }

  async deactivate(id: string, adminId: string) {
    const committee = await this.prisma.committee.findUnique({ where: { id } });
    if (!committee) throw new NotFoundException('اللجنة غير موجودة');

    await this.requireAdminOrFounder(committee.entityId, adminId);

    await this.prisma.committee.update({
      where: { id },
      data: { isActive: false },
    });
    return { deactivated: true };
  }

  async addMember(id: string, adminId: string, dto: AddCommitteeMemberDto) {
    const committee = await this.prisma.committee.findUnique({ where: { id } });
    if (!committee) throw new NotFoundException('اللجنة غير موجودة');

    await this.requireAdminOrFounder(committee.entityId, adminId);

    const membership = await this.prisma.membership.findUnique({
      where: { id: dto.membershipId },
    });
    if (!membership) throw new NotFoundException('العضوية غير موجودة');
    if (membership.entityId !== committee.entityId) {
      throw new ForbiddenException('العضوية لا تنتمي لنفس الكيان');
    }

    const existing = await this.prisma.committeeMembership.findUnique({
      where: {
        committeeId_membershipId: {
          committeeId: id,
          membershipId: dto.membershipId,
        },
      },
    });
    if (existing) throw new ConflictException('العضو مضاف للجنة مسبقاً');

    return this.prisma.committeeMembership.create({
      data: { committeeId: id, membershipId: dto.membershipId },
      include: {
        membership: {
          include: { person: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async removeMember(id: string, membershipId: string, adminId: string) {
    const committee = await this.prisma.committee.findUnique({ where: { id } });
    if (!committee) throw new NotFoundException('اللجنة غير موجودة');

    await this.requireAdminOrFounder(committee.entityId, adminId);

    const link = await this.prisma.committeeMembership.findUnique({
      where: { committeeId_membershipId: { committeeId: id, membershipId } },
    });
    if (!link) throw new NotFoundException('العضو غير موجود في اللجنة');

    await this.prisma.committeeMembership.delete({
      where: { committeeId_membershipId: { committeeId: id, membershipId } },
    });
    return { removed: true };
  }

  async assignPath(id: string, pathId: string, adminId: string) {
    const committee = await this.prisma.committee.findUnique({ where: { id } });
    if (!committee) throw new NotFoundException('اللجنة غير موجودة');

    await this.requireAdminOrFounder(committee.entityId, adminId);

    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: { wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');
    if (path.wallet.entityId !== committee.entityId) {
      throw new ForbiddenException('المسار لا ينتمي لنفس الكيان');
    }

    await this.prisma.governancePath.update({
      where: { id: pathId },
      data: { committeeId: id },
    });
    return { assigned: true };
  }

  async unassignPath(id: string, pathId: string, adminId: string) {
    const committee = await this.prisma.committee.findUnique({ where: { id } });
    if (!committee) throw new NotFoundException('اللجنة غير موجودة');

    await this.requireAdminOrFounder(committee.entityId, adminId);

    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
    });
    if (!path || path.committeeId !== id) {
      throw new NotFoundException('المسار غير مرتبط بهذه اللجنة');
    }

    await this.prisma.governancePath.update({
      where: { id: pathId },
      data: { committeeId: null },
    });
    return { unassigned: true };
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
