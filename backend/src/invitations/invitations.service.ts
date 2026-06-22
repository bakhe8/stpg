import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JoinInvitationDto } from './dto/join-invitation.dto';
import { JoinInvitationContextDto } from './dto/join-invitation-context.dto';
import {
  AuditAction,
  MemberRole,
  MembershipApplicationStatus,
  Prisma,
} from '@prisma/client';
import { getRefreshTokenSecret } from '../identity/auth/jwt-secrets';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createInvitation(creatorId: string, dto: CreateInvitationDto) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        personId: creatorId,
        entityId: dto.entityId,
        exitedAt: null,
        role: { in: [MemberRole.FOUNDER, MemberRole.ADMIN] },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'يجب أن تكون مؤسساً أو مديراً لإنشاء رابط دعوة',
      );
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        entityId: dto.entityId,
        createdById: creatorId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        maxUses: dto.maxUses ?? null,
      },
    });

    return { token: invitation.token, invitationId: invitation.id };
  }

  async getInvitationPreview(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            logoUrl: true,
            _count: { select: { memberships: { where: { exitedAt: null } } } },
          },
        },
      },
    });

    if (!invitation) throw new NotFoundException('رابط الدعوة غير موجود');
    this.assertValid(invitation);

    return {
      entityId: invitation.entity.id,
      entityName: invitation.entity.name,
      entityType: invitation.entity.type,
      description: invitation.entity.description,
      logoUrl: invitation.entity.logoUrl,
      memberCount: invitation.entity._count.memberships,
    };
  }

  async joinViaInvitation(token: string, dto: JoinInvitationDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { entity: true },
    });

    if (!invitation) throw new NotFoundException('رابط الدعوة غير موجود');
    this.assertValid(invitation);

    return this.prisma.$transaction(async (tx) => {
      const username = `inv_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

      const person = await tx.person.create({
        data: {
          username,
          name: dto.name,
          phoneNumber: dto.phoneNumber ?? null,
          email: dto.email ?? null,
          isVerified: false,
        },
      });

      const application = await tx.membershipApplication.create({
        data: {
          personId: person.id,
          entityId: invitation.entityId,
          invitationId: invitation.id,
          relationshipDescription: dto.relationshipDescription,
          sponsorName: dto.sponsorName,
          note: dto.note,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedCount: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: person.id,
          entityId: invitation.entityId,
          targetType: 'membership_applications',
          targetId: application.id,
          newValue: {
            status: MembershipApplicationStatus.PENDING,
            invitationId: invitation.id,
          },
        },
      });

      const tokens = await this.issueTokenPair(person, tx);
      return {
        ...tokens,
        application: {
          id: application.id,
          entityId: application.entityId,
          status: application.status,
        },
      };
    });
  }

  async joinViaInvitationAuthenticated(
    token: string,
    personId: string,
    dto: JoinInvitationContextDto,
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { entity: true },
    });

    if (!invitation) throw new NotFoundException('رابط الدعوة غير موجود');
    this.assertValid(invitation);

    const existing = await this.prisma.membership.findFirst({
      where: { personId, entityId: invitation.entityId, exitedAt: null },
    });

    if (existing) {
      throw new ConflictException('أنت عضو بالفعل في هذا الكيان');
    }

    const currentApplication =
      await this.prisma.membershipApplication.findUnique({
        where: {
          personId_entityId: {
            personId,
            entityId: invitation.entityId,
          },
        },
      });
    if (
      currentApplication &&
      (currentApplication.status === MembershipApplicationStatus.PENDING ||
        currentApplication.status === MembershipApplicationStatus.UNDER_REVIEW)
    ) {
      throw new ConflictException('لديك طلب انضمام قيد المراجعة بالفعل');
    }

    const application = await this.prisma.$transaction(async (tx) => {
      const nextApplication = await tx.membershipApplication.upsert({
        where: {
          personId_entityId: {
            personId,
            entityId: invitation.entityId,
          },
        },
        update: {
          invitationId: invitation.id,
          status: MembershipApplicationStatus.PENDING,
          relationshipDescription: dto.relationshipDescription,
          sponsorName: dto.sponsorName,
          note: dto.note,
          reviewedById: null,
          reviewerNotes: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
        create: {
          personId,
          entityId: invitation.entityId,
          invitationId: invitation.id,
          relationshipDescription: dto.relationshipDescription,
          sponsorName: dto.sponsorName,
          note: dto.note,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedCount: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId,
          entityId: invitation.entityId,
          targetType: 'membership_applications',
          targetId: nextApplication.id,
          newValue: {
            status: MembershipApplicationStatus.PENDING,
            invitationId: invitation.id,
          },
        },
      });
      return nextApplication;
    });

    return {
      message: 'تم تقديم طلب الانضمام وهو بانتظار المراجعة',
      entityId: invitation.entityId,
      applicationId: application.id,
      status: application.status,
    };
  }

  private assertValid(invitation: {
    isActive: boolean;
    expiresAt: Date | null;
    maxUses: number | null;
    usedCount: number;
  }) {
    if (!invitation.isActive) {
      throw new ForbiddenException('رابط الدعوة غير فعال');
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new ForbiddenException('رابط الدعوة منتهي الصلاحية');
    }
    if (
      invitation.maxUses !== null &&
      invitation.usedCount >= invitation.maxUses
    ) {
      throw new ForbiddenException('تم استخدام رابط الدعوة بالحد الأقصى');
    }
  }

  private async issueTokenPair(
    person: { id: string; username: string; name: string },
    tx: Prisma.TransactionClient,
  ) {
    const accessToken = this.jwtService.sign(
      { sub: person.id, username: person.username, userType: 'tenant' },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: person.id, jti: randomUUID() },
      { secret: getRefreshTokenSecret(), expiresIn: '7d' },
    );

    await tx.refreshToken.create({
      data: {
        personId: person.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      person: { id: person.id, name: person.name, isVerified: false },
    };
  }
}
