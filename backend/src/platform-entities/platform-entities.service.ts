import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EntityPlatformStatus,
  PlatformRole,
  SupportSessionStatus,
} from '@prisma/client';

@Injectable()
export class PlatformEntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    status?: string;
    page?: number;
    limit?: number;
    operator?: { id: string; role: PlatformRole };
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    if (filters.operator?.role === PlatformRole.ANALYST) {
      throw new ForbiddenException(
        'المحلل يستخدم /platform/surface/me للمؤشرات المجمعة ولا يرى جدول الكيانات',
      );
    }

    const scopedEntityIds =
      filters.operator?.role === PlatformRole.SUPPORT
        ? await this.activeSupportEntityIds(filters.operator.id)
        : undefined;

    const where = {
      ...(filters.status
        ? { platformStatus: filters.status as EntityPlatformStatus }
        : {}),
      ...(scopedEntityIds ? { id: { in: scopedEntityIds } } : {}),
    };

    const [entities, total] = await Promise.all([
      this.prisma.entity.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          platformStatus: true,
          suspendedAt: true,
          suspendedReason: true,
          foundedAt: true,
          _count: { select: { memberships: true } },
        },
        orderBy: { foundedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.entity.count({ where }),
    ]);

    return { entities, total, page, limit };
  }

  private async activeSupportEntityIds(platformAccountId: string) {
    const sessions = await this.prisma.supportSession.findMany({
      where: {
        platformAccountId,
        status: SupportSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      select: { entityId: true },
    });
    return [...new Set(sessions.map((session) => session.entityId))];
  }

  async suspend(
    entityId: string,
    reason: string,
    statusType: EntityPlatformStatus,
  ) {
    if (statusType === EntityPlatformStatus.ACTIVE) {
      throw new BadRequestException(
        'استخدم endpoint التفعيل لإعادة الكيان لحالة ACTIVE',
      );
    }

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, name: true },
    });
    if (!entity) throw new NotFoundException('الكيان غير موجود');

    const updated = await this.prisma.entity.update({
      where: { id: entityId },
      data: {
        platformStatus: statusType,
        suspendedAt: new Date(),
        suspendedReason: reason,
      },
    });

    // إشعار مؤسس الكيان
    const founder = await this.prisma.membership.findFirst({
      where: { entityId, role: 'FOUNDER', isActive: true },
      select: { personId: true },
    });

    if (founder) {
      await this.prisma.notification.create({
        data: {
          personId: founder.personId,
          type: 'GOVERNANCE_CHANGED',
          title: 'إشعار من فريق المنصة',
          body: `كيانك "${entity.name}" تغيّرت حالته إلى ${statusType}. السبب: ${reason}`,
          targetType: 'ENTITY',
          targetId: entityId,
        },
      });
    }

    return updated;
  }

  async activate(entityId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('الكيان غير موجود');

    return this.prisma.entity.update({
      where: { id: entityId },
      data: {
        platformStatus: EntityPlatformStatus.ACTIVE,
        suspendedAt: null,
        suspendedReason: null,
      },
    });
  }

  async getPlatformAccessLogs(entityId: string) {
    return this.prisma.platformAccessLog.findMany({
      where: { entityId },
      include: {
        platformAccount: {
          select: { name: true, role: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getSuspensionAppeals(filters: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = filters.status ? { status: filters.status } : {};

    const [appeals, total] = await Promise.all([
      this.prisma.platformSuspensionAppeal.findMany({
        where,
        include: {
          submittedBy: { select: { name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.platformSuspensionAppeal.count({ where }),
    ]);

    return { appeals, total, page, limit };
  }

  async respondToAppeal(
    appealId: string,
    response: string,
    status: 'REVIEWED' | 'RESOLVED',
  ) {
    return this.prisma.platformSuspensionAppeal.update({
      where: { id: appealId },
      data: { response, status, resolvedAt: new Date() },
    });
  }
}
