/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import {
  DecisionResult,
  DecisionStatus,
  DecisionType,
  SubjectType,
  VoteType,
  VotersScope,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DecisionsService } from './decisions.service';

describe('DecisionsService', () => {
  let prisma: {
    governancePath: { findUnique: jest.Mock };
    entityPolicy: { findUnique: jest.Mock };
    membership: { findFirst: jest.Mock; count: jest.Mock };
    decision: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };
  let service: DecisionsService;

  beforeEach(() => {
    prisma = {
      governancePath: { findUnique: jest.fn() },
      entityPolicy: { findUnique: jest.fn().mockResolvedValue(null) },
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'admin-membership' }),
        count: jest.fn(),
      },
      decision: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const mockRulesService = {
      evaluateDecisionRules: jest
        .fn()
        .mockResolvedValue({ allowed: true, violations: [] }),
    };
    const mockSubscriptionsService = {
      onGovernanceChanged: jest.fn().mockResolvedValue(undefined),
    };
    const mockHouseholdsService = {
      findEntityHouseholds: jest.fn(),
    };

    service = new DecisionsService(
      prisma as unknown as PrismaService,
      mockRulesService as never,
      mockSubscriptionsService as never,
      mockHouseholdsService as never,
    );
  });

  it('uses path voting policy instead of request-controlled thresholds', async () => {
    const path = {
      id: 'path-id',
      wallet: { entityId: 'entity-id' },
      policy: {
        voteType: VoteType.TWO_THIRDS,
        quorumPercent: 70,
        approvalPercent: 55,
        votingDurationHours: 24,
      },
    };
    prisma.governancePath.findUnique.mockResolvedValue(path);
    prisma.decision.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'decision-id',
          ...data,
          createdBy: { id: 'admin-id', name: 'Admin' },
        }),
    );

    await service.createDecision('admin-id', {
      type: DecisionType.MODIFY_GOVERNANCE,
      subjectType: SubjectType.PATH,
      subjectId: 'path-id',
      governancePathId: 'path-id',
      title: 'تعديل الحوكمة',
      voteType: VoteType.SIMPLE_MAJORITY,
      votersScope: VotersScope.ALL_MEMBERS,
      quorumPercent: 10,
      approvalPercent: 10,
      closesAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(prisma.decision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          voteType: VoteType.TWO_THIRDS,
          quorumPercent: 70,
          approvalPercent: 67,
        }),
      }),
    );
    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityId: 'entity-id' }),
      }),
    );
  });

  it('marks an overdue decision without quorum as expired', async () => {
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      subjectType: SubjectType.PATH,
      subjectId: 'path-id',
      status: DecisionStatus.OPEN,
      result: DecisionResult.PENDING,
      closesAt: new Date(Date.now() - 60_000),
      quorumPercent: 50,
      approvalPercent: 51,
      votersScope: VotersScope.ALL_MEMBERS,
      governancePathId: 'path-id',
      voteType: VoteType.ONE_MEMBER_ONE_VOTE,
      votes: [],
      governancePath: { wallet: { entityId: 'entity-id' } },
    });
    prisma.membership.count.mockResolvedValue(10);
    prisma.decision.update.mockResolvedValue({
      id: 'decision-id',
      status: DecisionStatus.EXPIRED,
      result: DecisionResult.REJECTED,
    });

    await service.closeDecision('decision-id', 'admin-id');

    expect(prisma.decision.update).toHaveBeenCalledWith({
      where: { id: 'decision-id' },
      data: expect.objectContaining({
        status: DecisionStatus.EXPIRED,
        result: DecisionResult.REJECTED,
      }),
    });
  });

  it('lists only decisions reachable through an active membership', async () => {
    prisma.decision.findMany.mockResolvedValue([]);

    await service.findAccessibleDecisions('person-id');

    expect(prisma.decision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          governancePath: {
            wallet: {
              entity: {
                memberships: {
                  some: { personId: 'person-id', isActive: true },
                },
              },
            },
          },
        },
      }),
    );
  });

  it('requires an approved amount for DISBURSE_FUNDS decisions', async () => {
    await expect(
      service.createDecision('admin-id', {
        type: DecisionType.DISBURSE_FUNDS,
        subjectType: SubjectType.SPENDING_ITEM,
        subjectId: 'spending-item-id',
        governancePathId: 'path-id',
        spendingItemId: 'spending-item-id',
        title: 'صرف علاج',
        voteType: VoteType.SIMPLE_MAJORITY,
        votersScope: VotersScope.ALL_MEMBERS,
        closesAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
