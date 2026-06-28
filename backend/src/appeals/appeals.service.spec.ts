import {
  AppealStatus,
  AppealType,
  AuditAction,
  DecisionStatus,
  DecisionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantContextService } from '../core/tenant-context/tenant-context.service';
import { AppealsService } from './appeals.service';

describe('AppealsService', () => {
  let prisma: {
    decision: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    membership: { findFirst: jest.Mock };
    appeal: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    entityPolicy: { findUnique: jest.Mock };
    pathPolicy: { findUnique: jest.Mock };
    policyVersion: { findFirst: jest.Mock; create: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let rulesService: { evaluateAppealRules: jest.Mock };
  let service: AppealsService;

  beforeEach(() => {
    prisma = {
      decision: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      membership: { findFirst: jest.fn().mockResolvedValue({ id: 'member-id' }) },
      appeal: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      entityPolicy: { findUnique: jest.fn().mockResolvedValue(null) },
      pathPolicy: { findUnique: jest.fn().mockResolvedValue(null) },
      policyVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    rulesService = {
      evaluateAppealRules: jest
        .fn()
        .mockResolvedValue({ allowed: true, violations: [] }),
    };

    service = new AppealsService(
      prisma as unknown as PrismaService,
      {} as NotificationsService,
      rulesService as unknown as RulesService,
      { runInternal: (fn: () => unknown) => fn() } as TenantContextService,
    );
  });

  it('marks a closed decision as appealed and records an appeal audit event', async () => {
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      status: DecisionStatus.CLOSED,
      decisionType: DecisionType.DISBURSE_FUNDS,
      closedAt: new Date(),
      governancePathId: 'path-id',
      governancePath: {
        walletId: 'wallet-id',
        wallet: { entityId: 'entity-id' },
        policy: { allowAppeals: true, appealWindowDays: 30 },
      },
    });
    prisma.appeal.create.mockResolvedValue({
      id: 'appeal-id',
      decisionId: 'decision-id',
      status: AppealStatus.OPEN,
    });

    await service.fileAppeal('person-id', {
      decisionId: 'decision-id',
      type: AppealType.APPEAL,
      reason: 'أعترض لأن سبب القرار غير واضح',
      requestedAction: 'إعادة المراجعة',
    });

    expect(prisma.decision.update).toHaveBeenCalledWith({
      where: { id: 'decision-id' },
      data: { status: DecisionStatus.APPEALED },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AuditAction.APPEAL,
          targetType: 'appeals',
          targetId: 'appeal-id',
          newValue: expect.objectContaining({
            decisionId: 'decision-id',
            decisionStatus: DecisionStatus.APPEALED,
          }),
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('restores decision status when the last appeal is closed', async () => {
    prisma.appeal.findUnique.mockResolvedValue({
      id: 'appeal-id',
      decisionId: 'decision-id',
      entityId: 'entity-id',
      status: AppealStatus.OPEN,
      decision: {
        governancePath: { wallet: { entityId: 'entity-id' } },
      },
    });
    prisma.appeal.update.mockResolvedValue({
      id: 'appeal-id',
      decisionId: 'decision-id',
      status: AppealStatus.CLOSED,
    });
    prisma.membership.findFirst.mockResolvedValue({ id: 'admin-id' });
    prisma.appeal.count.mockResolvedValue(0);

    await service.respondToAppeal('appeal-id', 'admin-id', {
      status: AppealStatus.CLOSED,
      reviewerNotes: 'تمت مراجعة الاعتراض وإغلاقه',
    });

    expect(prisma.decision.updateMany).toHaveBeenCalledWith({
      where: { id: 'decision-id', status: DecisionStatus.APPEALED },
      data: { status: DecisionStatus.CLOSED },
    });
  });
});
