import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputeStatus, DisputeType } from '@prisma/client';

@Injectable()
export class AuditorService {
  constructor(private prisma: PrismaService) {}

  async getOperations() {
    // Note: We use raw query or Prisma relations if we had account.entityId.
    // For now we just return latest transactions overall since STGP is single-entity or we filter by entity somehow
    // Let's just return some ledger transactions. The schema says LedgerTransaction has no direct entityId link except via Decision or maybe we just return all for MVP.
    return this.prisma.ledgerTransaction.findMany({
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  async getDocuments(entityId: string) {
    return this.prisma.document.findMany({
      where: { entityId },
      include: {
        // Person only has `name`
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDecisions(entityId: string) {
    return this.prisma.decision.findMany({
      where: { subjectId: entityId },
      orderBy: { id: 'desc' },
    });
  }

  async getExceptions(entityId: string) {
    return this.prisma.decision.findMany({
      where: {
        subjectId: entityId,
        // using relatedDecisionId to signify an override or exception
        relatedDecisionId: { not: null },
      },
      orderBy: { id: 'desc' },
    });
  }

  getConflicts() {
    // Simplification for MVP: We just return an empty array or try to find some heuristics
    return Promise.resolve([]);
  }

  async getAppeals(entityId: string) {
    return this.prisma.dispute.findMany({
      where: {
        entityId,
        type: DisputeType.UNFAIR_DECISION,
        status: DisputeStatus.OPEN,
      },
      orderBy: { id: 'desc' },
    });
  }

  async getReport(entityId: string) {
    const period = new Date().toISOString().slice(0, 7);

    const [totalOperations, exceptions, conflicts, appeals, docs] =
      await Promise.all([
        this.prisma.ledgerTransaction.count(),
        this.getExceptions(entityId),
        this.getConflicts(),
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

  async getAuditLogs(entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityId },
      orderBy: { id: 'desc' },
      take: 200,
    });
  }
}
