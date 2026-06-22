import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, MemberRole } from '@prisma/client';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { toJsonValue } from '../prisma/json-value';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, requesterId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
      include: {
        person: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        entity: { select: { id: true, name: true, type: true } },
        preferences: true,
      },
    });

    if (!membership) throw new NotFoundException('العضوية غير موجودة');

    const allowed = await this.isMember(membership.entityId, requesterId);
    if (!allowed) throw new ForbiddenException('غير مصرح بالوصول');

    return membership;
  }

  async activate(membershipId: string, adminId: string) {
    const membership = await this.getMembershipOrThrow(membershipId);
    await this.requireAdminOrFounder(membership.entityId, adminId);

    if (membership.isActive) {
      throw new BadRequestException('العضوية نشطة بالفعل');
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { isActive: true, exitedAt: null },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.APPROVE,
        personId: adminId,
        entityId: membership.entityId,
        targetType: 'memberships',
        targetId: membershipId,
        newValue: { isActive: true },
      },
    });

    return updated;
  }

  async updateRole(membershipId: string, adminId: string, dto: UpdateRoleDto) {
    const membership = await this.getMembershipOrThrow(membershipId);
    await this.requireAdminOrFounder(membership.entityId, adminId);

    if (membership.role === MemberRole.FOUNDER) {
      throw new ForbiddenException('لا يمكن تغيير دور المؤسس');
    }
    if (dto.role === MemberRole.FOUNDER) {
      throw new ForbiddenException('نقل دور المؤسس يتطلب مسار نقل ملكية مستقل');
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: membership.entityId,
        targetType: 'memberships',
        targetId: membershipId,
        oldValue: { role: membership.role },
        newValue: { role: dto.role },
      },
    });

    return updated;
  }

  async exitEntity(membershipId: string, requesterId: string) {
    const membership = await this.getMembershipOrThrow(membershipId);

    if (membership.personId !== requesterId) {
      await this.requireAdminOrFounder(membership.entityId, requesterId);
    }

    if (membership.role === MemberRole.FOUNDER) {
      throw new ForbiddenException(
        'المؤسس لا يمكنه الانسحاب — يجب نقل الملكية أولاً',
      );
    }

    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { isActive: false, exitedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: requesterId,
        entityId: membership.entityId,
        targetType: 'memberships',
        targetId: membershipId,
        newValue: {
          isActive: false,
          removedByAdmin: membership.personId !== requesterId,
        },
      },
    });
  }

  async getPreferences(membershipId: string, requesterId: string) {
    const membership = await this.getMembershipOrThrow(membershipId);

    const isOwner = membership.personId === requesterId;
    const isAdmin = await this.isAdminOrFounder(
      membership.entityId,
      requesterId,
    );

    if (!isOwner && !isAdmin) throw new ForbiddenException('غير مصرح بالوصول');

    return (
      (await this.prisma.memberPreference.findUnique({
        where: { membershipId },
      })) ?? null
    );
  }

  async upsertPreferences(
    membershipId: string,
    requesterId: string,
    dto: UpdatePreferencesDto,
  ) {
    const membership = await this.getMembershipOrThrow(membershipId);

    if (membership.personId !== requesterId) {
      throw new ForbiddenException('يمكنك فقط تعديل تفضيلاتك الخاصة');
    }

    const current = await this.prisma.memberPreference.findUnique({
      where: { membershipId },
    });

    return this.prisma.$transaction(async (tx) => {
      const preferences = await tx.memberPreference.upsert({
        where: { membershipId },
        update: {
          acceptedGovernanceTypes: dto.acceptedGovernanceTypes,
          maxSpendingCapAccepted: dto.maxSpendingCapAccepted,
          requiresAuditAccess: dto.requiresAuditAccess,
          requiresCommitteeApproval: dto.requiresCommitteeApproval,
          notes: dto.notes,
        },
        create: {
          membershipId,
          acceptedGovernanceTypes: dto.acceptedGovernanceTypes ?? [],
          maxSpendingCapAccepted: dto.maxSpendingCapAccepted,
          requiresAuditAccess: dto.requiresAuditAccess ?? false,
          requiresCommitteeApproval: dto.requiresCommitteeApproval ?? false,
          notes: dto.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          action: current ? AuditAction.UPDATE : AuditAction.CREATE,
          personId: requesterId,
          entityId: membership.entityId,
          targetType: 'member_preferences',
          targetId: preferences.id,
          oldValue: current ? toJsonValue(current) : undefined,
          newValue: toJsonValue(dto),
        },
      });

      return preferences;
    });
  }

  async addDependent(
    membershipId: string,
    requesterId: string,
    dto: CreateDependentDto,
  ) {
    const membership = await this.getMembershipOrThrow(membershipId);
    const isOwner = membership.personId === requesterId;
    const isAdmin = await this.isAdminOrFounder(
      membership.entityId,
      requesterId,
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('غير مصرح بإضافة معال لهذه العضوية');
    }

    return this.prisma.$transaction(async (tx) => {
      const dependent = await tx.dependent.create({
        data: {
          membershipId,
          name: dto.name,
          relation: dto.relation,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          notes: dto.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: requesterId,
          entityId: membership.entityId,
          targetType: 'dependents',
          targetId: dependent.id,
          newValue: toJsonValue(dependent),
        },
      });

      return dependent;
    });
  }

  private async getMembershipOrThrow(id: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
    });
    if (!membership) throw new NotFoundException('العضوية غير موجودة');
    return membership;
  }

  private async requireAdminOrFounder(entityId: string, personId: string) {
    const ok = await this.isAdminOrFounder(entityId, personId);
    if (!ok)
      throw new ForbiddenException('يجب أن تكون مديراً أو مؤسساً للكيان');
  }

  private async isAdminOrFounder(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    return !!m;
  }

  private async isMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    return !!m;
  }
}
