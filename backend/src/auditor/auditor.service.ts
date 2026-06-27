import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputeStatus, DisputeType, MemberRole, Prisma } from '@prisma/client';

@Injectable()
export class AuditorService {
  constructor(private prisma: PrismaService) {}

  async getOperations(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.ledgerTransaction.findMany({
      where: this.transactionEntityWhere(entityId),
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  async getDocuments(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.document.findMany({
      where: { entityId },
      include: {
        // Person only has `name`
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDecisions(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.decision.findMany({
      where: {
        OR: [
          { subjectType: 'ENTITY', subjectId: entityId },
          { governancePath: { wallet: { entityId } } },
        ],
      },
      orderBy: { id: 'desc' },
    });
  }

  async getExceptions(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.decision.findMany({
      where: {
        OR: [
          { subjectType: 'ENTITY', subjectId: entityId },
          { governancePath: { wallet: { entityId } } },
        ],
        // using relatedDecisionId to signify an override or exception
        relatedDecisionId: { not: null },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getConflicts(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.dispute.findMany({
      where: {
        entityId,
        type: DisputeType.MEMBER_CONFLICT,
        status: DisputeStatus.OPEN,
      },
      orderBy: { id: 'desc' },
    });
  }

  async getAppeals(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.dispute.findMany({
      where: {
        entityId,
        type: DisputeType.UNFAIR_DECISION,
        status: DisputeStatus.OPEN,
      },
      orderBy: { id: 'desc' },
    });
  }

  async getReport(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    const period = new Date().toISOString().slice(0, 7);

    const [totalOperations, exceptions, conflicts, appeals, docs] =
      await Promise.all([
        this.prisma.ledgerTransaction.count({
          where: this.transactionEntityWhere(entityId),
        }),
        this.getExceptions(entityId, requesterId),
        this.getConflicts(entityId, requesterId),
        this.prisma.dispute.count({
          where: {
            entityId,
            type: DisputeType.UNFAIR_DECISION,
            status: DisputeStatus.OPEN,
          },
        }),
        this.prisma.document.count({ where: { entityId } }),
      ]);

    const missingDocumentsRate =
      totalOperations > 0
        ? Math.max(0, 100 - (docs / totalOperations) * 100)
        : 0;

    return {
      period,
      totalOperations,
      totalExceptions: exceptions.length,
      totalConflicts: conflicts.length,
      openAppeals: appeals,
      missingDocumentsRate,
    };
  }

  async getAuditLogs(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.auditLog.findMany({
      where: { entityId },
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  private async requireAuditor(entityId: string, personId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.AUDITOR, MemberRole.ADMIN, MemberRole.FOUNDER],
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'يتطلب الوصول دور مراجع أو مدير داخل الكيان',
      );
    }
  }

  private transactionEntityWhere(
    entityId: string,
  ): Prisma.LedgerTransactionWhereInput {
    return {
      OR: [
        { sourceEntityId: entityId },
        { originEntityId: entityId },
        {
          decision: {
            OR: [
              { subjectType: 'ENTITY', subjectId: entityId },
              { governancePath: { wallet: { entityId } } },
            ],
          },
        },
        {
          entries: {
            some: {
              account: {
                OR: [
                  { entityId },
                  { wallet: { entityId } },
                  { governancePath: { wallet: { entityId } } },
                  {
                    spendingItem: { governancePath: { wallet: { entityId } } },
                  },
                ],
              },
            },
          },
        },
      ],
    };
  }
}
