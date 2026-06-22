import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupportSessionStatus } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async requestSupportAccess(entityId: string, platformAccountId: string, scope: string, hours: number) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);

    return this.prisma.supportSession.create({
      data: {
        entityId,
        platformAccountId,
        scope,
        expiresAt,
        status: SupportSessionStatus.ACTIVE,
      },
    });
  }

  async revokeSupportAccess(sessionId: string, entityId: string) {
    const session = await this.prisma.supportSession.findFirst({
      where: { id: sessionId, entityId },
    });

    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.supportSession.update({
      where: { id: sessionId },
      data: { status: SupportSessionStatus.REVOKED },
    });
  }

  async getActiveSessions(entityId: string) {
    return this.prisma.supportSession.findMany({
      where: {
        entityId,
        status: SupportSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      include: {
        platformAccount: {
          select: { name: true, email: true },
        },
      },
    });
  }
}
