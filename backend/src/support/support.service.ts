import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, PlatformRole, SupportSessionStatus } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async requestSupportAccess(
    entityId: string,
    platformAccountId: string,
    scope: string,
    hours: number,
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.supportSession.create({
        data: {
          entityId,
          platformAccountId,
          scope,
          expiresAt,
          status: SupportSessionStatus.ACTIVE,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          entityId,
          targetType: 'support_sessions',
          targetId: session.id,
          newValue: {
            platformAccountId,
            scope,
            expiresAt,
            status: SupportSessionStatus.ACTIVE,
          },
        },
      });

      return session;
    });
  }

  async revokeSupportAccess(sessionId: string, entityId: string) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.supportSession.findFirst({
        where: { id: sessionId, entityId },
      });

      if (!session) throw new NotFoundException('Session not found');

      const updated = await tx.supportSession.update({
        where: { id: sessionId },
        data: { status: SupportSessionStatus.REVOKED },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          entityId,
          targetType: 'support_sessions',
          targetId: sessionId,
          oldValue: { status: session.status },
          newValue: { status: SupportSessionStatus.REVOKED },
        },
      });

      return updated;
    });
  }

  async getActiveSessions(
    entityId: string,
    requester: {
      id: string;
      userType: 'tenant' | 'platform';
      role?: PlatformRole;
    },
  ) {
    if (requester.userType === 'tenant') {
      const membership = await this.prisma.membership.findFirst({
        where: { entityId, personId: requester.id, isActive: true },
        select: { id: true },
      });

      if (!membership) {
        throw new ForbiddenException('غير مصرح بعرض جلسات دعم هذا الكيان');
      }
    }

    if (requester.userType === 'platform') {
      if (requester.role === PlatformRole.ANALYST) {
        throw new ForbiddenException(
          'المحلل يرى مؤشرات مجمعة فقط ولا يرى جلسات دعم تفصيلية',
        );
      }
    }

    return this.prisma.supportSession.findMany({
      where: {
        entityId,
        status: SupportSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
        ...(requester.userType === 'platform' &&
        requester.role === PlatformRole.SUPPORT
          ? { platformAccountId: requester.id }
          : {}),
      },
      include: {
        platformAccount: {
          select: { name: true, email: true },
        },
      },
    });
  }
}
