import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  DecisionResult,
  DecisionExecutionStatus,
  DecisionStatus,
  DecisionType,
  MemberRole,
  SubjectType,
  VoteType,
  VotersScope,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DecisionsService } from './decisions.service';

describe('DecisionsService', () => {
  let prisma: {
    person: { findUnique: jest.Mock };
    governancePath: { findUnique: jest.Mock };
    entityPolicy: { findUnique: jest.Mock };
    membership: { findFirst: jest.Mock; count: jest.Mock };
    subscription: { findFirst: jest.Mock; count: jest.Mock };
    household: { count: jest.Mock };
    householdMembership: { findMany: jest.Mock };
    committeeMembership: { findFirst: jest.Mock; count: jest.Mock };
    vote: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
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
      person: { findUnique: jest.fn().mockResolvedValue({ isVerified: true }) },
      governancePath: { findUnique: jest.fn() },
      entityPolicy: { findUnique: jest.fn().mockResolvedValue(null) },
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'admin-membership' }),
        count: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      household: {
        count: jest.fn(),
      },
      householdMembership: {
        findMany: jest.fn(),
      },
      committeeMembership: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      vote: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        create: jest.fn(),
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
    const mockLedgerService = {
      recordTransfer: jest.fn().mockResolvedValue(undefined),
    };

    service = new DecisionsService(
      prisma as unknown as PrismaService,
      mockRulesService as never,
      mockSubscriptionsService as never,
      mockHouseholdsService as never,
      mockLedgerService as never,
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

  it('rejects TREASURER when creating decisions', async () => {
    prisma.governancePath.findUnique.mockResolvedValue({
      id: 'path-id',
      walletId: 'wallet-id',
      wallet: { entityId: 'entity-id' },
      policy: null,
    });
    prisma.membership.findFirst.mockImplementation(({ where }) => {
      const roles = where.role?.in ?? [];
      if (roles.includes(MemberRole.TREASURER)) {
        return Promise.resolve({ id: 'treasurer-membership' });
      }
      return Promise.resolve(null);
    });

    await expect(
      service.createDecision('treasurer-id', {
        type: DecisionType.MODIFY_GOVERNANCE,
        subjectType: SubjectType.PATH,
        subjectId: 'path-id',
        governancePathId: 'path-id',
        title: 'تعديل الحوكمة',
        voteType: VoteType.SIMPLE_MAJORITY,
        votersScope: VotersScope.ALL_MEMBERS,
        closesAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          personId: 'treasurer-id',
          role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
        }),
      }),
    );
    expect(prisma.decision.create).not.toHaveBeenCalled();
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
    prisma.subscription.count.mockResolvedValue(10);
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

  it('rejects TREASURER when closing decisions', async () => {
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      subjectType: SubjectType.PATH,
      subjectId: 'path-id',
      status: DecisionStatus.OPEN,
      result: DecisionResult.PENDING,
      closesAt: new Date(Date.now() + 60_000),
      quorumPercent: 50,
      approvalPercent: 51,
      votersScope: VotersScope.ALL_MEMBERS,
      governancePathId: 'path-id',
      voteType: VoteType.ONE_MEMBER_ONE_VOTE,
      votes: [],
      governancePath: { wallet: { entityId: 'entity-id' } },
    });
    prisma.membership.findFirst.mockImplementation(({ where }) => {
      const roles = where.role?.in ?? [];
      if (roles.includes(MemberRole.TREASURER)) {
        return Promise.resolve({ id: 'treasurer-membership' });
      }
      return Promise.resolve(null);
    });

    await expect(
      service.closeDecision('decision-id', 'treasurer-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          personId: 'treasurer-id',
          role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
        }),
      }),
    );
    expect(prisma.decision.update).not.toHaveBeenCalled();
  });

  it('allows TREASURER to retry execution for an approved decision', async () => {
    const approvedDecision = {
      id: 'decision-id',
      subjectType: SubjectType.ENTITY,
      subjectId: 'entity-id',
      decisionType: DecisionType.MODIFY_SUBSCRIPTION,
      status: DecisionStatus.CLOSED,
      result: DecisionResult.APPROVED,
      executionStatus: DecisionExecutionStatus.FAILED,
      governancePath: { wallet: { entityId: 'entity-id' } },
    };
    prisma.decision.findUnique
      .mockResolvedValueOnce(approvedDecision)
      .mockResolvedValueOnce(approvedDecision)
      .mockResolvedValueOnce({
        ...approvedDecision,
        executionStatus: DecisionExecutionStatus.COMPLETED,
      });
    prisma.membership.findFirst.mockImplementation(({ where }) => {
      const roles = where.role?.in ?? [];
      if (roles.includes(MemberRole.TREASURER)) {
        return Promise.resolve({ id: 'treasurer-membership' });
      }
      return Promise.resolve(null);
    });
    prisma.decision.update.mockResolvedValue({
      ...approvedDecision,
      executionStatus: DecisionExecutionStatus.COMPLETED,
    });

    const result = await service.retryExecution('decision-id', 'treasurer-id');

    expect(result).toEqual(
      expect.objectContaining({
        executionStatus: DecisionExecutionStatus.COMPLETED,
      }),
    );
    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          personId: 'treasurer-id',
          role: {
            in: [MemberRole.TREASURER, MemberRole.ADMIN, MemberRole.FOUNDER],
          },
        }),
      }),
    );
    expect(prisma.decision.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          executionStatus: DecisionExecutionStatus.COMPLETED,
        }),
      }),
    );
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

  it('rejects one-family path votes from members who are not active path subscribers', async () => {
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      subjectType: SubjectType.SPENDING_ITEM,
      subjectId: 'spending-item-id',
      status: DecisionStatus.OPEN,
      result: DecisionResult.PENDING,
      closesAt: new Date(Date.now() + 60_000),
      quorumPercent: 50,
      approvalPercent: 51,
      votersScope: VotersScope.ALL_MEMBERS,
      governancePathId: 'path-id',
      voteType: VoteType.ONE_FAMILY_ONE_VOTE,
      votes: [],
      governancePath: { wallet: { entityId: 'entity-id' } },
    });
    prisma.subscription.findFirst.mockResolvedValue(null);

    await expect(
      service.castVote('decision-id', 'person-id', {
        choice: 'APPROVE',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          governancePathId: 'path-id',
          membership: expect.objectContaining({
            entityId: 'entity-id',
            personId: 'person-id',
            isActive: true,
          }),
        }),
      }),
    );
    expect(prisma.vote.create).not.toHaveBeenCalled();
  });

  it('rejects an expulsion vote from the membership being expelled', async () => {
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      decisionType: DecisionType.EXPEL_MEMBER,
      subjectType: SubjectType.MEMBERSHIP,
      subjectId: 'target-membership-id',
      status: DecisionStatus.OPEN,
      result: DecisionResult.PENDING,
      closesAt: new Date(Date.now() + 60_000),
      quorumPercent: 50,
      approvalPercent: 51,
      votersScope: VotersScope.ALL_MEMBERS,
      governancePathId: null,
      voteType: VoteType.ONE_MEMBER_ONE_VOTE,
      votes: [],
      governancePath: { wallet: { entityId: 'entity-id' } },
    });
    prisma.membership.findFirst.mockResolvedValue({
      id: 'target-membership-id',
    });

    await expect(
      service.castVote('decision-id', 'target-person-id', {
        choice: 'REJECT',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entityId: 'entity-id',
          personId: 'target-person-id',
          isActive: true,
        },
        select: { id: true },
      }),
    );
    expect(prisma.vote.create).not.toHaveBeenCalled();
  });

  it('allows other members to vote on an expulsion decision', async () => {
    const decision = {
      id: 'decision-id',
      decisionType: DecisionType.EXPEL_MEMBER,
      subjectType: SubjectType.MEMBERSHIP,
      subjectId: 'target-membership-id',
      status: DecisionStatus.OPEN,
      result: DecisionResult.PENDING,
      closesAt: new Date(Date.now() + 60_000),
      quorumPercent: 50,
      approvalPercent: 51,
      votersScope: VotersScope.ALL_MEMBERS,
      governancePathId: null,
      voteType: VoteType.ONE_MEMBER_ONE_VOTE,
      votes: [],
      governancePath: { wallet: { entityId: 'entity-id' } },
    };
    prisma.decision.findUnique
      .mockResolvedValueOnce(decision)
      .mockResolvedValueOnce(null);
    prisma.membership.findFirst.mockResolvedValue({
      id: 'other-membership-id',
    });
    prisma.vote.create.mockResolvedValue({
      id: 'vote-id',
      decisionId: 'decision-id',
      personId: 'other-person-id',
      choice: 'APPROVE',
    });

    await service.castVote('decision-id', 'other-person-id', {
      choice: 'APPROVE',
    });

    expect(prisma.vote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          decisionId: 'decision-id',
          personId: 'other-person-id',
          choice: 'APPROVE',
        }),
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
