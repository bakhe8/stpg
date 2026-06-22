import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformAccessType } from '@prisma/client';

@Injectable()
export class PlatformAccessLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    platformAccountId: string;
    entityId: string;
    accessType: PlatformAccessType;
    dataScope: string;
    reason: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.platformAccessLog.create({ data });
      const admins = await tx.membership.findMany({
        where: {
          entityId: data.entityId,
          isActive: true,
          role: { in: ['FOUNDER', 'ADMIN'] },
        },
        select: { personId: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            personId: admin.personId,
            type: 'PLATFORM_ACCESS',
            title: 'وصول موثق من فريق المنصة',
            body: `السبب: ${data.reason} — النطاق: ${data.dataScope}`,
            targetType: 'ENTITY',
            targetId: data.entityId,
          })),
        });
        await tx.platformAccessLog.update({
          where: { id: log.id },
          data: { notifiedEntityAdmin: true },
        });
        return { ...log, notifiedEntityAdmin: true };
      }

      return log;
    });
  }

  async closeSession(logId: string) {
    return this.prisma.platformAccessLog.update({
      where: { id: logId },
      data: { endedAt: new Date() },
    });
  }

  async findByEntity(entityId: string) {
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

  async markNotified(logId: string) {
    return this.prisma.platformAccessLog.update({
      where: { id: logId },
      data: { notifiedEntityAdmin: true },
    });
  }
}
